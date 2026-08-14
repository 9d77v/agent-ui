import { useState, useCallback } from 'react'

export interface ToolCallEntry {
    callId?: string
    name: string
    args: string
    status: 'executing' | 'done' | 'error'
    result?: any
}

export interface AgentMessage {
    id: string
    seq?: number
    turnId?: string
    role: 'user' | 'assistant' | 'tool' | 'model'
    content: string
    reasoning?: string
    loading?: boolean
    showReasoning?: boolean
    needsContinue?: boolean
    toolList?: ToolCallEntry[]
    retryInfo?: {
        messageId: string; sessionId: string; message: string
        model: string; providerId: string; mode: string; thinking: string
        done?: boolean
    }
    /** 消息时间（ISO 字符串；流式由 message_start 本地填充，历史由 loadHistory 映射 created_at） */
    timestamp?: string
    /** 消息使用的模型名（流式取当前模型，历史解析自 custom_metadata.openai_model） */
    model?: string
}

export interface MessageTree {
    messageMap: Record<string, AgentMessage>
    messageOrder: string[]
    addMessage: (msg: AgentMessage) => void
    updateMessage: (msgId: string, updater: (msg: AgentMessage) => AgentMessage) => void
    /** 按 call_id 跨消息更新工具状态（函数式更新拿最新 map，规避 WS onmessage 闭包过期） */
    updateToolByCallId: (callId: string, updater: (tool: ToolCallEntry) => ToolCallEntry) => void
    clearMessages: () => void
}

export function useMessageTree(): MessageTree {
    const [messageMap, setMessageMap] = useState<Record<string, AgentMessage>>({})
    const [messageOrder, setMessageOrder] = useState<string[]>([])

    const addMessage = useCallback((msg: AgentMessage) => {
        setMessageMap(prev => ({ ...prev, [msg.id]: msg }))
        setMessageOrder(prev => {
            if (prev.includes(msg.id)) return prev
            return [...prev, msg.id]
        })
    }, [])

    const updateMessage = useCallback((msgId: string, updater: (msg: AgentMessage) => AgentMessage) => {
        setMessageMap(prev => {
            if (!prev[msgId]) return prev
            return { ...prev, [msgId]: updater(prev[msgId]) }
        })
    }, [])

    const updateToolByCallId = useCallback((callId: string, updater: (tool: ToolCallEntry) => ToolCallEntry) => {
        setMessageMap(prev => {
            let changed = false
            const next: Record<string, AgentMessage> = {}
            for (const [mid, msg] of Object.entries(prev)) {
                const toolList = msg.toolList || []
                const idx = toolList.findIndex(t => t.callId === callId)
                if (idx >= 0) {
                    const newTools = toolList.slice()
                    newTools[idx] = updater(newTools[idx])
                    next[mid] = { ...msg, toolList: newTools }
                    changed = true
                } else {
                    next[mid] = msg
                }
            }
            return changed ? next : prev
        })
    }, [])

    const clearMessages = useCallback(() => {
        setMessageMap({})
        setMessageOrder([])
    }, [])

    return { messageMap, messageOrder, addMessage, updateMessage, updateToolByCallId, clearMessages }
}
