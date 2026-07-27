import { Tooltip, theme } from 'antd'

interface TokenUsage { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
interface Props { tokenUsage: TokenUsage | null; currentContextWindow: number; darkMode?: boolean }

function fmt(n: number): string { if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'; if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'; return String(n) }

export default function TokenProgress({ tokenUsage, currentContextWindow, darkMode }: Props) {
    const { token } = theme.useToken()
    if (!tokenUsage || currentContextWindow <= 0) return null
    const pct = Math.min(Math.round((tokenUsage.total_tokens || 0) / currentContextWindow * 100), 99)
    const warn = (tokenUsage.total_tokens || 0) > currentContextWindow * 0.8
    const strokeColor = warn ? token.colorWarning : token.colorSuccess
    const radius = 15.5
    const circumference = 2 * Math.PI * radius
    const offset = circumference * (1 - Math.min((tokenUsage.total_tokens || 0) / currentContextWindow, 1))

    return <Tooltip placement="topRight" title={<div style={{ fontSize: 12, lineHeight: 1.8, minWidth: 150, whiteSpace: 'nowrap' }}>
        <div style={{ textAlign: 'center', marginBottom: 4, fontWeight: 600, color: strokeColor }}>已用 {pct}%</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span style={{ color: '#aaa' }}>输入</span><span>{fmt(tokenUsage.prompt_tokens || 0)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span style={{ color: '#aaa' }}>输出</span><span>{fmt(tokenUsage.completion_tokens || 0)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 2, paddingTop: 2, borderTop: '1px solid #555' }}><span style={{ color: '#aaa' }}>总计</span><span style={{ fontWeight: 600 }}>{fmt(tokenUsage.total_tokens || 0)} / {fmt(currentContextWindow)}</span></div>
    </div>}>
        <div style={{ position: 'relative', width: 22, height: 22, cursor: 'pointer', flexShrink: 0 }}>
            <svg width={22} height={22} viewBox="0 0 36 36">
                <circle cx={18} cy={18} r={radius} fill="none" stroke={token.colorFillSecondary} strokeWidth={3} />
                <circle cx={18} cy={18} r={radius} fill="none" stroke={strokeColor} strokeWidth={3} strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 18 18)" strokeLinecap="round" />
                <text x={18} y={20} textAnchor="middle" fontSize={7} fill="#888">{pct}%</text>
            </svg>
        </div>
    </Tooltip>
}
