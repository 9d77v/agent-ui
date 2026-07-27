import { useState } from 'react'
import { Button, Space, Typography, Tag, theme } from 'antd'
import { PlayCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { useAgentLocale } from './locale/index'

const { Text, Paragraph } = Typography

interface Props { approvalId: string; command: string; riskLevel: string; onApprove: (approvalId: string) => void; onReject: (approvalId: string) => void; onTrust?: () => void; darkMode?: boolean }

function getRiskTag(r: string, loc: { approval: { riskLevelDangerous: string; riskLevelModerate: string; riskLevelSafe: string } }): { color: string; label: string } {
    if (r === 'dangerous') return { color: 'red', label: loc.approval.riskLevelDangerous }
    if (r === 'moderate') return { color: 'orange', label: loc.approval.riskLevelModerate }
    return { color: 'blue', label: loc.approval.riskLevelSafe }
}

export default function CommandApproval({ approvalId, command, riskLevel, onApprove, onReject, onTrust: _onTrust, darkMode }: Props) {
    const { token } = theme.useToken()
    const loc = useAgentLocale()
    const [resolved, setResolved] = useState(false)
    const risk = getRiskTag(riskLevel, loc)
    const isDanger = risk.color === 'red'
    if (resolved) return null
    return <div style={{ border: `1px solid ${isDanger ? token.colorError : token.colorWarning}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden', background: token.colorBgContainer }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
            <Space><WarningOutlined style={{ color: isDanger ? token.colorError : token.colorWarning, fontSize: 16 }} /><Text strong style={{ fontSize: 13, color: token.colorText }}>{loc.approval.requiredTitle}</Text><Tag color={risk.color} style={{ fontSize: 11 }}>{risk.label}</Tag></Space>
        </div>
        <div style={{ padding: '8px 12px' }}>
            <div style={{ background: token.colorFillContent, borderRadius: 6, padding: '8px 12px', fontFamily: "'Cascadia Code','Consolas',monospace", fontSize: 13, color: token.colorText, marginBottom: 6, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}><span style={{ color: '#89ddff' }}>$</span> {command}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '8px 12px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
            <Button size="small" icon={<CloseCircleOutlined />} onClick={() => { setResolved(true); onReject(approvalId); }}>{loc.approval.skipButton}</Button>
            <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => { setResolved(true); onApprove(approvalId) }} danger={isDanger}>{loc.approval.confirmButton}</Button>
        </div>
    </div>
}
