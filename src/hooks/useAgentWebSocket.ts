import { useRef, useState, useCallback, useEffect } from 'react'
import { message } from 'antd'
import { type MessageTree, type ToolCallEntry } from './useMessageTree'
import type { AgentStatus } from '../types'

interface WsInput {
    messageTree: MessageTree
    sessionID: string
    currentModel: string
    activeProviderId: string
    thinking: string
    approvalMode: string
    includeProjectDocs: boolean
    // 预留字段（hook 内未使用；宿主可传可不传）
    selectedFiles?: { path: string; startLine?: number; endLine?: number }[]
    workspaceRoot?: string
    getWebSocketURL: () => Promise<string>
}

interface WsOutput {
    sendText: (text: string, images?: { url: string }[]) => void
    sending: boolean
    wsRef: React.MutableRefObject<WebSocket | null>
    streamingMsgIdRef: React.MutableRefObject<string | null>
    streamingMsgId: string | null
    pendingApprovals: { approvalId: string; command: string; riskLevel: string; agent?: string }[]
    questionnaireData: { id: string; questions: any[] } | null
    setQuestionnaireData: (v: { id: string; questions: any[] } | null) => void
    setPendingApprovals: React.Dispatch<React.SetStateAction<{ approvalId: string; command: string; riskLevel: string; agent?: string }[]>>
    handleApproveTool: (approvalId: string) => void
    handleRejectTool: (approvalId: string) => void
    handleRevertFile: (filePath: string, backupPath: string) => void
    handleOpenFile: (filePath: string) => void
    handleCancel: () => void
    handleRetry: (retryInfo: any) => void
    handleContinue: () => void
    /** 提交问卷回答：答案作为 askQuestions 工具结果（tool call result）回传 LLM，非新用户消息 */
    submitQuestionnaireAnswer: (questionnaireId: string, answers: string) => boolean
    /** 运行中切换审批模式：通知后端即时生效（当前编排后续工具判定立即读取） */
    updateApprovalMode: (mode: string) => void
    /** 常驻子代理编排树（agent_status 推送） */
    agents: AgentStatus[]
}

