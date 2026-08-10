import { useState } from 'react'
import { Typography, Button, Input, theme } from 'antd'
import { CheckOutlined, EditOutlined, CloseOutlined, FileTextOutlined } from '@ant-design/icons'

const { Text } = Typography

/**
 * PlanReview 计划审阅卡片：plan 子代理产出计划后展示，支持批准开始实现 / 修改后执行。
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
                    <pre style={{
                        margin: 0, fontSize: 11, color: token.colorText, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                        maxHeight: 160, overflow: 'auto', background: token.colorFillContent, padding: 8, borderRadius: 4,
                    }}>{summary}</pre>
                    <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => onApprove(summary)}>批准并开始实现</Button>
                        <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(true)}>修改计划</Button>
                    </div>
                </>
            )}
        </div>
    )
}
