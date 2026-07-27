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
    sendText: (text: string) => void
    sending: boolean
    wsRef: React.MutableRefObject<WebSocket | null>
    streamingMsgIdRef: React.MutableRefObject<string | null>
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
}

export function useAgentWebSocket(input: WsInput): WsOutput {
    const wsRef = useRef<WebSocket | null>(null)
    const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const streamIDRef = useRef<string | null>(null)
    const streamingMsgIdRef = useRef<string | null>(null)
    const [sending, setSending] = useState(false)
    const [pendingApprovals, setPendingApprovals] = useState<{ approvalId: string; command: string; riskLevel: string }[]>([])
    const [questionnaireData, setQuestionnaireData] = useState<{ id: string; questions: any[] } | null>(null)

    const { messageTree, sessionID, currentModel, activeProviderId, thinking, approvalMode, includeProjectDocs, getWebSocketURL } = input

    const sendText = useCallback(async (text: string) => {
        setSending(true)
        streamingMsgIdRef.current = null

        const userMsgId = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
        messageTree.addMessage({ id: userMsgId, role: 'user', content: text, loading: false })

        try {
            const wsURL = await getWebSocketURL()
            const ws = new WebSocket(wsURL)
            wsRef.current = ws
            streamIDRef.current = null

            const pid = activeProviderId || (currentModel.includes('||') ? currentModel.split('||')[0] : '')
            const mn = currentModel.includes('||') ? currentModel.split('||')[1] : currentModel

            ws.onopen = () => {
                ws.send(JSON.stringify({
                    type: 'start', session_id: sessionID, message: text,
                    model: mn, provider_id: pid, mode: 'agent', thinking,
                    approval_mode: approvalMode, include_project_docs: includeProjectDocs,
                }))
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
    }, [sessionID, currentModel, activeProviderId, thinking, approvalMode, includeProjectDocs, messageTree, getWebSocketURL])

    const handleWsMessage = useCallback((data: any) => {
        const { type, stream_id, msg_id, call_id, delta, tool_name, tool_args, file_path,
            original, modified, backup_path, error, risk_level, approval_id, command,
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
                streamingMsgIdRef.current = msg_id
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
            case 'tool_executing': {
                const curId = streamingMsgIdRef.current
                if (!curId) break
                messageTree.updateMessage(curId, msg => ({ ...msg, toolList: (msg.toolList || []).map(t => t.callId === call_id ? { ...t, status: 'executing' as const } : t) }))
                break
            }
            case 'tool_result': {
                const curId = streamingMsgIdRef.current
                if (!curId) break
                let parsedResult: any = { success: false }
                try { parsedResult = JSON.parse(data.tool_args || '{}') } catch {}
                messageTree.updateMessage(curId, msg => ({
                    ...msg, toolList: (msg.toolList || []).map(t => t.callId === call_id ? { ...t, status: parsedResult.success ? 'done' as const : 'error' as const, result: parsedResult } : t)
                }))
                break
            }
            case 'approval_required':
                setPendingApprovals(prev => [...prev, { approvalId: approval_id, command: content || text || command || '', riskLevel: risk_level }])
                break
            case 'questionnaire_request':
                try { setQuestionnaireData({ id: questionnaire_id, questions: JSON.parse(text || '[]') }) } catch {}
                break
            case 'token_usage':
                try { window.dispatchEvent(new CustomEvent('token-usage-update', { detail: JSON.parse(data.tool_args || '{}') })) } catch {}
                break
            case 'turn_complete':
                setPendingApprovals([])
                if (streamingMsgIdRef.current) messageTree.updateMessage(streamingMsgIdRef.current, msg => ({ ...msg, loading: false, showReasoning: false }))
                streamingMsgIdRef.current = null
                if (data.session_id) window.dispatchEvent(new CustomEvent('session-created', { detail: data.session_id }))
                cleanup()
                break
            case 'error': {
                const curId = streamingMsgIdRef.current || msg_id
                if (curId) messageTree.updateMessage(curId, msg => ({ ...msg, loading: false, content: msg.content + `\n\n⚠️ ${error}` }))
                cleanup()
                break
            }
            case 'terminal_output':
                window.dispatchEvent(new CustomEvent('agent-terminal-data', { detail: { text, is_stderr } }))
                break
        }
    }, [messageTree])

    const cleanup = useCallback(() => {
        if (pingRef.current) clearInterval(pingRef.current)
        setSending(false)
        setPendingApprovals([])
        setQuestionnaireData(null)
        if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    }, [])

    useEffect(() => () => cleanup(), [cleanup])

    const sendWsMessage = useCallback((msg: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg))
    }, [])

    const handleApproveTool = useCallback((approvalId: string) => {
        sendWsMessage({ type: 'approve_tool', approval_id: approvalId })
        setPendingApprovals(prev => prev.filter(a => a.approvalId !== approvalId))
    }, [sendWsMessage])

    const handleRejectTool = useCallback((approvalId: string) => {
        sendWsMessage({ type: 'reject_tool', approval_id: approvalId })
        setPendingApprovals(prev => prev.filter(a => a.approvalId !== approvalId))
    }, [sendWsMessage])

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
        streamingMsgIdRef.current = null
    }, [sendWsMessage, cleanup, messageTree])

    const handleRetry = useCallback((retryInfo: any) => {
        sendWsMessage({ type: 'retry', session_id: retryInfo.sessionId, message_id: retryInfo.messageId, message: retryInfo.message, model: retryInfo.model, provider_id: retryInfo.providerId, mode: retryInfo.mode, thinking: retryInfo.thinking, approval_mode: approvalMode })
    }, [approvalMode, sendWsMessage])

    return { sendText, sending, wsRef, streamingMsgIdRef, pendingApprovals, questionnaireData, setQuestionnaireData, setPendingApprovals, handleApproveTool, handleRejectTool, handleRevertFile, handleOpenFile, handleCancel, handleRetry }
}
