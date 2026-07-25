import { useEffect, useRef, useCallback } from 'react'
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
    const shouldAutoScroll = useRef(true)
    const isNearBottom = useCallback(() => { const el = containerRef.current; if (!el) return true; return el.scrollHeight - el.scrollTop - el.clientHeight < 150 }, [])
    useEffect(() => { const el = containerRef.current; if (!el) return; const handler = () => { shouldAutoScroll.current = isNearBottom() }; el.addEventListener('scroll', handler); return () => el.removeEventListener('scroll', handler) }, [isNearBottom])
    useEffect(() => { if (!shouldAutoScroll.current || !isNearBottom()) return; endRef.current?.scrollIntoView({ behavior: 'auto' }) }, [messageOrder, messageMap, isNearBottom])
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
