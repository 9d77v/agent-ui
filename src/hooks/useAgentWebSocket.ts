import { useRef, useState, useCallback, useEffect } from 'react'
import { message } from 'antd'
import { type MessageTree, type ToolCallEntry } from './useMessageTree'

interface WsInput {
    messageTree: MessageTree
    sessionID: string
    currentModel: string
    activeProviderId: string
    thinking: string
    approvalMode: string
    includeProjectDocs: boolean
    selectedFiles: { path: string; startLine?: number; endLine?: number }[]
    workspaceRoot?: string
    getWebSocketURL: () => Promise<string>
}

interface WsOutput {
    sendText: (text: string, images?: { url: string }[]) => void
    sending: boolean
    wsRef: React.MutableRefObject<WebSocket | null>
    streamingMsgIdRef: React.MutableRefObject<string | null>
    streamingMsgId: string | null
    pendingApprovals: { approvalId: string; command: string; riskLevel: string }[]
    questionnaireData: { id: string; questions: any[] } | null
    setQuestionnaireData: (v: { id: string; questions: any[] } | null) => void
    setPendingApprovals: React.Dispatch<React.SetStateAction<{ approvalId: string; command: string; riskLevel: string }[]>>
    handleApproveTool: (approvalId: string) => void
    handleRejectTool: (approvalId: string) => void
    handleRevertFile: (filePath: string, backupPath: string) => void
    handleOpenFile: (filePath: string) => void
    handleCancel: () => void
    handleRetry: (retryInfo: any) => void
    handleContinue: () => void
}

