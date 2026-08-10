import { useMemo, useState } from 'react'
import { Button, theme } from 'antd'
import { CheckOutlined, CloseOutlined, ExclamationCircleOutlined, FileTextOutlined, SafetyOutlined } from '@ant-design/icons'
import { useAgentLocale } from './locale/index'

interface Props {
    approvalId: string
    command: string
    riskLevel: string
    /** 来源子代理名（空 = 主会话） */
    agent?: string
    onApprove: (approvalId: string) => void
    onReject: (approvalId: string) => void
    onTrust?: () => void
    darkMode?: boolean
}

export type ApprovalKind = 'command' | 'file' | 'tool'

export interface ParsedApproval {
    kind: ApprovalKind
    /** 文件类审批（write_file/edit_file）从参数 JSON 中提取的 path，其它为空串 */
    filePath: string
    /** 代码预览区展示的原文 */
    display: string
}

const FILE_TOOL_RE = /^(write_file|edit_file)\s+(\{.*\})$/s
const TOOL_RE = /^([a-z_][a-z0-9_]*)\s+(\{.*\})$/s

/**
 * 解析后端 approval_required 下发的 command 文本：
 * - run_command → 后端只传原始命令 → 视为 shell 命令（kind=command）
 * - write_file/edit_file + JSON 参数 → 文件修改审批（kind=file，提取 path）
 * - 其它工具 + JSON 参数 → 工具调用审批（kind=tool）
 */
export function parseApproval(command: string): ParsedApproval {
    const trimmed = (command || '').trim()
    const fm = trimmed.match(FILE_TOOL_RE)
    if (fm) {
        let filePath = ''
        try {
            const args = JSON.parse(fm[2])
            if (args && typeof args.path === 'string') filePath = args.path
        } catch { /* 参数解析失败时仅展示原文 */ }
        return { kind: 'file', filePath, display: trimmed }
    }
    if (TOOL_RE.test(trimmed)) {
        return { kind: 'tool', filePath: '', display: trimmed }
    }
    return { kind: 'command', filePath: '', display: trimmed }
}

const LANG_MAP: Record<string, string> = {
    ts: 'TS', tsx: 'TSX', js: 'JS', jsx: 'JSX', mjs: 'JS', cjs: 'JS',
    go: 'Go', py: 'Python', rb: 'Ruby', rs: 'Rust', java: 'Java', kt: 'Kotlin',
    c: 'C', h: 'C', cpp: 'C++', hpp: 'C++', cs: 'C#',
    json: 'JSON', yml: 'YAML', yaml: 'YAML', toml: 'TOML', ini: 'INI', conf: 'Conf', env: 'Env',
    md: 'Markdown', md2: 'Markdown', html: 'HTML', htm: 'HTML', css: 'CSS', scss: 'SCSS', less: 'Less',
    xml: 'XML', svg: 'SVG', sql: 'SQL', sh: 'Shell', bash: 'Shell', zsh: 'Shell', ps1: 'PowerShell',
    vue: 'Vue', svelte: 'Svelte', lock: 'Lock', gradle: 'Gradle', tf: 'Terraform', dockerfile: 'Dockerfile',
}

/** 根据文件扩展名返回 VSCode 风格的语言徽标文本（如 foo.ts → TS），无扩展名返回空串 */
export function languageBadge(filePath: string): string {
    const base = (filePath || '').split(/[\\/]/).pop() || ''
    const dot = base.lastIndexOf('.')
    if (dot <= 0) return ''
    const ext = base.slice(dot + 1).toLowerCase()
    return LANG_MAP[ext] || ext.toUpperCase()
}

function riskMeta(r: string, labels: { dangerous: string; moderate: string; safe: string }): { color: string; softBg: string; label: string } {
    if (r === 'dangerous') return { color: '#f5222d', softBg: 'rgba(245,34,45,0.10)', label: labels.dangerous }
    if (r === 'moderate') return { color: '#fa8c16', softBg: 'rgba(250,140,22,0.12)', label: labels.moderate }
    return { color: '#1677ff', softBg: 'rgba(22,119,255,0.10)', label: labels.safe }
}

/** 代码预览区默认展开的行数，超出部分折叠为「… N 个隐藏的行」 */
const MAX_VISIBLE_LINES = 6

