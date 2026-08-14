import { useEffect, useRef, useState, useCallback } from 'react'
import { AgentMessage } from './hooks/useMessageTree'
import MessageBubble from './MessageBubble'

interface Props {
    messageOrder: string[]
    messageMap: Record<string, AgentMessage>
    darkMode?: boolean
    streamingMsgId?: string | null
    onOpenFile: (path: string) => void
    onRetry: (retryInfo: NonNullable<AgentMessage['retryInfo']>) => void
    onContinue: () => void
    onToggleReasoning: (msgId: string, collapsed: boolean) => void
    /** 是否自动展开工具参数（审批进行中传 false：命令详情由审批卡片展示，避免与工具卡片重复） */
    toolAutoExpand?: boolean
    /** 子代理交接回调（run_subagent 结果的 handoffs 按钮） */
    onHandoff?: (label: string, prompt: string) => void
    /** 外部滚动定位（用户消息上/下箭头导航）：非空时滚动到对应消息并暂停自动跟随 */
    scrollToMsgId?: string
    /** 滚动时回调当前视口所在的用户消息 id（无用户消息时 null）；用于外部计数跟随视口 */
    onUserMsgScrollChange?: (msgId: string | null) => void
}

// 距底小于该值视为"已在底部"（自动跟随）；超过则视为用户上翻并暂停跟随、显示回底按钮
const BOTTOM_THRESHOLD = 40
// 消息列表内容列最大宽度（滚动容器保持整宽 → 滚动条贴面板边缘；内容列收窄居中）
const MSG_MAX_WIDTH = 880

