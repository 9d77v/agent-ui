import { useState } from 'react'
import { Button, theme } from 'antd'
import { CheckOutlined, CloseOutlined, WarningOutlined } from '@ant-design/icons'
import { useAgentLocale } from './locale/index'

interface Props { approvalId: string; command: string; riskLevel: string; onApprove: (approvalId: string) => void; onReject: (approvalId: string) => void; onTrust?: () => void; darkMode?: boolean }

function riskMeta(r: string, labels: { dangerous: string; moderate: string; safe: string }): { color: string; softBg: string; label: string } {
    if (r === 'dangerous') return { color: '#f5222d', softBg: 'rgba(245,34,45,0.08)', label: labels.dangerous }
    if (r === 'moderate') return { color: '#fa8c16', softBg: 'rgba(250,140,22,0.10)', label: labels.moderate }
    return { color: '#1677ff', softBg: 'rgba(22,119,255,0.08)', label: labels.safe }
}

export default function CommandApproval({ approvalId, command, riskLevel, onApprove, onReject, onTrust: _onTrust, darkMode }: Props) {
    const { token } = theme.useToken()
    const loc = useAgentLocale()
    const [resolved, setResolved] = useState(false)
    const risk = riskMeta(riskLevel, {
        dangerous: loc.approval.riskLevelDangerous,
        moderate: loc.approval.riskLevelModerate,
        safe: loc.approval.riskLevelSafe,
    })
    if (resolved) return null
    return (
        <div style={{ borderRadius: 10, marginBottom: 8, overflow: 'hidden', border: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderLeft: `3px solid ${risk.color}` }}>
                <WarningOutlined style={{ color: risk.color, fontSize: 14 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>{loc.approval.requiredTitle}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 500, color: risk.color, background: risk.softBg, borderRadius: 4, padding: '1px 6px', lineHeight: '18px' }}>{risk.label}</span>
                <div style={{ flex: 1 }} />
                <Button size="small" icon={<CloseOutlined />} onClick={() => { setResolved(true); onReject(approvalId) }}>{loc.approval.skipButton}</Button>
                <Button size="small" type="primary" danger={riskLevel === 'dangerous'} icon={<CheckOutlined />} onClick={() => { setResolved(true); onApprove(approvalId) }}>{loc.approval.confirmButton}</Button>
            </div>
            <div style={{ padding: '0 12px 10px', paddingLeft: 15 }}>
                <div style={{ background: token.colorFillQuaternary, borderRadius: 6, padding: '6px 10px', fontFamily: "'Cascadia Code','Consolas',monospace", fontSize: 12.5, color: token.colorText, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    <span style={{ color: risk.color, fontWeight: 600, marginRight: 6 }}>$</span>{command}
                </div>
            </div>
        </div>
    )
}
