import { useEffect, useRef, useState } from 'react'
import { Typography, Button, theme } from 'antd'
import { AgentMessage } from './hooks/useMessageTree'
import ToolTimeline, { type TimelineToolItem } from './ToolTimeline'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAgentLocale } from './locale/index'

const { Text } = Typography

export interface MessageBubbleProps {
    msg: AgentMessage; darkMode?: boolean; streamingMsgId?: string | null
    onOpenFile: (path: string) => void; onRevertFile: (path: string, backupPath: string) => void
    onRetry: (retryInfo: NonNullable<AgentMessage['retryInfo']>) => void
    onContinue: () => void
    onToggleReasoning: (msgId: string, collapsed: boolean) => void
    toolNameLabels?: Record<string, string>
}

export default function MessageBubble({ msg, darkMode, streamingMsgId, onOpenFile, onRevertFile, onRetry, onContinue, onToggleReasoning, toolNameLabels }: MessageBubbleProps) {
    const { token } = theme.useToken()
    const loc = useAgentLocale()
    const toolDisplayNames = loc.toolDisplayNames
    const isStreaming = streamingMsgId === msg.id
    // 真正"仍在输出"：message_end 只置 loading=false，streamingMsgId 直到 turn_complete 才清空；
    // 若仅凭 isStreaming 判断，结束后的消息会卡在"流式强制展开 + 打字机截断"，
    // 导致思考无法展开查看、内容显示不完整。
    const isOutputting = isStreaming && !!msg.loading
    const reasoningRef = useRef<HTMLDivElement>(null)

    // 打字机效果：流式期间逐段揭示思考与正文，避免内容整块蹍出
    const [revealedReasoning, setRevealedReasoning] = useState(msg.reasoning?.length ?? 0)
    const [revealedContent, setRevealedContent] = useState(msg.content.length)
    useEffect(() => {
        if (!isOutputting) {
            setRevealedReasoning(msg.reasoning?.length ?? 0)
            setRevealedContent(msg.content.length)
            return
        }
        let raf = 0
        const tick = () => {
            setRevealedReasoning(prev => {
                const target = msg.reasoning?.length ?? 0
                if (prev >= target) return prev
                return Math.min(target, prev + Math.max(1, Math.round((target - prev) / 20)))
            })
            setRevealedContent(prev => {
                const target = msg.content.length
                if (prev >= target) return prev
                return Math.min(target, prev + Math.max(1, Math.round((target - prev) / 20)))
            })
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [isOutputting, msg.reasoning, msg.content])

    const shownReasoning = isOutputting ? (msg.reasoning || '').slice(0, revealedReasoning) : (msg.reasoning || '')
    const shownContent = isOutputting ? msg.content.slice(0, revealedContent) : msg.content

    // 思考流式输出时，思考框内部跟随滚动到底部。
    // 折叠时机：不再按打字机揭示进度折叠——SSE 分块间隙会误判"已输出完"导致过早折叠，
    // 用户点开发现内容仍在增加；统一在 message_end（useAgentWebSocket 置 showReasoning=false）时折叠。
    useEffect(() => {
        if (isOutputting && msg.showReasoning && reasoningRef.current) reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight
    }, [revealedReasoning, msg.showReasoning, isOutputting])
    if (msg.role === 'user') {
        return <div style={{ maxWidth: '80%', padding: '8px 14px', borderRadius: 12, background: token.colorPrimaryBg, color: token.colorText, fontSize: 13, lineHeight: 1.6 }}>
            <MarkdownRenderer content={msg.content} />
        </div>
    }
        if (msg.role === 'tool') {
        const labels = toolNameLabels || toolDisplayNames || {}
        const output = msg.content || ''
        return <div style={{ width: '100%', marginBottom: 8 }}>
            <div style={{ padding: '6px 10px', borderRadius: 6, background: token.colorFillAlter, border: `1px solid ${token.colorBorderSecondary}`, fontSize: 12, color: token.colorTextSecondary }}>
                {output && <MarkdownRenderer content={output.length > 500 ? output.slice(0, 500) + `\n${loc.message.truncatedSuffix}` : output} />}
            </div>
        </div>
    }

    const tools: TimelineToolItem[] = (msg.toolList || []).map(t => ({ name: t.name || '', args: t.args || '', result: t.result, status: (t.status || 'done') as TimelineToolItem['status'] }))
    return <div style={{ width: '100%' }}>
        {msg.reasoning && (isOutputting && msg.showReasoning ? (
            // 思考仍在输出：强制展开、不可折叠，内容跟随滚动到底部
            <div style={{ marginBottom: 6, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: token.colorFillAlter, fontSize: 11, color: token.colorTextTertiary, userSelect: 'none' }}>
                    <span style={{ animation: 'pulse 1.5s infinite', fontSize: 10 }}>●</span>
                    {/* 流式输出中：标题为"思考中..."；message_end 后折叠分支标题为 reasoningTitle（思考内容） */}
                    {loc.message.thinkingLabel}
                </div>
                <div ref={reasoningRef} style={{ padding: '6px 10px', background: token.colorWarningBg, borderTop: `1px solid ${token.colorBorderSecondary}`, fontSize: 12, color: token.colorTextSecondary, maxHeight: 200, overflowY: 'auto' }}>
                    <MarkdownRenderer content={shownReasoning} />
                </div>
            </div>
        ) : (
            <details style={{ marginBottom: 6 }} open={msg.showReasoning} onToggle={e => onToggleReasoning(msg.id, !(e.target as HTMLDetailsElement).open)}>
                <summary style={{ fontSize: 11, color: token.colorTextTertiary, cursor: 'pointer', userSelect: 'none' }}>{loc.message.reasoningTitle}</summary>
                <div style={{ marginTop: 4, padding: '6px 10px', borderRadius: 4, background: token.colorWarningBg, border: `1px solid ${token.colorWarningBorder}`, fontSize: 12, color: token.colorTextSecondary, maxHeight: 200, overflowY: 'auto' }}>
                    <MarkdownRenderer content={shownReasoning} />
                </div>
            </details>
        ))}
        {tools.length > 0 && <ToolTimeline tools={tools} darkMode={darkMode} onFileClick={onOpenFile} />}
        {shownContent?.trim() && <div style={{ fontSize: 13, lineHeight: 1.6, color: token.colorText }}><MarkdownRenderer content={shownContent} /></div>}
        {msg.loading && !msg.content?.trim() && !tools.length && !(isOutputting && msg.showReasoning && msg.reasoning) && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: token.colorTextTertiary, fontSize: 13 }}><span style={{ animation: 'pulse 1.5s infinite' }}>●</span> {loc.message.thinkingLabel}</div>}
        {msg.needsContinue && !msg.loading && (
            <div style={{ marginTop: 8 }}>
                <Button size="small" type="primary" onClick={onContinue}>{loc.message.continueButton}</Button>
            </div>
        )}
        {msg.retryInfo && !msg.retryInfo.done && <div style={{ marginTop: 8 }}><Button size="small" type="primary" danger onClick={() => onRetry(msg.retryInfo!)}>{loc.message.retryButton}</Button></div>}
    </div>
}

function MarkdownRenderer({ content }: { content: string }) {
    const { token } = theme.useToken()
    const extraStyle = `
        .markdown-body pre { background: ${token.colorFillContent} !important; border-color: ${token.colorBorderSecondary} !important; }
        .markdown-body code { background: ${token.colorFillSecondary} !important; color: ${token.colorText} !important; }
        .markdown-body pre code { background: transparent !important; }
        .markdown-body th { background: ${token.colorFillAlter} !important; }
        .markdown-body td, .markdown-body th { border-color: ${token.colorBorderSecondary} !important; }
        .markdown-body blockquote { color: ${token.colorTextSecondary} !important; }
    `
    return <div className="markdown-body" style={{ fontSize: 13, lineHeight: 1.6, color: token.colorText }}>
        <style>{extraStyle}</style>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
}