export function useAgentWebSocket(input: WsInput): WsOutput {
    const wsRef = useRef<WebSocket | null>(null)
    const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const streamIDRef = useRef<string | null>(null)
    const streamingMsgIdRef = useRef<string | null>(null)
    const [sending, setSending] = useState(false)
    // sending 的 ref 同步（sessionID 切换 useEffect 需判断当前是否有活跃流，见下）
    const sendingRef = useRef(false)
    useEffect(() => { sendingRef.current = sending }, [sending])
    const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null)
    const [pendingApprovals, setPendingApprovals] = useState<{ approvalId: string; command: string; riskLevel: string; agent?: string }[]>([])
    // 待审数量 ref（供 handleWsMessage 判断 turn_complete 时是否保活 WS 与审批卡片）
    const pendingApprovalsRef = useRef(0)
    useEffect(() => { pendingApprovalsRef.current = pendingApprovals.length }, [pendingApprovals])
    const [questionnaireData, setQuestionnaireData] = useState<{ id: string; questions: any[] } | null>(null)
    const [agents, setAgents] = useState<AgentStatus[]>([])

    const { messageTree, sessionID, currentModel, activeProviderId, thinking, approvalMode, includeProjectDocs, getWebSocketURL } = input

    // 会话 id 的 ref：handleWsMessage 闭包需访问最新值（agent_status 按当前会话过滤）
    const sessionIDRef = useRef(sessionID)
    useEffect(() => { sessionIDRef.current = sessionID }, [sessionID])

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

        // 流消息归属校验：旧会话/旧流的流式消息（stream_id 与当前活动流不一致）直接忽略，
        // 防止切换会话后旧流消息串入当前界面（消息树是组件级共享的）
        const isCurrentStream = !stream_id || !streamIDRef.current || stream_id === streamIDRef.current

        switch (type) {
            case 'started':
                streamIDRef.current = stream_id
                if (data.session_id) {
                    window.dispatchEvent(new CustomEvent('session-created', { detail: data.session_id }))
                }
                break
            case 'message_end': {
                if (!isCurrentStream) break
                const curId = streamingMsgIdRef.current
                if (curId) messageTree.updateMessage(curId, msg => ({ ...msg, loading: false, showReasoning: false }))
                break
            }
            case 'message_start': {
                if (!isCurrentStream) break
                const role = data.role || 'model'
                if (role === 'tool') break
                messageTree.addMessage({ id: msg_id, seq: data.seq, turnId: data.turn_id, role, content: '', reasoning: '', loading: true, showReasoning: true, toolList: [] })
                setStreaming(msg_id)
                break
            }
            case 'content_delta': {
                if (!isCurrentStream) break
                const curId = streamingMsgIdRef.current
                if (curId) messageTree.updateMessage(curId, msg => ({ ...msg, content: msg.content + delta }))
                break
            }
            case 'reasoning_delta': {
                if (!isCurrentStream) break
                const curId = streamingMsgIdRef.current
                if (curId) messageTree.updateMessage(curId, msg => ({ ...msg, reasoning: (msg.reasoning || '') + delta }))
                break
            }
            case 'tool_call_start': {
                if (!isCurrentStream) break
                const curId = streamingMsgIdRef.current
                if (!curId) break
                messageTree.updateMessage(curId, msg => ({ ...msg, toolList: [...(msg.toolList || []), { callId: call_id, name: tool_name, args: '', status: 'executing' as const }] }))
                break
            }
            case 'tool_call_delta': {
                if (!isCurrentStream) break
                const curId = streamingMsgIdRef.current
                if (!curId) break
                messageTree.updateMessage(curId, msg => ({ ...msg, toolList: (msg.toolList || []).map(t => t.callId === call_id ? { ...t, args: t.args + (delta || '') } : t) }))
                break
            }
            case 'tool_call_end': {
                if (!isCurrentStream) break
                const curId = streamingMsgIdRef.current
                if (!curId) break
                messageTree.updateMessage(curId, msg => ({ ...msg, toolList: (msg.toolList || []).map(t => t.callId === call_id ? { ...t, args: tool_args } : t) }))
                break
            }
            case 'tool_executing':
                if (!isCurrentStream) break
                // 跨消息按 call_id 更新（函数式更新拿最新 map，规避 WS onmessage 闭包过期）
                messageTree.updateToolByCallId(call_id, tool => ({ ...tool, status: 'executing' as const }))
                break
            case 'tool_result': {
                if (!isCurrentStream) break
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
                // 非当前流忽略：防旧流/残留连接的审批消息串入当前界面
                if (!isCurrentStream) break
                // 同步更新 ref：approval_required 与 turn_complete 可能同批到达，
                // 若依赖 useEffect 延迟同步，turn_complete 会误判"无待审"而清空卡片并关 WS
                console.log('[WS] approval_required received', approval_id, 'pendingRef=', pendingApprovalsRef.current)
                pendingApprovalsRef.current += 1
                setPendingApprovals(prev => [...prev, { approvalId: approval_id, command: content || text || command || '', riskLevel: risk_level, agent: data.agent }])
                break
            case 'questionnaire_request':
                // 问卷数据由后端放在 tool_args 字段（StreamMessage.ToolArgs），text 为空 → 用 tool_args 解析
                try { setQuestionnaireData({ id: questionnaire_id, questions: JSON.parse(tool_args || '[]') }) } catch {}
                break
            case 'questionnaire_cancelled':
                // 问卷超时/取消/失效：收起表单并提示（后端广播，不再静默无反馈）
                setQuestionnaireData(null)
                window.dispatchEvent(new CustomEvent('questionnaire-cancelled', { detail: { reason: content || text || '问卷已失效' } }))
                break
            case 'token_usage':
                try { window.dispatchEvent(new CustomEvent('token-usage-update', { detail: JSON.parse(data.tool_args || '{}') })) } catch {}
                break
            case 'agent_status':
                try {
                    const list = JSON.parse(data.content || '[]')
                    // 会话隔离：agent_status 是全量广播（含其他会话子代理），只保留当前会话派生的（数据源头隔离）
                    if (Array.isArray(list)) setAgents(list.filter((a: any) => a.parent_id === sessionIDRef.current) as AgentStatus[])
                } catch {}
                break
            case 'agent_done':
                // 子代理完成/失败通知：AgentRoster 监听 agent-done 事件做列表行闪烁反馈（不弹消息）
                window.dispatchEvent(new CustomEvent('agent-done', { detail: { agent_id: data.agent_id || '', agent: data.agent || '', summary: data.content || '' } }))
                break
            case 'cancelled':
                // 后端确认已停止：把当前流消息的执行中工具标为已停止（幂等，与 handleCancel 本地更新互补）
                if (streamingMsgIdRef.current) {
                    messageTree.updateMessage(streamingMsgIdRef.current, msg => ({
                        ...msg, loading: false,
                        toolList: (msg.toolList || []).map(t => t.status === 'executing' ? { ...t, status: 'error' as const, result: { success: false, error: '已停止' } } : t),
                    }))
                }
                setStreaming(null)
                break
            case 'turn_complete':
                // 非当前流忽略：旧流/残留连接的回合完成消息不得误杀当前审批（清卡片、关 WS）
                if (!isCurrentStream) break
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
                // 会话待办清单更新：dispatch 自定义事件，由宿主应用监听渲染
                window.dispatchEvent(new CustomEvent('todo-update', { detail: data.todos }))
                break
            case 'file_changed':
                // Agent 会话文件变动（临时变动列表数据源）：dispatch 自定义事件，由宿主应用监听渲染
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

    // 会话切换隔离：sessionID 变化时关闭旧 WS 连接、复位流状态并清空子代理列表，
    // 进入不同会话加载各自的数据（历史会话由宿主 GetSessionAgents 提供；当前会话等 agent_status 推送）。
    // 仅「用户主动切换」（无活跃流）才清理：新会话首次请求时 started 会回带 session_id，宿主 setSessionID
    // 触发本 effect，此时流正在运行（sending=true），若清理会误关当前 WS → 审批消息丢失、卡片不弹、
    // 停止按钮消失、消息卡在「思考中」（会话隔离改动引入的回归，实测复现）。
    useEffect(() => {
        if (sendingRef.current) return
        if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null }
        setSending(false)
        setStreaming(null)
        setAgents([])
        streamingMsgIdRef.current = null
        streamIDRef.current = null
    }, [sessionID])

    // 打开一条 WebSocket 流并发送启动 payload
    const openStream = useCallback(async (payload: Record<string, any>) => {
        // 发送前关闭旧连接：杜绝多连接并存导致消息串扰、cleanup 误关当前连接
        if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
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
                // 不在 onerror 里 setSending(false)：onerror 可能是瞬时错误（连接未真正关闭、编排仍在跑），
                // 立即重置会误把停止按钮恢复为提交按钮（状态不一致：编排进行中却允许再次发送）。
                // 由 onclose 统一处理 sending 复位（连接真正关闭才复位）。
                message.error('WebSocket 连接失败')
            }
        } catch (e: any) {
            message.error(`连接失败: ${e.message}`)
            setSending(false)
        }
    }, [getWebSocketURL, handleWsMessage])

    const sendText = useCallback(async (text: string, images?: { url: string }[]) => {
        // 防并发：有活跃流时拒绝新发送。
        // 即使停止按钮意外恢复为提交按钮（sending 状态不一致），也阻止与进行中的编排并发。
        if (sendingRef.current) {
            message.warning('当前有任务正在执行，请先停止或等待完成')
            return
        }
        const userMsgId = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
        messageTree.addMessage({ id: userMsgId, role: 'user', content: text || (images && images.length > 0 ? '🖼 [图片]' : ''), loading: false })

        const pid = activeProviderId || (currentModel.includes('||') ? currentModel.split('||')[0] : '')
        const mn = currentModel.includes('||') ? currentModel.split('||')[1] : currentModel
        const payload: Record<string, any> = {
            type: 'start', session_id: sessionID, message: text,
            model: mn, provider_id: pid, thinking,
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
            thinking, approval_mode: approvalMode, include_project_docs: includeProjectDocs,
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
        // 带 session_id：后端 cancel 时按会话级联挂起该会话派生的常驻子代理（suspend 保留上下文）
        sendWsMessage({ type: 'cancel', stream_id: streamIDRef.current, session_id: sessionID })
        // 立即更新 UI（不等后端回包）：执行中的工具标为已停止 + 追加停止提示
        if (streamingMsgIdRef.current) {
            messageTree.updateMessage(streamingMsgIdRef.current, msg => ({
                ...msg, loading: false,
                toolList: (msg.toolList || []).map(t => t.status === 'executing' ? { ...t, status: 'error' as const, result: { success: false, error: '用户已停止' } } : t),
                content: msg.content + (msg.content ? '\n\n' : '') + '⏹ 已停止',
            }))
        }
        cleanup()
        setStreaming(null)
    }, [sendWsMessage, sessionID, cleanup, messageTree, setStreaming])

    const handleRetry = useCallback((retryInfo: any) => {
        sendWsMessage({ type: 'retry', session_id: retryInfo.sessionId, message_id: retryInfo.messageId, message: retryInfo.message, model: retryInfo.model, provider_id: retryInfo.providerId, thinking: retryInfo.thinking, approval_mode: approvalMode })
    }, [approvalMode, sendWsMessage])

    // 运行中切换审批模式：发 WS 通知后端更新会话动态模式（当前编排后续工具调用立即生效，无需等下一轮）
    const updateApprovalMode = useCallback((mode: string) => {
        sendWsMessage({ type: 'update_approval_mode', session_id: sessionID, approval_mode: mode })
    }, [sendWsMessage, sessionID])

    // 提交问卷回答：后端工具阻塞等待该消息（ResolveQuestionnaire），答案作为工具结果回传 LLM。
    // 返回是否已成功发出；WS 非 OPEN 时不静默丢弃，通知宿主提示并保留表单（可重试）。
    const submitQuestionnaireAnswer = useCallback((questionnaireId: string, answers: string) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
            window.dispatchEvent(new CustomEvent('questionnaire-submit-failed', { detail: { reason: '连接已断开，提问未能提交' } }))
            return false
        }
        sendWsMessage({ type: 'questionnaire_answer', questionnaire_id: questionnaireId, text: answers })
        return true
    }, [sendWsMessage])

    return { sendText, sending, wsRef, streamingMsgIdRef, streamingMsgId, pendingApprovals, questionnaireData, setQuestionnaireData, setPendingApprovals, handleApproveTool, handleRejectTool, handleRevertFile, handleOpenFile, handleCancel, handleRetry, handleContinue, submitQuestionnaireAnswer, updateApprovalMode, agents }
}
