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
    onToggleReasoning: (msgId: string, collapsed: boolean) => void
    toolNameLabels?: Record<string, string>
}

export default function MessageBubble({ msg, darkMode, streamingMsgId, onOpenFile, onRevertFile, onRetry, onToggleReasoning, toolNameLabels }: MessageBubbleProps) {
    const { token } = theme.useToken()
    const loc = useAgentLocale()
    const toolDisplayNames = loc.toolDisplayNames
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
        {msg.reasoning && <details style={{ marginBottom: 6 }} open={msg.showReasoning} onToggle={e => onToggleReasoning(msg.id, !(e.target as HTMLDetailsElement).open)}>
            <summary style={{ fontSize: 11, color: token.colorTextTertiary, cursor: 'pointer', userSelect: 'none' }}>{loc.message.reasoningTitle}</summary>
            <div style={{ marginTop: 4, padding: '6px 10px', borderRadius: 4, background: token.colorWarningBg, border: `1px solid ${token.colorWarningBorder}`, fontSize: 12, color: token.colorTextSecondary, maxHeight: 200, overflowY: 'auto' }}>
                <MarkdownRenderer content={msg.reasoning} />
            </div>
        </details>}
        {tools.length > 0 && <ToolTimeline tools={tools} darkMode={darkMode} onFileClick={onOpenFile} />}
        {msg.content?.trim() && <div style={{ fontSize: 13, lineHeight: 1.6, color: token.colorText }}><MarkdownRenderer content={msg.content} /></div>}
        {msg.loading && !msg.content?.trim() && !tools.length && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: token.colorTextTertiary, fontSize: 13 }}><span style={{ animation: 'pulse 1.5s infinite' }}>●</span> {loc.message.thinkingLabel}</div>}
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
