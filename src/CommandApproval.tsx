import { useState } from 'react'
import { Button, Space, Typography, Tag, message } from 'antd'
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
    const loc = useAgentLocale()
    const [resolved, setResolved] = useState(false)
    const risk = getRiskTag(riskLevel, loc)
    const bgColor = darkMode ? '#1e1e1e' : (risk.color === 'red' ? '#fff2f0' : '#fffbe6')
    const borderColor = darkMode ? (risk.color === 'red' ? '#5a1d1d' : '#5a4a00') : (risk.color === 'red' ? '#ffccc7' : '#ffe58f')
    const textColor = darkMode ? '#d4d4d4' : '#333'
    if (resolved) return null
    return <div style={{ border: `1px solid ${risk.color === 'red' ? '#ff4d4f' : '#faad14'}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden', background: bgColor }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: `1px solid ${borderColor}` }}>
            <Space><WarningOutlined style={{ color: risk.color === 'red' ? '#ff4d4f' : '#faad14', fontSize: 16 }} /><Text strong style={{ fontSize: 13, color: textColor }}>{loc.approval.requiredTitle}</Text><Tag color={risk.color} style={{ fontSize: 11 }}>{risk.label}</Tag></Space>
        </div>
        <div style={{ padding: '8px 12px' }}>
            <div style={{ background: darkMode ? '#1e1e1e' : '#f6f8fa', borderRadius: 6, padding: '8px 12px', fontFamily: "'Cascadia Code','Consolas',monospace", fontSize: 13, color: darkMode ? '#d4d4d4' : '#333', marginBottom: 6, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}><span style={{ color: '#89ddff' }}>$</span> {command}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '8px 12px', borderTop: `1px solid ${borderColor}` }}>
            <Button size="small" icon={<CloseCircleOutlined />} onClick={() => { setResolved(true); onReject(approvalId); }}>{loc.approval.skipButton}</Button>
            <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => { setResolved(true); onApprove(approvalId) }} danger={risk.color === 'red'}>{loc.approval.confirmButton}</Button>
        </div>
    </div>
}
