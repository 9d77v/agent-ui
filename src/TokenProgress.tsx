import { Tooltip, theme } from 'antd'

interface TokenUsage {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
    cached_tokens?: number
    context_window?: number
    reserved_tokens?: number
    system_tokens?: number
    tools_tokens?: number
    messages_tokens?: number
    tool_results_tokens?: number
}
interface Props { tokenUsage: TokenUsage | null; currentContextWindow: number; darkMode?: boolean }

function fmt(n: number): string { if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'; if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'; return String(n) }

// 上下文窗口占比（%），保留 1 位小数
function pctOf(seg: number, window: number): string {
    if (!window || window <= 0) return ''
    return ((seg / window) * 100).toFixed(1) + '%'
}

export default function TokenProgress({ tokenUsage, currentContextWindow, darkMode }: Props) {
    const { token } = theme.useToken()
    const window = tokenUsage?.context_window || currentContextWindow
    if (!tokenUsage || window <= 0) return null
    const total = tokenUsage.total_tokens || 0
    const pct = Math.min(Math.round(total / window * 100), 99)
    const warn = total > window * 0.8
    const strokeColor = warn ? token.colorWarning : token.colorSuccess
    const radius = 15.5
    const circumference = 2 * Math.PI * radius
    const offset = circumference * (1 - Math.min(total / window, 1))

    // VSCode 式上下文窗口细分（后端随 token_usage 消息估算推送，不新增消息类型）
    const hasBreakdown = !!(tokenUsage.system_tokens || tokenUsage.tools_tokens || tokenUsage.messages_tokens || tokenUsage.tool_results_tokens)
    const rows = hasBreakdown ? [
        { label: 'System', tokens: tokenUsage.system_tokens || 0 },
        { label: 'Tools', tokens: tokenUsage.tools_tokens || 0 },
        { label: 'Messages', tokens: tokenUsage.messages_tokens || 0 },
        { label: 'Tool Results', tokens: tokenUsage.tool_results_tokens || 0 },
    ].filter(r => r.tokens > 0) : []

    return <Tooltip placement="topRight" title={<div style={{ fontSize: 12, lineHeight: 1.8, minWidth: 200, whiteSpace: 'nowrap' }}>
        <div style={{ textAlign: 'center', marginBottom: 4, fontWeight: 600, color: strokeColor }}>
            已用 {fmt(total)} / {fmt(window)} ({pct}%)
        </div>
        {hasBreakdown && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingBottom: 2, borderBottom: '1px solid #555', marginBottom: 2 }}>
                <span style={{ color: '#aaa' }}>保留用于响应</span><span>{fmt(tokenUsage.reserved_tokens || 0)}</span>
            </div>
        )}
        {rows.map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ color: '#aaa' }}>{r.label}</span>
                <span>{fmt(r.tokens)} <span style={{ color: '#888' }}>{pctOf(r.tokens, window)}</span></span>
            </div>
        ))}
        {hasBreakdown && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 2, paddingTop: 2, borderTop: '1px solid #555' }}>
                <span style={{ color: '#aaa' }}>输入</span><span>{fmt(tokenUsage.prompt_tokens || 0)}</span>
            </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ color: '#aaa' }}>输出</span><span>{fmt(tokenUsage.completion_tokens || 0)}</span>
        </div>
        {(tokenUsage.cached_tokens || 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                <span style={{ color: '#aaa' }}>缓存命中</span><span>{fmt(tokenUsage.cached_tokens || 0)}</span>
            </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 2, paddingTop: 2, borderTop: '1px solid #555' }}>
            <span style={{ color: '#aaa' }}>总计</span><span style={{ fontWeight: 600 }}>{fmt(total)}</span>
        </div>
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
