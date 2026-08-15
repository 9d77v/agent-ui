import { memo, useEffect, useRef, useState } from 'react'
import { Typography, Button, theme, Modal } from 'antd'
import { FileOutlined, FileImageOutlined, FileTextOutlined, CodeOutlined, FileZipOutlined, FilePdfOutlined, FileWordOutlined, FileExcelOutlined, FilePptOutlined } from '@ant-design/icons'
import { AgentMessage, Attachment } from './hooks/useMessageTree'
import { stripFileRefBlock, stripImagePlaceholders } from './attachments'
import ToolTimeline from './ToolTimeline'
import type { ToolViewItem } from './types'
import MarkdownRenderer from './Markdown'
import { useAgentLocale } from './locale/index'

const { Text } = Typography

/** 文件 chip 图标：按扩展名选 FileOutlined 系列图标 */
function fileIcon(path: string): React.ReactNode {
    const ext = (path.split('.').pop() || '').toLowerCase()
    const style = { fontSize: 12 }
    switch (ext) {
        case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': case 'svg': case 'bmp': case 'ico':
            return <FileImageOutlined style={style} />
        case 'md': case 'markdown': case 'txt': case 'log': case 'json': case 'yaml': case 'yml': case 'toml': case 'xml':
            return <FileTextOutlined style={style} />
        case 'ts': case 'tsx': case 'js': case 'jsx': case 'go': case 'py': case 'rs': case 'java': case 'c': case 'cpp': case 'h': case 'hpp': case 'cs': case 'rb': case 'php': case 'swift': case 'kt': case 'sql': case 'html': case 'css': case 'scss': case 'less':
            return <CodeOutlined style={style} />
        case 'zip': case 'rar': case '7z': case 'tar': case 'gz': case 'bz2':
            return <FileZipOutlined style={style} />
        case 'pdf':
            return <FilePdfOutlined style={style} />
        case 'doc': case 'docx':
            return <FileWordOutlined style={style} />
        case 'xls': case 'xlsx': case 'csv':
            return <FileExcelOutlined style={style} />
        case 'ppt': case 'pptx':
            return <FilePptOutlined style={style} />
        default:
            return <FileOutlined style={style} />
    }
}

/** 路径 basename（兼容 / 与 \\ 分隔） */
function basenameOf(p: string): string {
    const parts = (p || '').split(/[/\\]/)
    return parts[parts.length - 1] || p
}

/** hover 元数据时间格式化：今天 → HH:mm（24h）；非今天 → YYYY-MM-DD HH:mm（本地时区）。
 * 非法时间戳原样返回（不渲染异常内容）。 */