export function useAgentWebSocket(input: WsInput): WsOutput {
    const wsRef = useRef<WebSocket | null>(null)
    const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const streamIDRef = useRef<string | null>(null)
    const streamingMsgIdRef = useRef<string | null>(null)
    const [sending, setSending] = useState(false)
    const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null)
    const [pendingApprovals, setPendingApprovals] = useState<{ approvalId: string; command: string; riskLevel: string }[]>([])
    // 待审数量 ref（供 handleWsMessage 判断 turn_complete 时是否保活 WS 与审批卡片）
    const pendingApprovalsRef = useRef(0)
    useEffect(() => { pendingApprovalsRef.current = pendingApprovals.length }, [pendingApprovals])
    const [questionnaireData, setQuestionnaireData] = useState<{ id: string; questions: any[] } | null>(null)

    const { messageTree, sessionID, currentModel, activeProviderId, thinking, approvalMode, includeProjectDocs, getWebSocketURL } = input

    // 同步 streamingMsgId 的 ref 与 state（state 供渲染响应式读取）
    const setStreaming = useCallback((id: string | null) => {
        streamingMsgIdRef.current = id
        setStreamingMsgId(id)
    }, [])

    const cleanup = useCallback(() => {
        if (pingRef.current) clearInterval(pingRef.current)
        setSending(false)
        setStreamingMsgId(null)
        pendingApprovalsRef.current = 0
        setPendingApprovals([])
        setQuestionnaireData(null)
        if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    }, [])

    const handleWsMessage = useCallback((data: any) => {
        const { type, stream_id, msg_id, call_id, delta, tool_name, tool_args, file_path,
            original, modified, backup_path, error, code, risk_level, approval_id, command,
            questionnaire_id, content, text, is_stderr } = data

        switch (type) {
            case 'started':
                streamIDRef.current = stream_id
                if (data.session_id) {
                    window.dispatchEvent(new CustomEvent('session-created', { detail: data.session_id }))
                }
                break
            case 'message_end': {
                const curId = streamingMsgIdRef.current
                if (curId) messageTree.updateMessage(curId, msg => ({ ...msg, loading: false, showReasoning: false }))
                break
            }
            case 'message_start': {
                const role = data.role || 'model'
                if (role === 'tool') break
                messageTree.addMessage({ id: msg_id, seq: data.seq, turnId: data.turn_id, role, content: '', reasoning: '', loading: true, showReasoning: true, toolList: [] })
                setStreaming(msg_id)
                break
            }
            case 'content_delta': {
                const curId = streamingMsgIdRef.current
                if (curId) messageTree.updateMessage(curId, msg => ({ ...msg, content: msg.content + delta }))
                break
            }
            case 'reasoning_delta': {
                const curId = streamingMsgIdRef.current
                if (curId) messageTree.updateMessage(curId, msg => ({ ...msg, reasoning: (msg.reasoning || '') + delta }))
                break
            }
            case 'tool_call_start': {
                const curId = streamingMsgIdRef.current
                if (!curId) break
                messageTree.updateMessage(curId, msg => ({ ...msg, toolList: [...(msg.toolList || []), { callId: call_id, name: tool_name, args: '', status: 'executing' as const }] }))
                break
            }
            case 'tool_call_delta': {
                const curId = streamingMsgIdRef.current
                if (!curId) break
                messageTree.updateMessage(curId, msg => ({ ...msg, toolList: (msg.toolList || []).map(t => t.callId === call_id ? { ...t, args: t.args + (delta || '') } : t) }))
                break
            }
            case 'tool_call_end': {
                const curId = streamingMsgIdRef.current
                if (!curId) break
                messageTree.updateMessage(curId, msg => ({ ...msg, toolList: (msg.toolList || []).map(t => t.callId === call_id ? { ...t, args: tool_args } : t) }))
                break
            }
            case 'tool_executing':
                // 跨消息按 call_id 更新（函数式更新拿最新 map，规避 WS onmessage 闭包过期）
                messageTree.updateToolByCallId(call_id, tool => ({ ...tool, status: 'executing' as const }))
                break
            case 'tool_result': {
                let parsedResult: any = { success: false }
                try { parsedResult = JSON.parse(data.tool_args || '{}') } catch {}
                // 跨消息按 call_id 更新：审批恢复/resume 流中 streamingMsgId 可能指向新消息，
                // 用函数式更新保证在最新 messageMap 上定位工具（否则状态停留在 executing）
                messageTree.updateToolByCallId(call_id, tool => ({
                    ...tool, status: parsedResult.success ? 'done' as const : 'error' as const, result: parsedResult
                }))
                break
            }
            case 'approval_required':
                // 同步更新 ref：approval_required 与 turn_complete 可能同批到达，
                // 若依赖 useEffect 延迟同步，turn_complete 会误判"无待审"而清空卡片并关 WS
                console.log('[WS] approval_required received', approval_id, 'pendingRef=', pendingApprovalsRef.current)
                pendingApprovalsRef.current += 1
                setPendingApprovals(prev => [...prev, { approvalId: approval_id, command: content || text || command || '', riskLevel: risk_level }])
                break
            case 'questionnaire_request':
                try { setQuestionnaireData({ id: questionnaire_id, questions: JSON.parse(text || '[]') }) } catch {}
                break
            case 'token_usage':
                try { window.dispatchEvent(new CustomEvent('token-usage-update', { detail: JSON.parse(data.tool_args || '{}') })) } catch {}
                break
            case 'turn_complete':
                if (streamingMsgIdRef.current) messageTree.updateMessage(streamingMsgIdRef.current, msg => ({ ...msg, loading: false, showReasoning: false }))
                if (data.session_id) window.dispatchEvent(new CustomEvent('session-created', { detail: data.session_id }))
                // ADK 原生 HITL：本轮因审批已暂停。有待审时保活 WS、保留 streamingMsgIdRef 与审批卡片，
                // 等待用户决定后由后端开 resume 流（工具结果靠 call_id 跨消息匹配）
                console.log('[WS] turn_complete pendingRef=', pendingApprovalsRef.current)
                if (pendingApprovalsRef.current > 0) break
                setStreaming(null)
                setPendingApprovals([])
                cleanup()
                break
            case 'error': {
                const curId = streamingMsgIdRef.current || msg_id
                if (data.code === 'max_iterations') {
                    // 达到最大迭代次数：追加温和提示并保留"继续执行"入口，不当作致命错误
                    if (curId) messageTree.updateMessage(curId, msg => ({ ...msg, loading: false, needsContinue: true, content: msg.content + `\n\n⚠️ ${error}` }))
                    setStreaming(null)
                    setSending(false)
                    if (pingRef.current) clearInterval(pingRef.current)
                    if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
                    break
                }
                if (curId) {
                    messageTree.updateMessage(curId, msg => ({ ...msg, loading: false, content: msg.content + `\n\n⚠️ ${error}` }))
                } else {
                    // 流尚未开始（如 VL 预处理/鉴权失败）：错误无处展示，用 toast 兜底
                    message.error(error || '请求失败')
                }
                cleanup()
                break
            }
            case 'todo_updated':
                // 会话待办清单更新：dispatch 自定义事件，由宿主应用（hhy-code AgentPanel）监听渲染
                window.dispatchEvent(new CustomEvent('todo-update', { detail: data.todos }))
                break
            case 'file_changed':
                // Agent 会话文件变动（临时变动列表数据源）：dispatch 自定义事件，由宿主应用（hhy-code ChangedFiles）监听渲染
                window.dispatchEvent(new CustomEvent('file-change', { detail: {
                    session_id: data.session_id, file_path: data.file_path,
                    original: data.original, modified: data.modified,
                    is_new: data.is_new, added: data.added, deleted: data.deleted,
                    removed: data.removed,
                } }))
                break
            case 'terminal_output':
                window.dispatchEvent(new CustomEvent('agent-terminal-data', { detail: { text, is_stderr } }))
                break
        }
    }, [messageTree, setStreaming, cleanup])

    useEffect(() => () => cleanup(), [cleanup])

    // 打开一条 WebSocket 流并发送启动 payload
    const openStream = useCallback(async (payload: Record<string, any>) => {
        setSending(true)
        setStreaming(null)
        try {
            const wsURL = await getWebSocketURL()
            const ws = new WebSocket(wsURL)
            wsRef.current = ws
            streamIDRef.current = null

            ws.onopen = () => {
                ws.send(JSON.stringify(payload))
                pingRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
                }, 30000)
            }

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    handleWsMessage(data)
                } catch (e) { console.error('[WS] 解析消息失败:', e) }
            }

            ws.onclose = () => {
                console.log('[WS] closed')
                if (pingRef.current) clearInterval(pingRef.current)
                setSending(false)
                wsRef.current = null
            }

            ws.onerror = () => {
                if (pingRef.current) clearInterval(pingRef.current)
                setSending(false)
                message.error('WebSocket 连接失败')
            }
        } catch (e: any) {
            message.error(`连接失败: ${e.message}`)
            setSending(false)
        }
    }, [getWebSocketURL, handleWsMessage])

    const sendText = useCallback(async (text: string, images?: { url: string }[]) => {
        const userMsgId = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
        messageTree.addMessage({ id: userMsgId, role: 'user', content: text || (images && images.length > 0 ? '🖼 [图片]' : ''), loading: false })

        const pid = activeProviderId || (currentModel.includes('||') ? currentModel.split('||')[0] : '')
        const mn = currentModel.includes('||') ? currentModel.split('||')[1] : currentModel
        const payload: Record<string, any> = {
            type: 'start', session_id: sessionID, message: text,
            model: mn, provider_id: pid, mode: 'agent', thinking,
            approval_mode: approvalMode, include_project_docs: includeProjectDocs,
        }
        if (images && images.length > 0) {
            payload.images = images.map(img => ({ url: img.url }))
        }
        await openStream(payload)
    }, [sessionID, currentModel, activeProviderId, thinking, approvalMode, includeProjectDocs, messageTree, openStream])

    // 达到最大迭代次数后"继续执行"：复用同一 session 续跑
    const handleContinue = useCallback(() => {
        const pid = activeProviderId || (currentModel.includes('||') ? currentModel.split('||')[0] : '')
        const mn = currentModel.includes('||') ? currentModel.split('||')[1] : currentModel
        openStream({
            type: 'continue_response', session_id: sessionID, model: mn, provider_id: pid,
            mode: 'agent', thinking, approval_mode: approvalMode, include_project_docs: includeProjectDocs,
        })
    }, [sessionID, currentModel, activeProviderId, thinking, approvalMode, includeProjectDocs, openStream])

    const sendWsMessage = useCallback((msg: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg))
    }, [])

    const handleApproveTool = useCallback((approvalId: string) => {
        // 携带 session_id：后端据此启动审批恢复流（ADK 原生 HITL resume）
        sendWsMessage({ type: 'approve_tool', approval_id: approvalId, session_id: sessionID })
        setPendingApprovals(prev => {
            const next = prev.filter(a => a.approvalId !== approvalId)
            pendingApprovalsRef.current = next.length
            return next
        })
    }, [sendWsMessage, sessionID])

    const handleRejectTool = useCallback((approvalId: string) => {
        sendWsMessage({ type: 'reject_tool', approval_id: approvalId, session_id: sessionID })
        setPendingApprovals(prev => {
            const next = prev.filter(a => a.approvalId !== approvalId)
            pendingApprovalsRef.current = next.length
            return next
        })
    }, [sendWsMessage, sessionID])

    const handleRevertFile = useCallback((filePath: string, backupPath: string) => {
        sendWsMessage({ type: 'revert_file', file_path: filePath, backup_path: backupPath })
    }, [sendWsMessage])

    const handleOpenFile = useCallback((filePath: string) => {
        window.dispatchEvent(new CustomEvent('open-file', { detail: { path: filePath } }))
    }, [])

    const handleCancel = useCallback(() => {
        sendWsMessage({ type: 'cancel', stream_id: streamIDRef.current })
        cleanup()
        if (streamingMsgIdRef.current) messageTree.updateMessage(streamingMsgIdRef.current, msg => ({ ...msg, loading: false }))
        setStreaming(null)
    }, [sendWsMessage, cleanup, messageTree, setStreaming])

    const handleRetry = useCallback((retryInfo: any) => {
        sendWsMessage({ type: 'retry', session_id: retryInfo.sessionId, message_id: retryInfo.messageId, message: retryInfo.message, model: retryInfo.model, provider_id: retryInfo.providerId, mode: retryInfo.mode, thinking: retryInfo.thinking, approval_mode: approvalMode })
    }, [approvalMode, sendWsMessage])

    return { sendText, sending, wsRef, streamingMsgIdRef, streamingMsgId, pendingApprovals, questionnaireData, setQuestionnaireData, setPendingApprovals, handleApproveTool, handleRejectTool, handleRevertFile, handleOpenFile, handleCancel, handleRetry, handleContinue }
}
