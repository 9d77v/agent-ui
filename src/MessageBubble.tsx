import { Typography, Button } from 'antd'
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
    const loc = useAgentLocale()
    const toolDisplayNames = loc.toolDisplayNames
    if (msg.role === 'user') {
        return <div style={{ maxWidth: '80%', padding: '8px 14px', borderRadius: 12, background: darkMode ? '#1a3a5c' : '#e6f4ff', color: darkMode ? '#d4d4d4' : '#333', fontSize: 13, lineHeight: 1.6 }}>
            <MarkdownRenderer content={msg.content} darkMode={darkMode} />
        </div>
    }
    if (msg.fileDiff) {
        return <div style={{ width: '100%', marginBottom: 8 }}>
            <div style={{ padding: '8px 12px', borderRadius: 8, background: darkMode ? '#1e2a3a' : '#f0f5ff', border: `1px solid ${darkMode ? '#3a5a8a' : '#adc6ff'}`, fontSize: 13, lineHeight: 1.6, cursor: 'pointer' }} onClick={() => onOpenFile(msg.fileDiff!.filePath)}>
                <Text style={{ color: '#1677ff', fontSize: 13 }}>📄 {msg.fileDiff!.filePath?.replace(/\\/g, '/').split('/').pop() || loc.message.fileChangeLabel}</Text><br />
                <Text type="secondary" style={{ fontSize: 11 }}>{msg.fileDiff!.filePath}{msg.fileDiff!.backupPath && <Button type="link" size="small" style={{ fontSize: 11, padding: 0, marginLeft: 8 }} onClick={e => { e.stopPropagation(); onRevertFile(msg.fileDiff!.filePath, msg.fileDiff!.backupPath) }}>{loc.message.revertButton}</Button>}</Text>
            </div>
        </div>
    }
    if (msg.role === 'tool') {
        const labels = toolNameLabels || toolDisplayNames || {}
        const output = msg.content || ''
        return <div style={{ width: '100%', marginBottom: 8 }}>
            <div style={{ padding: '6px 10px', borderRadius: 6, background: darkMode ? '#252525' : '#fafafa', border: `1px solid ${darkMode ? '#444' : '#e8e8e8'}`, fontSize: 12, color: darkMode ? '#999' : '#666' }}>
                {output && <MarkdownRenderer content={output.length > 500 ? output.slice(0, 500) + `\n${loc.message.truncatedSuffix}` : output} darkMode={darkMode} />}
            </div>
        </div>
    }

    const tools: TimelineToolItem[] = (msg.toolList || []).map(t => ({ name: t.name || '', args: t.args || '', result: t.result, status: (t.status || 'done') as TimelineToolItem['status'] }))
    return <div style={{ width: '100%' }}>
        {msg.reasoning && <details style={{ marginBottom: 6 }} open={msg.showReasoning} onToggle={e => onToggleReasoning(msg.id, !(e.target as HTMLDetailsElement).open)}>
            <summary style={{ fontSize: 11, color: darkMode ? '#888' : '#999', cursor: 'pointer', userSelect: 'none' }}>{loc.message.reasoningTitle}</summary>
            <div style={{ marginTop: 4, padding: '6px 10px', borderRadius: 4, background: darkMode ? '#2d2d2d' : '#fffbe6', border: `1px solid ${darkMode ? '#665500' : '#ffe58f'}`, fontSize: 12, color: darkMode ? '#bbb' : '#666', maxHeight: 200, overflowY: 'auto' }}>
                <MarkdownRenderer content={msg.reasoning} darkMode={darkMode} />
            </div>
        </details>}
        {tools.length > 0 && <ToolTimeline tools={tools} darkMode={darkMode} onFileClick={onOpenFile} />}
        {msg.content?.trim() && <div style={{ fontSize: 13, lineHeight: 1.6, color: darkMode ? '#d4d4d4' : '#333' }}><MarkdownRenderer content={msg.content} darkMode={darkMode} /></div>}
        {msg.loading && !msg.content?.trim() && !tools.length && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: darkMode ? '#888' : '#999', fontSize: 13 }}><span style={{ animation: 'pulse 1.5s infinite' }}>●</span> {loc.message.thinkingLabel}</div>}
        {msg.retryInfo && !msg.retryInfo.done && <div style={{ marginTop: 8 }}><Button size="small" type="primary" danger onClick={() => onRetry(msg.retryInfo!)}>{loc.message.retryButton}</Button></div>}
    </div>
}

function MarkdownRenderer({ content, darkMode }: { content: string; darkMode?: boolean }) {
    const extraStyle = darkMode ? `.markdown-body pre { background: #1e1e1e !important; border-color: #333 !important; }
        .markdown-body code { background: #2d2d2d !important; color: #d4d4d4 !important; }
        .markdown-body pre code { background: transparent !important; }` : ''
    return <div className="markdown-body" style={{ fontSize: 13, lineHeight: 1.6, color: darkMode ? '#d4d4d4' : '#1e1e1e' }}>
        {extraStyle && <style>{extraStyle}</style>}
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
}