export function formatMessageTime(iso: string): string {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
    const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    if (isToday) return hm
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hm}`
}

export interface MessageBubbleProps {
    msg: AgentMessage; darkMode?: boolean; streamingMsgId?: string | null
    onOpenFile: (path: string) => void
    onRetry: (retryInfo: NonNullable<AgentMessage['retryInfo']>) => void
    onContinue: () => void
    onToggleReasoning: (msgId: string, collapsed: boolean) => void
    /** 是否自动展开工具参数（审批进行中传 false） */
    toolAutoExpand?: boolean
    /** 子代理交接回调（run_subagent 结果的 handoffs 按钮） */
    onHandoff?: (label: string, prompt: string) => void
}

export default memo(function MessageBubble({ msg, darkMode, streamingMsgId, onOpenFile, onRetry, onContinue, onToggleReasoning, toolAutoExpand, onHandoff }: MessageBubbleProps) {
    const { token } = theme.useToken()
    const loc = useAgentLocale()
    const isStreaming = streamingMsgId === msg.id
    // 真正"仍在输出"：message_end 只置 loading=false，streamingMsgId 直到 turn_complete 才清空；
    // 若仅凭 isStreaming 判断，结束后的消息会卡在"流式强制展开 + 打字机截断"，
    // 导致思考无法展开查看、内容显示不完整。
    const isOutputting = isStreaming && !!msg.loading
    const reasoningRef = useRef<HTMLDivElement>(null)

    // 打字机效果：流式期间逐段揭示思考与正文，避免内容整块蹍出。
    // 降频：rAF(~16ms) → ~100ms 定时器（与 WS 增量节流同频），步长稍加大保持逐段揭示观感，
    // 避免流式期间每帧 ReactMarkdown 全量重解析（长内容 O(n)/帧 → ~10fps）。
    const [revealedReasoning, setRevealedReasoning] = useState(msg.reasoning?.length ?? 0)
    const [revealedContent, setRevealedContent] = useState(msg.content.length)
    // 图片大图预览（用户消息附件缩略图点击打开，复用 ChatInput 预览模式）
    const [previewAtt, setPreviewAtt] = useState<Attachment | null>(null)
    useEffect(() => {
        if (!isOutputting) {
            setRevealedReasoning(msg.reasoning?.length ?? 0)
            setRevealedContent(msg.content.length)
            return
        }
        let timer = 0
        const tick = () => {
            let done = true
            setRevealedReasoning(prev => {
                const target = msg.reasoning?.length ?? 0
                if (prev >= target) return prev
                done = false
                return Math.min(target, prev + Math.max(1, Math.round((target - prev) / 10)))
            })
            setRevealedContent(prev => {
                const target = msg.content.length
                if (prev >= target) return prev
                done = false
                return Math.min(target, prev + Math.max(1, Math.round((target - prev) / 10)))
            })
            if (!done) timer = window.setTimeout(tick, 100)
        }
        timer = window.setTimeout(tick, 100)
        return () => clearTimeout(timer)
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
        const attachments = msg.attachments || []
        const imageAtts = attachments.filter(a => a.type === 'image')
        const fileAtts = attachments.filter(a => a.type === 'file')
        // 显示内容：剥离"附加文件"块；图片占位符按实际图片附件数剥离
        // （artifact 缺失、附件未建成的占位符保留文字兜底，不显示空气泡）
        const displayContent = stripImagePlaceholders(
            stripFileRefBlock(msg.content, loc.chatInput.attachedFilesLabel),
            imageAtts.length,
        )
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '80%' }}>
                <div style={{ padding: '8px 14px', borderRadius: 12, background: token.colorPrimaryBg, color: token.colorText, fontSize: 13, lineHeight: 1.6 }}>
                    {/* 图片缩略图网格（data URI 渲染，点击放大预览） */}
                    {imageAtts.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: (displayContent.trim() || fileAtts.length > 0) ? 8 : 0 }}>
                            {imageAtts.map((att, i) => (
                                <img key={i} src={att.preview || att.path} alt={att.name || '图片'}
                                    onClick={() => setPreviewAtt(att)}
                                    style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 6, cursor: 'zoom-in', border: `1px solid ${token.colorBorderSecondary}`, background: '#fff' }} />
                            ))}
                        </div>
                    )}
                    {/* 文件 chip（图标 + 文件名，点击复用 onOpenFile 在应用内编辑器打开） */}
                    {fileAtts.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: displayContent.trim() ? 6 : 0 }}>
                            {fileAtts.map((att, i) => (
                                <span key={i} onClick={() => onOpenFile(att.path)}
                                    title={att.path}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, background: token.colorFillAlter, color: token.colorPrimary, fontSize: 11, cursor: 'pointer', maxWidth: 220, userSelect: 'none' }}>
                                    {fileIcon(att.path)}
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name || basenameOf(att.path)}</span>
                                </span>
                            ))}
                        </div>
                    )}
                    {displayContent.trim() && <MarkdownRenderer content={displayContent} />}
                </div>
                {/* hover 显隐小字（文档流 + .agent-msg-action-btn CSS 显隐，恢复可显示版本）：用户消息仅显示时间 */}
                {msg.timestamp && (
                    <div className="agent-msg-action-btn" style={{ marginTop: 2, fontSize: 11, color: token.colorTextTertiary }}>
                        {formatMessageTime(msg.timestamp)}
                    </div>
                )}
                {/* 图片大图预览 Modal（点击缩略图打开；关闭按钮位于图片右上角） */}
                {previewAtt && (
                    <Modal
                        open
                        onCancel={() => setPreviewAtt(null)}
                        footer={null}
                        title={null}
                        centered
                        width="fit-content"
                        styles={{ body: { padding: 8 } }}
                    >
                        <img
                            src={previewAtt.preview || previewAtt.path}
                            alt={previewAtt.name || '图片'}
                            style={{ maxWidth: '70vw', maxHeight: '70vh', display: 'block' }}
                        />
                    </Modal>
                )}
            </div>
        )
    }
        if (msg.role === 'tool') {
        const output = msg.content || ''
        return <div style={{ width: '100%', marginBottom: 8 }}>
            <div style={{ padding: '6px 10px', borderRadius: 6, background: token.colorFillAlter, border: `1px solid ${token.colorBorderSecondary}`, fontSize: 12, color: token.colorTextSecondary }}>
                {output && <MarkdownRenderer content={output.length > 500 ? output.slice(0, 500) + `\n${loc.message.truncatedSuffix}` : output} />}
            </div>
        </div>
    }

    const tools: ToolViewItem[] = (msg.toolList || []).map(t => ({ name: t.name || '', args: t.args || '', result: t.result, status: (t.status || 'done') as ToolViewItem['status'] }))
    // 完成且无任何正文的 assistant 消息（content/reasoning/tools 全空、非流式、无操作按钮）→ 不渲染，
    // 避免出现「无正文但 hover 有元数据」的幽灵消息
    if (!msg.loading && !msg.content?.trim() && !msg.reasoning && tools.length === 0 && !msg.needsContinue && !msg.retryInfo) {
        return null
    }
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
        {tools.length > 0 && <ToolTimeline tools={tools} darkMode={darkMode} onFileClick={onOpenFile} autoExpand={toolAutoExpand} onHandoff={onHandoff} />}
        {shownContent?.trim() && <div style={{ fontSize: 13, lineHeight: 1.6, color: token.colorText }}><MarkdownRenderer content={shownContent} /></div>}
        {msg.loading && !msg.content?.trim() && !tools.length && !(isOutputting && msg.showReasoning && msg.reasoning) && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: token.colorTextTertiary, fontSize: 13 }}><span style={{ animation: 'pulse 1.5s infinite' }}>●</span> {loc.message.thinkingLabel}</div>}
        {msg.needsContinue && !msg.loading && (
            <div style={{ marginTop: 8 }}>
                <Button size="small" type="primary" onClick={onContinue}>{loc.message.continueButton}</Button>
            </div>
        )}
        {msg.retryInfo && !msg.retryInfo.done && <div style={{ marginTop: 8 }}><Button size="small" type="primary" danger onClick={() => onRetry(msg.retryInfo!)}>{loc.message.retryButton}</Button></div>}
        {/* hover 显隐小字（文档流 + .agent-msg-action-btn CSS 显隐，恢复可显示版本）：消息时间 + 模型（无数据不渲染） */}
        {(msg.timestamp || msg.model) && (
            <div className="agent-msg-action-btn" style={{ marginTop: 2, fontSize: 11, color: token.colorTextTertiary }}>
                {msg.timestamp && <span>{formatMessageTime(msg.timestamp)}</span>}
                {msg.model && <span>{msg.timestamp ? ' · ' : ''}{msg.model}</span>}
            </div>
        )}
    </div>
})