export default function CommandApproval({ approvalId, command, riskLevel, agent, onApprove, onReject, onTrust: _onTrust, darkMode }: Props) {
    const { token } = theme.useToken()
    const loc = useAgentLocale()
    const [resolved, setResolved] = useState(false)
    const [expanded, setExpanded] = useState(false)

    const parsed = useMemo(() => parseApproval(command), [command])
    const risk = riskMeta(riskLevel, {
        dangerous: loc.approval.riskLevelDangerous,
        moderate: loc.approval.riskLevelModerate,
        safe: loc.approval.riskLevelSafe,
    })

    const lines = useMemo(() => parsed.display.split('\n'), [parsed.display])
    const isLong = lines.length > MAX_VISIBLE_LINES
    const visibleLines = isLong && !expanded ? lines.slice(0, MAX_VISIBLE_LINES) : lines
    const hiddenCount = lines.length - visibleLines.length

    if (resolved) return null

    // VSCode 风格对话框文案：命令 / 文件 / 工具 三类标题与描述
    const title = parsed.kind === 'command' ? loc.approval.commandTitle
        : parsed.kind === 'file' ? loc.approval.fileTitle
        : loc.approval.toolTitle
    const desc = parsed.kind === 'command' ? loc.approval.commandDesc
        : parsed.kind === 'file' ? loc.approval.fileDesc
        : loc.approval.toolDesc
    const badge = parsed.filePath ? languageBadge(parsed.filePath) : ''

    // 代码预览区：模仿 VSCode 编辑器（深色 #1e1e1e / 浅色 #f6f8fa）
    const codeBg = darkMode ? '#1e1e1e' : '#f6f8fa'
    const codeBorder = darkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'
    const gutterColor = darkMode ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.35)'
    const codeColor = darkMode ? '#d4d4d4' : '#24292f'
    const promptColor = darkMode ? '#6A9955' : '#008000'

    return (
        <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8, marginBottom: 8, background: token.colorBgContainer, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {/* 头部：风险图标 + 标题 + 风险徽章 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                {riskLevel === 'dangerous'
                    ? <ExclamationCircleOutlined style={{ color: risk.color, fontSize: 15 }} />
                    : <SafetyOutlined style={{ color: risk.color, fontSize: 15 }} />}
                {agent && <span style={{ fontSize: 11, color: token.colorPrimary, background: token.colorPrimaryBg, borderRadius: 4, padding: '1px 6px', lineHeight: '18px', flexShrink: 0 }}>[{agent}]</span>}
                <span style={{ fontSize: 13.5, fontWeight: 600, color: token.colorText }}>{title}</span>
                <div style={{ flex: 1 }} />
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 500, color: risk.color, background: risk.softBg, borderRadius: 10, padding: '1px 8px', lineHeight: '18px' }}>{risk.label}</span>
            </div>

            {/* 主体：描述 + 文件路径行 + 代码预览 */}
            <div style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: 12.5, color: token.colorTextSecondary, marginBottom: parsed.kind === 'file' && parsed.filePath ? 8 : 10, lineHeight: 1.6 }}>{desc}</div>

                {parsed.kind === 'file' && parsed.filePath && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, fontFamily: "'Cascadia Code','Consolas',monospace", color: token.colorText }}>
                        <FileTextOutlined style={{ color: token.colorPrimary, flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={parsed.filePath}>{parsed.filePath}</span>
                        {badge && (
                            <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: '0 6px', borderRadius: 4, border: `1px solid ${token.colorBorder}`, color: token.colorTextSecondary, lineHeight: '16px' }}>{badge}</span>
                        )}
                    </div>
                )}

                <div style={{ background: codeBg, border: `1px solid ${codeBorder}`, borderRadius: 6, fontFamily: "'Cascadia Code','Consolas',monospace", fontSize: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '6px 0' }}>
                        {visibleLines.map((ln, i) => (
                            <div key={i} style={{ display: 'flex', lineHeight: '19px' }}>
                                <span style={{ width: 34, flexShrink: 0, textAlign: 'right', paddingRight: 10, color: gutterColor, userSelect: 'none', fontSize: 11 }}>{i + 1}</span>
                                <span style={{ color: codeColor, whiteSpace: 'pre-wrap', wordBreak: 'break-all', paddingRight: 10 }}>
                                    {parsed.kind === 'command' && i === 0 && <span style={{ color: promptColor, fontWeight: 600, marginRight: 6 }}>$</span>}
                                    {ln || ' '}
                                </span>
                            </div>
                        ))}
                    </div>
                    {isLong && (
                        <div
                            onClick={() => setExpanded(v => !v)}
                            style={{ cursor: 'pointer', padding: '4px 12px', fontSize: 11.5, color: token.colorPrimary, borderTop: `1px solid ${codeBorder}`, background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', userSelect: 'none' }}
                        >
                            {expanded ? loc.approval.collapse : `… ${hiddenCount} ${loc.approval.hiddenLines}`}
                        </div>
                    )}
                </div>
            </div>

            {/* 底部操作区：跳过（次要）+ 允许（主要，危险级别用红色） */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 14px', borderTop: `1px solid ${token.colorBorderSecondary}`, background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                <Button size="small" icon={<CloseOutlined />} onClick={() => { setResolved(true); onReject(approvalId) }}>{loc.approval.skipButton}</Button>
                <Button size="small" type="primary" danger={riskLevel === 'dangerous'} icon={<CheckOutlined />} onClick={() => { setResolved(true); onApprove(approvalId) }}>{loc.approval.allowButton}</Button>
            </div>
        </div>
    )
}
