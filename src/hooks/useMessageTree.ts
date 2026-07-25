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
    role: 'user' | 'assistant' | 'tool'
    content: string
    reasoning?: string
    loading?: boolean
    showReasoning?: boolean
    toolList?: ToolCallEntry[]
    fileDiff?: { filePath: string; original: string; modified: string; backupPath: string }
    retryInfo?: {
        messageId: string; sessionId: string; message: string
        model: string; providerId: string; mode: string; thinking: string
        done?: boolean
    }
}

export interface MessageTree {
    messageMap: Record<string, AgentMessage>
    messageOrder: string[]
    addMessage: (msg: AgentMessage) => void
    updateMessage: (msgId: string, updater: (msg: AgentMessage) => AgentMessage) => void
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

    const clearMessages = useCallback(() => {
        setMessageMap({})
        setMessageOrder([])
    }, [])

    return { messageMap, messageOrder, addMessage, updateMessage, clearMessages }
}