export default function MessageList(props: Props) {
    const { messageOrder, messageMap, darkMode, streamingMsgId, onOpenFile, onRetry, onContinue, onToggleReasoning, toolAutoExpand, onHandoff, scrollToMsgId, onUserMsgScrollChange } = props
    const containerRef = useRef<HTMLDivElement>(null)
    const endRef = useRef<HTMLDivElement>(null)
    const userScrolledUp = useRef(false)
    const [showBackToBottom, setShowBackToBottom] = useState(false)
    // 交互窗口闸门：wheel/touchstart/pointerdown 置位 + 短超时清除。
    // 仅「交互窗口内的 scroll 事件 + scrollTop 离开底部」才判定用户主动上翻，
    // 内容增长 / 滚动锚定 / 思考面板内部滚轮触发的 scroll 不再误停跟随。
    const interactingRef = useRef(false)
    const interactingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const isAtBottom = useCallback((el: HTMLDivElement) => {
        return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD
    }, [])

    const markInteracting = useCallback(() => {
        interactingRef.current = true
        if (interactingTimerRef.current) clearTimeout(interactingTimerRef.current)
        interactingTimerRef.current = setTimeout(() => {
            interactingRef.current = false
            interactingTimerRef.current = null
        }, 300)
    }, [])

    const updateScrollState = useCallback(() => {
        const el = containerRef.current
        if (!el) return
        const atBottom = isAtBottom(el)
        if (atBottom) {
            // 已在底部：恢复跟随、隐藏回底按钮
            userScrolledUp.current = false
            setShowBackToBottom(false)
            return
        }
        // 不在底部：仅交互窗口内的 scroll 才暂停跟随（用户真实上翻）；
        // 内容增长 / 滚动锚定等被动 scroll 保持现状，不打断跟随、也不清掉已出现的回底按钮
        if (interactingRef.current) {
            userScrolledUp.current = true
            setShowBackToBottom(true)
        }
    }, [isAtBottom])

    const scrollToBottom = useCallback(() => {
        userScrolledUp.current = false
        setShowBackToBottom(false)
        const el = containerRef.current
        if (el) el.scrollTop = el.scrollHeight
        endRef.current?.scrollIntoView({ block: 'end' })
    }, [])

    // 当前已通知外部的视口用户消息 id（避免同值重复回调）
    const lastVisibleUserMsgRef = useRef<string | null>(null)
    // 视口参考线（滚动容器顶部向下 40%）所在/上方最近的一条用户消息 → 通知外部（手动滚动时计数跟随视口）
    const notifyVisibleUserMsg = useCallback(() => {
        const el = containerRef.current
        if (!el || !onUserMsgScrollChange) return
        const refY = el.scrollTop + el.clientHeight * 0.4
        const children = el.querySelectorAll('[data-msg-id]')
        let lastUserMsgId: string | null = null
        for (let i = 0; i < children.length; i++) {
            const c = children[i] as HTMLElement
            if (c.offsetTop > refY) break
            const id = c.getAttribute('data-msg-id')
            if (id && messageMap[id]?.role === 'user') lastUserMsgId = id
        }
        if (lastUserMsgId !== lastVisibleUserMsgRef.current) {
            lastVisibleUserMsgRef.current = lastUserMsgId
            onUserMsgScrollChange(lastUserMsgId)
        }
    }, [messageMap, onUserMsgScrollChange])

    // 滚动 + 用户交互监听：wheel/touchstart/pointerdown 仅标记「交互窗口」（不再直接置 userScrolledUp）；
    // 是否判定用户上翻由 scroll 事件结合交互窗口决定（见 updateScrollState）。
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        let raf = 0
        // scroll 里同步更新跟随状态 + rAF 节流通知视口用户消息（避免高频遍历）
        const onScroll = () => {
            updateScrollState()
            if (!raf) {
                raf = requestAnimationFrame(() => {
                    raf = 0
                    notifyVisibleUserMsg()
                })
            }
        }
        el.addEventListener('scroll', onScroll, { passive: true })
        el.addEventListener('wheel', markInteracting, { passive: true })
        el.addEventListener('touchstart', markInteracting, { passive: true })
        el.addEventListener('pointerdown', markInteracting)
        return () => {
            el.removeEventListener('scroll', onScroll)
            el.removeEventListener('wheel', markInteracting)
            el.removeEventListener('touchstart', markInteracting)
            el.removeEventListener('pointerdown', markInteracting)
            if (raf) cancelAnimationFrame(raf)
            if (interactingTimerRef.current) { clearTimeout(interactingTimerRef.current); interactingTimerRef.current = null }
        }
    }, [updateScrollState, markInteracting, notifyVisibleUserMsg])

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

    // 消息列表变化（新消息/会话切换）后刷新视口用户消息（跟随底部时计数显示 N/N）
    useEffect(() => {
        notifyVisibleUserMsg()
    }, [messageOrder, messageMap, notifyVisibleUserMsg])

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

    // 外部滚动定位（用户消息上/下箭头导航）：滚动到指定消息并暂停自动跟随、显示回底按钮。
    // CSS.escape 对消息 id 转义，防止特殊字符破坏属性选择器。
    useEffect(() => {
        if (!scrollToMsgId) return
        const target = containerRef.current?.querySelector(`[data-msg-id="${CSS.escape(scrollToMsgId)}"]`)
        if (!target) return
        ;(target as HTMLElement).scrollIntoView({ block: 'start' })
        userScrolledUp.current = true
        setShowBackToBottom(true)
    }, [scrollToMsgId])

    return (
        <div style={{ position: 'relative', height: '100%' }}>
            <div ref={containerRef} style={{ height: '100%', overflow: 'auto', padding: '16px 20px', maxWidth: MSG_MAX_WIDTH, margin: '0 auto' }}>
                {/* 内容列收窄居中（滚动容器保持整宽 → 滚动条贴面板边缘；列外空白区域滚轮仍可滚动） */}
                <div style={{ width: '100%', maxWidth: MSG_MAX_WIDTH, margin: '0 auto' }}>
                    {messageOrder.map(id => {
                        const msg = messageMap[id]
                        if (!msg) return null
                        return <div key={msg.id} data-msg-id={msg.id} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', contentVisibility: 'auto', containIntrinsicSize: 'auto 120px' }}>
                            <MessageBubble msg={msg} darkMode={darkMode} streamingMsgId={streamingMsgId} onOpenFile={onOpenFile} onRetry={onRetry} onContinue={onContinue} onToggleReasoning={onToggleReasoning} toolAutoExpand={toolAutoExpand} onHandoff={onHandoff} />
                        </div>
                    })}
                    <div ref={endRef} />
                </div>
            </div>
            {showBackToBottom && (
                <div
                    onClick={scrollToBottom}
                    style={{
                        position: 'absolute', right: 16, bottom: 16, zIndex: 10,
                        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%', cursor: 'pointer',
                        fontSize: 16, lineHeight: 1,
                        color: darkMode ? '#4dabf7' : '#1677ff',
                        background: darkMode ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.92)',
                        border: `1px solid ${darkMode ? '#444' : '#d9d9d9'}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        userSelect: 'none',
                    }}
                >
                    ↓
                </div>
            )}
        </div>
    )
}
