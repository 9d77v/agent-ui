import { useEffect, useRef } from 'react'
import { AgentMessage } from './hooks/useMessageTree'
import MessageBubble from './MessageBubble'

interface Props {
    messageOrder: string[]
    messageMap: Record<string, AgentMessage>
    darkMode?: boolean
    streamingMsgId?: string | null
    toolNameLabels?: Record<string, string>
    onOpenFile: (path: string) => void
    onRevertFile: (path: string, backupPath: string) => void
    onRetry: (retryInfo: NonNullable<AgentMessage['retryInfo']>) => void
    onToggleReasoning: (msgId: string, collapsed: boolean) => void
}

export default function MessageList(props: Props) {
    const { messageOrder, messageMap, darkMode, streamingMsgId, toolNameLabels, onOpenFile, onRevertFile, onRetry, onToggleReasoning } = props
    const containerRef = useRef<HTMLDivElement>(null)
    const endRef = useRef<HTMLDivElement>(null)
    const userScrolledUp = useRef(false)
    // 用户手动滚动时标记
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const handler = () => { userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight > 150 }
        el.addEventListener('scroll', handler)
        return () => el.removeEventListener('scroll', handler)
    }, [])
    // 消息更新时自动滚到底部
    useEffect(() => {
        const el = containerRef.current
        if (!el || userScrolledUp.current) return
        requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
    }, [messageOrder, messageMap, streamingMsgId])
    return (
        <div ref={containerRef} style={{ height: '100%', overflow: 'auto', padding: '12px 16px' }}>
            {messageOrder.map(id => {
                const msg = messageMap[id]
                if (!msg) return null
                return <div key={msg.id} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <MessageBubble msg={msg} darkMode={darkMode} streamingMsgId={streamingMsgId} toolNameLabels={toolNameLabels} onOpenFile={onOpenFile} onRevertFile={onRevertFile} onRetry={onRetry} onToggleReasoning={onToggleReasoning} />
                </div>
            })}
            <div ref={endRef} />
        </div>
    )
}
