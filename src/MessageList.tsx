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
    onContinue: () => void
    onToggleReasoning: (msgId: string, collapsed: boolean) => void
}

export default function MessageList(props: Props) {
    const { messageOrder, messageMap, darkMode, streamingMsgId, toolNameLabels, onOpenFile, onRevertFile, onRetry, onContinue, onToggleReasoning } = props
    const containerRef = useRef<HTMLDivElement>(null)
    const endRef = useRef<HTMLDivElement>(null)
    const userScrolledUp = useRef(false)
    // 用户手动滚动时标记（距底 >150px 视为上翻；回到底部附近自动复位）
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const handler = () => { userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight > 150 }
        el.addEventListener('scroll', handler)
        return () => el.removeEventListener('scroll', handler)
    }, [])
    // 新流开始（message_start）时重置"用户上翻"标记，恢复自动跟随
    useEffect(() => {
        if (streamingMsgId) userScrolledUp.current = false
    }, [streamingMsgId])
    // 消息更新时自动滚到底部（用户主动上翻时不打扰）
    useEffect(() => {
        const el = containerRef.current
        if (!el || userScrolledUp.current) return
        requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight
            endRef.current?.scrollIntoView({ block: 'end' })
        })
    }, [messageOrder, messageMap, streamingMsgId])
    // 流式期间持续滚动到底（跟随打字机逐段揭示产生的增量高度）
    useEffect(() => {
        if (!streamingMsgId) return
        const el = containerRef.current
        if (!el) return
        let raf = 0
        const loop = () => {
            if (!userScrolledUp.current) {
                el.scrollTop = el.scrollHeight
                endRef.current?.scrollIntoView({ block: 'end' })
            }
            raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(raf)
    }, [streamingMsgId])
    return (
        <div ref={containerRef} style={{ height: '100%', overflow: 'auto', padding: '12px 16px' }}>
            {messageOrder.map(id => {
                const msg = messageMap[id]
                if (!msg) return null
                return <div key={msg.id} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <MessageBubble msg={msg} darkMode={darkMode} streamingMsgId={streamingMsgId} toolNameLabels={toolNameLabels} onOpenFile={onOpenFile} onRevertFile={onRevertFile} onRetry={onRetry} onContinue={onContinue} onToggleReasoning={onToggleReasoning} />
                </div>
            })}
            <div ref={endRef} />
        </div>
    )
}
