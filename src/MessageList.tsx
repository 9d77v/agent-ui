import { useEffect, useRef, useState, useCallback } from 'react'
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

// 距底小于该值视为"已在底部"（自动跟随）；超过则视为用户上翻并暂停跟随、显示回底按钮
const BOTTOM_THRESHOLD = 40

export default function MessageList(props: Props) {
    const { messageOrder, messageMap, darkMode, streamingMsgId, toolNameLabels, onOpenFile, onRevertFile, onRetry, onContinue, onToggleReasoning } = props
    const containerRef = useRef<HTMLDivElement>(null)
    const endRef = useRef<HTMLDivElement>(null)
    const userScrolledUp = useRef(false)
    const [showBackToBottom, setShowBackToBottom] = useState(false)

    const isAtBottom = useCallback((el: HTMLDivElement) => {
        return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD
    }, [])

    const updateScrollState = useCallback(() => {
        const el = containerRef.current
        if (!el) return
        const atBottom = isAtBottom(el)
        userScrolledUp.current = !atBottom
        setShowBackToBottom(!atBottom)
    }, [isAtBottom])

    const scrollToBottom = useCallback(() => {
        userScrolledUp.current = false
        setShowBackToBottom(false)
        const el = containerRef.current
        if (el) el.scrollTop = el.scrollHeight
        endRef.current?.scrollIntoView({ block: 'end' })
    }, [])

    // 滚动 + 用户交互监听：wheel/touchstart/pointerdown 立即暂停跟随，
    // 消除流式 rAF 在用户拖动窗口期内强制拉回的问题（无需等待 scroll 事件与阈值）。
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        el.addEventListener('scroll', updateScrollState, { passive: true })
        el.addEventListener('wheel', updateScrollState, { passive: true })
        el.addEventListener('touchstart', updateScrollState, { passive: true })
        el.addEventListener('pointerdown', updateScrollState)
        return () => {
            el.removeEventListener('scroll', updateScrollState)
            el.removeEventListener('wheel', updateScrollState)
            el.removeEventListener('touchstart', updateScrollState)
            el.removeEventListener('pointerdown', updateScrollState)
        }
    }, [updateScrollState])

    // 新流开始（message_start）：仅当用户当前处于底部时继续跟随；
    // 若用户已上翻则保持上翻状态，不强制拉回打断正在查看的内容。
    useEffect(() => {
        if (!streamingMsgId) return
        const el = containerRef.current
        if (el && isAtBottom(el)) {
            userScrolledUp.current = false
            setShowBackToBottom(false)
        }
    }, [streamingMsgId, isAtBottom])

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
        <div style={{ position: 'relative', height: '100%' }}>
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
            {showBackToBottom && (
                <div
                    onClick={scrollToBottom}
                    style={{
                        position: 'absolute', right: 16, bottom: 16, zIndex: 10,
                        padding: '4px 14px', borderRadius: 14, cursor: 'pointer',
                        fontSize: 12, lineHeight: '20px',
                        color: darkMode ? '#4dabf7' : '#1677ff',
                        background: darkMode ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.92)',
                        border: `1px solid ${darkMode ? '#444' : '#d9d9d9'}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        userSelect: 'none',
                    }}
                >
                    ↓ 回到底部
                </div>
            )}
        </div>
    )
}
