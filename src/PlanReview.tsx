import { useState } from 'react'
import { Typography, Button, Input, theme } from 'antd'
import { CheckOutlined, EditOutlined, CloseOutlined, FileTextOutlined } from '@ant-design/icons'
import MarkdownRenderer from './Markdown'

const { Text } = Typography

// stripPlanFrontmatter 剥离 YAML frontmatter（---\n…\n--- 起始）：卡片不需要结构化字段，只展示正文。
function stripPlanFrontmatter(summary: string): string {
    const rest = summary.replace(/^\uFEFF/, '').trimStart()
    if (!rest.startsWith('---')) return summary
    const after = rest.slice(3)
    const nl = after.indexOf('\n')
    if (nl < 0) return summary
    const close = after.indexOf('\n---', nl)
    if (close < 0) return summary
    return after.slice(close + 4).trimStart()
}

/**
 * PlanReview 计划审阅卡片：plan 子代理产出计划后展示，支持批准开始实现 / 修改后执行。
 * 非编辑态用 MarkdownRenderer 渲染计划正文（标题/列表/粗斜体等 md 语法正确展示，不再是源码）。
 */
export default function PlanReview({ summary, onApprove, onEdit, onClose, darkMode }: {
    summary: string
    onApprove: (plan: string) => void
    onEdit: (plan: string) => void
    onClose: () => void
    darkMode?: boolean
}) {
    const { token } = theme.useToken()
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(summary)
    const body = stripPlanFrontmatter(summary)
    return (
        <div style={{
            border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 6, margin: '6px 12px 0',
            background: darkMode ? '#1e1e1e' : '#fff', padding: 10, flexShrink: 0,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <FileTextOutlined style={{ color: token.colorPrimary }} />
                <Text strong style={{ fontSize: 12 }}>计划审阅（plan 子代理）</Text>
                <div style={{ flex: 1 }} />
                {onClose && <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClose} />}
            </div>
            {editing ? (
                <>
                    <Input.TextArea size="small" rows={8} value={draft} onChange={e => setDraft(e.target.value)} style={{ fontSize: 12 }} />
                    <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => { onEdit(draft); setEditing(false) }}>保存修改</Button>
                        <Button size="small" onClick={() => setEditing(false)}>取消</Button>
                    </div>
                </>
            ) : (
                <>
                    <div style={{
                        maxHeight: 160, overflow: 'auto', background: token.colorFillContent, padding: 8, borderRadius: 4,
                    }}>
                        <MarkdownRenderer content={body} />
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => onApprove(summary)}>批准并开始实现</Button>
                        <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(true)}>修改计划</Button>
                    </div>
                </>
            )}
        </div>
    )
}
