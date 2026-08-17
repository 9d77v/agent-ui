/**
 * 工具调用类型化渲染：按语义归类（文件/搜索/命令/技能/网络/记忆/子代理/规划/审批），
 * 为每类定义「折叠态摘要 + 展开态类型化详情」，长输出统一 FoldedOutput 折叠统计，
 * 状态分色遵循四类反馈（status/completion/warning/error）：成功输出用正文色绝不红色，
 * 仅 success=false 用 error 色；截断/部分展示用 warning 色提示。
 * 文件/搜索类结果行支持 onFileClick 点击打开文件。
 */
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Typography, theme } from 'antd'
import {
    FileTextOutlined, SaveOutlined, EditOutlined, FileSearchOutlined, SearchOutlined,
    FolderOutlined, ConsoleSqlOutlined, CodeOutlined, ApiOutlined, ThunderboltOutlined,
    LinkOutlined, DatabaseOutlined, QuestionCircleOutlined, DeploymentUnitOutlined,
    FileSyncOutlined, FileImageOutlined, RobotOutlined, PauseCircleOutlined, PlayCircleOutlined,
    SendOutlined, StopOutlined, UnorderedListOutlined, HourglassOutlined, CheckSquareOutlined,
    OrderedListOutlined, SafetyOutlined, ExperimentOutlined, ToolOutlined,
} from '@ant-design/icons'
import { useAgentLocale } from './locale/index'
import type { ToolViewItem } from './types'

const { Text } = Typography

const MONO_FONT = "'Cascadia Code',Consolas,monospace"

/** 主题 token 类型（跟随 antd 版本自动推导） */
type ThemeToken = ReturnType<typeof theme.useToken>['token']

/** 工具语义分类 */
export type ToolCategory = 'file' | 'search' | 'command' | 'skill' | 'web' | 'memory' | 'subagent' | 'plan' | 'approval' | 'other'

/** renderToolBody 渲染上下文 */
export interface ToolRenderContext {
    /** 点击文件/搜索结果行打开文件 */
    onFileClick?: (path: string) => void
    /** 子代理交接按钮回调 */
    onHandoff?: (label: string, prompt: string) => void
    token: ThemeToken
    darkMode?: boolean
    /** 当前 locale（保留位，供渲染器按需读取） */
    loc?: ReturnType<typeof useAgentLocale>
}

/** 工具 → 语义分类 */
export function toolCategory(name: string): ToolCategory {
    switch (name) {
        case 'read_file':
        case 'write_file':
        case 'edit_file':
            return 'file'
        case 'file_search':
        case 'grep_search':
        case 'list_dir':
            return 'search'
        case 'run_command':
        case 'get_errors':
        case 'get_symbols':
        case 'lsp_code_action':
            return 'command'
        case 'run_skill':
            return 'skill'
        case 'web_fetch':
            return 'web'
        case 'memory':
            return 'memory'
        case 'run_subagent':
        case 'agent_suspend':
        case 'agent_resume':
        case 'agent_send':
        case 'agent_terminate':
        case 'agent_list':
        case 'agent_wait':
            return 'subagent'
        case 'todo':
        case 'seed_plan_todos':
        case 'auto_verify':
            return 'plan'
        case 'approve_subagent_ops':
        case 'check_approval':
        case 'adk_request_confirmation':
            return 'approval'
        default:
            return 'other'
    }
}

/** 工具图标色（全部来自 AntD 主题 token，适配亮/暗色） */
export function toolColor(name: string, token: ThemeToken): string {
    switch (name) {
        case 'write_file':
        case 'agent_resume':
        case 'approve_subagent_ops':
            return token.colorSuccess
        case 'get_errors':
        case 'run_skill':
        case 'agent_suspend':
        case 'ask_user':
        case 'auto_verify':
        case 'check_approval':
        case 'adk_request_confirmation':
            return token.colorWarning
        case 'agent_terminate':
            return token.colorError
        case 'file_search':
        case 'grep_search':
        case 'list_dir':
        case 'memory':
        case 'resolveMemoryFileUri':
        case 'load_artifacts':
        case 'agent_list':
        case 'agent_wait':
            return token.colorInfo
        default:
            return token.colorPrimary
    }
}

/** 工具图标（覆盖全部工具，回退通用 ToolOutlined） */
export function toolIcon(name: string, token: ThemeToken): ReactNode {
    const style = { color: toolColor(name, token), fontSize: 13 }
    switch (name) {
        case 'read_file': return <FileTextOutlined style={style} />
        case 'write_file': return <SaveOutlined style={style} />
        case 'edit_file': return <EditOutlined style={style} />
        case 'file_search': return <FileSearchOutlined style={style} />
        case 'grep_search': return <SearchOutlined style={style} />
        case 'list_dir': return <FolderOutlined style={style} />
        case 'run_command': return <ConsoleSqlOutlined style={style} />
        case 'get_errors': return <CodeOutlined style={style} />
        case 'get_symbols': return <CodeOutlined style={style} />
        case 'lsp_code_action': return <ApiOutlined style={style} />
        case 'run_skill': return <ThunderboltOutlined style={style} />
        case 'web_fetch': return <LinkOutlined style={style} />
        case 'memory': return <DatabaseOutlined style={style} />
        case 'ask_user': return <QuestionCircleOutlined style={style} />
        case 'newWorkspace': return <DeploymentUnitOutlined style={style} />
        case 'resolveMemoryFileUri': return <FileSyncOutlined style={style} />
        case 'load_artifacts': return <FileImageOutlined style={style} />
        case 'run_subagent': return <RobotOutlined style={style} />
        case 'agent_suspend': return <PauseCircleOutlined style={style} />
        case 'agent_resume': return <PlayCircleOutlined style={style} />
        case 'agent_send': return <SendOutlined style={style} />
        case 'agent_terminate': return <StopOutlined style={style} />
        case 'agent_list': return <UnorderedListOutlined style={style} />
        case 'agent_wait': return <HourglassOutlined style={style} />
        case 'todo': return <CheckSquareOutlined style={style} />
        case 'seed_plan_todos': return <OrderedListOutlined style={style} />
        case 'approve_subagent_ops': return <SafetyOutlined style={style} />
        case 'auto_verify': return <ExperimentOutlined style={style} />
        case 'check_approval': return <SafetyOutlined style={style} />
        case 'adk_request_confirmation': return <SafetyOutlined style={style} />
        default: return <ToolOutlined style={style} />
    }
}

/** 工具显示名（优先宿主注入的 displayNames） */
export function toolLabel(name: string, displayNames?: Record<string, string>): string {
    return displayNames?.[name] || name
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function parseArgs(args?: string): any {
    if (!args) return null
    try { return JSON.parse(args) } catch { return null }
}

function truncate(s: string, n: number): string {
    if (!s) return ''
    return s.length > n ? s.slice(0, n) + '…' : s
}

/** 判断字符串是否为 JSON 片段（{ 或 [ 开头） */
function isJsonish(s: string): boolean {
    const t = (s || '').trim()
    return t.startsWith('{') || t.startsWith('[')
}

/** 摘要取用：JSON 不进摘要（避免截成残片），仅普通文本截断 */
function smartSummary(output: string | undefined, fallback: string, max = 80): string {
    if (!output) return fallback
    return isJsonish(output) ? fallback : truncate(output, max)
}

/** 长 id 压缩展示：agent_xxx… */
function shortId(id: string): string {
    if (!id) return ''
    return id.length > 12 ? id.slice(0, 8) + '…' : id
}

/** 子代理状态徽标色 */
function statusColor(status: string, token: ThemeToken): string {
    switch (status) {
        case 'done':
        case 'completed':
            return token.colorSuccess
        case 'failed':
        case 'error':
        case 'terminated':
            return token.colorError
        case 'running':
        case 'queued':
        case 'executing':
            return token.colorPrimary
        default:
            return token.colorTextSecondary
    }
}

/** 审批风险级别可读文案 */
function riskLabel(risk: string): string {
    switch (risk) {
        case 'dangerous': return '危险'
        case 'moderate': return '中等'
        case 'safe': return '安全'
        default: return risk
    }
}

/** 审批风险级别徽标色 */
function riskColor(risk: string, token: ThemeToken): string {
    switch (risk) {
        case 'dangerous': return token.colorError
        case 'moderate': return token.colorWarning
        case 'safe': return token.colorSuccess
        default: return token.colorTextSecondary
    }
}

function tailLines(text: string, n: number): string {
    const lines = text.split('\n')
    return lines.length > n ? lines.slice(lines.length - n).join('\n') : text
}

/** diff 行级统计 +N/-N（跳过 --- / +++ 头） */
function diffStats(diff?: string): string {
    if (!diff) return ''
    let add = 0
    let del = 0
    for (const line of diff.split('\n')) {
        if (line.startsWith('+++') || line.startsWith('---')) continue
        if (line.startsWith('+')) add++
        else if (line.startsWith('-')) del++
    }
    if (add === 0 && del === 0) return ''
    return `+${add}/-${del}`
}

/** 从 output（「找到 N 个文件:\n- a\n- b」）解析列表 */
function parseListFromOutput(output?: string): string[] {
    if (!output) return []
    return output.split('\n')
        .map(l => l.trim())
        .filter(l => /^[-*] /.test(l))
        .map(l => l.replace(/^[-*] /, ''))
        .filter(Boolean)
}

/** 从 output 解析 grep 行（file:line: content） */
function parseGrepFromOutput(output?: string): any[] {
    if (!output) return []
    const rows: any[] = []
    for (const line of output.split('\n')) {
        const m = /^([^:]+):(\d+):(.*)$/.exec(line.trim())
        if (m) rows.push({ file: m[1], line: Number(m[2]), content: m[3] })
    }
    return rows
}

/** 从 output 解析目录条目（目录行以 / 结尾） */
function parseDirFromOutput(output?: string): any[] {
    if (!output) return []
    return output.split('\n').map(l => l.trim()).filter(Boolean).map(l => ({
        name: l.replace(/\/$/, ''),
        is_dir: l.endsWith('/'),
    }))
}

// ---------------------------------------------------------------------------
// 一句话摘要（折叠态头部展示，扫读不展开也能看懂做了什么）
// ---------------------------------------------------------------------------

export function toolSummary(tool: ToolViewItem): string {
    const args = parseArgs(tool.args)
    const r: any = tool.result
    const ok = r?.success !== false
    switch (tool.name) {
        case 'read_file': {
            const path = args?.path || ''
            const range = args?.startLine ? `${args.startLine}${args?.endLine ? '-' + args.endLine : ''}` : ''
            const lines = typeof r?.data?.lines === 'number' ? r.data.lines : 0
            return `${path}${range ? ':' + range : ''}${lines > 0 ? ` · ${lines} 行` : ''}`
        }
        case 'write_file': {
            const path = args?.path || ''
            if (!ok) return path
            if (r?.file_exists === false) return `${path} · 新建文件`
            const stats = diffStats(r?.diff)
            return stats ? `${path} · ${stats}` : path
        }
        case 'edit_file': {
            const path = args?.path || ''
            const applied = r?.data?.edits_applied
            const failed = r?.data?.failed_edits
            let s = path
            if (typeof applied === 'number') s += ` · 应用 ${applied} 处编辑`
            if (typeof failed === 'number' && failed > 0) s += ` · ${failed} 失败`
            return s
        }
        case 'file_search': {
            const glob = args?.glob || ''
            const n = Array.isArray(r?.data) ? r.data.length : undefined
            return `${glob}${typeof n === 'number' ? ` · 找到 ${n} 个文件` : ''}`
        }
        case 'grep_search': {
            const q = args?.query || ''
            const n = Array.isArray(r?.data) ? r.data.length : undefined
            return `${q}${typeof n === 'number' ? ` · 找到 ${n} 个匹配` : ''}`
        }
        case 'list_dir': {
            const path = args?.path || ''
            const n = Array.isArray(r?.data) ? r.data.length : undefined
            return `${path}${typeof n === 'number' ? ` · ${n} 项` : ''}`
        }
        case 'run_command': {
            const cmd = args?.command || ''
            return cmd ? '$ ' + truncate(cmd, 80) : truncate(r?.error || '', 80)
        }
        case 'get_errors': {
            const n = Array.isArray(r?.data) ? r.data.length : undefined
            return typeof n === 'number' ? `找到 ${n} 个错误/警告` : smartSummary(r?.output, '', 60)
        }
        case 'get_symbols': {
            const q = args?.query || ''
            const n = Array.isArray(r?.data) ? r.data.length : undefined
            return `${q}${typeof n === 'number' ? ` · ${n} 个符号` : ''}`
        }
        case 'lsp_code_action': {
            const path = args?.filePath || ''
            return path || smartSummary(r?.output, '', 60)
        }
        case 'run_skill': {
            const name = args?.name || r?.data?.name || ''
            return name
        }
        case 'web_fetch': {
            const url = args?.url || ''
            const size = (r?.output || '').length
            return `${url}${size > 0 ? ` · ${size} 字符` : ''}`
        }
        case 'memory': {
            const action = args?.action || ''
            const path = args?.path || ''
            if (action === 'save') return `保存 ${path}`
            if (action === 'view') return `查看 ${path}`
            return `${action} ${path}`.trim()
        }
        case 'ask_user': {
            const n = Array.isArray(r?.data?.questions) ? r.data.questions.length : (Array.isArray(args?.questions) ? args.questions.length : 0)
            return `等待用户回答 ${n} 个问题`
        }
        case 'newWorkspace': {
            const q = args?.query || ''
            return q || smartSummary(r?.output, '', 60)
        }
        case 'resolveMemoryFileUri': {
            return args?.path || ''
        }
        case 'load_artifacts': {
            const names = Array.isArray(r?.artifact_names) ? r.artifact_names : []
            return names.length > 0 ? `${names.length} 个附件` : ''
        }
        case 'run_subagent': {
            const agent = args?.agent || ''
            const mode = r?.data?.mode === 'resident' ? '常驻' : (r?.data?.mode ? '一次性' : '')
            const status = tool.status === 'done' ? '完成' : tool.status === 'error' ? '失败' : '执行中'
            return [agent, mode, status].filter(Boolean).join(' · ')
        }
        case 'agent_suspend':
        case 'agent_resume':
        case 'agent_send':
        case 'agent_terminate': {
            return args?.agent_id ? shortId(args.agent_id) : ''
        }
        case 'agent_list': {
            const n = Array.isArray(r?.data) ? r.data.length : undefined
            return typeof n === 'number' ? `${n} 个子代理` : smartSummary(r?.output, '', 60)
        }
        case 'agent_wait': {
            const name = r?.data?.agent_name || ''
            const id = args?.agent_id || ''
            const timeout = args?.timeout || 120
            const who = name || (id ? shortId(id) : '')
            return [who, `超时 ${timeout}s`].filter(Boolean).join(' · ')
        }
        case 'todo': {
            const mode = args?.mode || ''
            return `todo · ${mode}`.trim()
        }
        case 'seed_plan_todos': {
            const m = /播种\s*(\d+)\s*项/.exec(r?.output || '')
            return m ? `${m[1]} 项待办` : smartSummary(r?.output, '', 60)
        }
        case 'approve_subagent_ops': {
            const n = Array.isArray(args?.ops) ? args.ops.length : 0
            return `${n} 项审批`
        }
        case 'auto_verify': {
            return smartSummary(r?.output, '', 60)
        }
        case 'check_approval': {
            if (!ok) return r?.error || '需审批'
            if (typeof r?.output !== 'string') return ''
            try {
                const approved = JSON.parse(r.output)?.approved
                return approved === true ? '已放行' : '需审批'
            } catch {
                return ''
            }
        }
        default: {
            // 对 JSON 输出（如 MCP 工具）给可读回退，避免空摘要
            if (isJsonish(r?.output || '')) return tool.name ? `执行 ${tool.name}` : ''
            return smartSummary(r?.output || r?.error, '', 80)
        }
    }
}

// ---------------------------------------------------------------------------
// 共享展示组件
// ---------------------------------------------------------------------------

/** prefers-reduced-motion：true 时静态切换（无过渡） */
function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false)
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
        setReduced(mq.matches)
        const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
        mq.addEventListener?.('change', handler)
        return () => mq.removeEventListener?.('change', handler)
    }, [])
    return reduced
}

/** 长输出折叠：默认前 maxLines（20）行 + 行数统计 + 展开全部/收起；尊重 prefers-reduced-motion */
export function FoldedOutput({ text, color, maxLines = 20, darkMode }: { text?: string; color?: string; maxLines?: number; darkMode?: boolean }) {
    const { token } = theme.useToken()
    const reduced = usePrefersReducedMotion()
    const [expanded, setExpanded] = useState(false)
    const content = text || ''
    const lines = useMemo(() => content.split('\n'), [content])
    const total = lines.length
    const folded = total > maxLines
    const shown = folded && !expanded ? lines.slice(0, maxLines).join('\n') : content
    return (
        <div style={{ marginTop: 4 }}>
            <pre style={{
                margin: 0, padding: '6px 8px', background: token.colorFillContent, borderRadius: 4,
                fontSize: 11, lineHeight: 1.5, color: color || token.colorText, overflow: 'auto',
                maxHeight: expanded ? undefined : 300, fontFamily: MONO_FONT, whiteSpace: 'pre-wrap',
                wordBreak: 'break-all', transition: reduced ? 'none' : 'opacity 0.15s ease',
            }}>
                {shown}
            </pre>
            {folded && (
                <div style={{ marginTop: 2 }}>
                    <Button size="small" type="link" style={{ fontSize: 11, padding: 0, height: 'auto' }} onClick={() => setExpanded(!expanded)}>
                        {expanded ? `收起（共 ${total} 行）` : `展开全部（共 ${total} 行）`}
                    </Button>
                </div>
            )}
        </div>
    )
}

/** 行级列表折叠（grep / 错误 / 目录 / 子代理步骤等结构化行） */
function FoldedList({ rows, maxRows = 20, renderRow }: { rows: any[]; maxRows?: number; renderRow: (row: any, index: number) => ReactNode }) {
    const [expanded, setExpanded] = useState(false)
    if (rows.length === 0) return null
    const folded = rows.length > maxRows
    const shown = folded && !expanded ? rows.slice(0, maxRows) : rows
    return (
        <div style={{ marginTop: 4 }}>
            {shown.map((row, i) => <div key={i}>{renderRow(row, i)}</div>)}
            {folded && (
                <Button size="small" type="link" style={{ fontSize: 11, padding: 0, height: 'auto' }} onClick={() => setExpanded(!expanded)}>
                    {expanded ? `收起（共 ${rows.length} 条）` : `展开全部（共 ${rows.length} 条）`}
                </Button>
            )}
        </div>
    )
}

/** 可点击路径（onFileClick(path)） */
function ClickablePath({ path, onFileClick, token }: { path: string; onFileClick?: (p: string) => void; token: ThemeToken }) {
    if (!onFileClick || !path) return <Text style={{ fontSize: 12, color: token.colorText }}>{path}</Text>
    return (
        <Text
            style={{ fontSize: 12, color: token.colorLink, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
            onClick={(e) => { e.stopPropagation(); onFileClick(path) }}
        >
            {path}
        </Text>
    )
}

/** diff 视图（+/− 着色，正文色其余行） */
function DiffView({ diff, token }: { diff: string; token: ThemeToken }) {
    if (!diff) return null
    return (
        <pre style={{
            margin: '4px 0 0', padding: '6px 8px', background: token.colorFillContent, borderRadius: 4,
            fontSize: 11, lineHeight: 1.5, overflow: 'auto', maxHeight: 240, fontFamily: MONO_FONT,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
            {diff.split('\n').map((line, i) => {
                let color = token.colorText
                if (line.startsWith('+')) color = token.colorSuccess
                else if (line.startsWith('-')) color = token.colorError
                return <div key={i} style={{ color }}>{line || '\u00A0'}</div>
            })}
        </pre>
    )
}

// ---------------------------------------------------------------------------
// 各工具展开态渲染
// ---------------------------------------------------------------------------

function renderReadFile(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const args = parseArgs(tool.args)
    const r: any = tool.result
    const path = args?.path || ''
    const start = args?.startLine
    const end = args?.endLine
    const data = r?.data
    const content = typeof data?.content === 'string' ? data.content : (typeof r?.output === 'string' ? r.output : '')
    const lines = typeof data?.lines === 'number' ? data.lines : 0
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <ClickablePath path={path} onFileClick={ctx.onFileClick} token={ctx.token} />
                {(start || end) && <Text type="secondary" style={{ fontSize: 11 }}>{start}-{end ?? ''}</Text>}
                {lines > 0 && <Text type="secondary" style={{ fontSize: 11 }}>{lines} 行</Text>}
            </div>
            <FoldedOutput text={content} color={ctx.token.colorText} darkMode={ctx.darkMode} />
        </div>
    )
}

function renderWriteFile(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const args = parseArgs(tool.args)
    const r: any = tool.result
    const path = args?.path || ''
    const diff = r?.diff
    const isNew = r?.file_exists === false
    return (
        <div>
            <ClickablePath path={path} onFileClick={ctx.onFileClick} token={ctx.token} />
            {diff ? <DiffView diff={diff} token={ctx.token} /> : null}
            <Text style={{ fontSize: 11, color: ctx.token.colorText, display: 'block', marginTop: diff ? 4 : 0 }}>
                {isNew ? '新建文件' : '文件已写入'}
            </Text>
        </div>
    )
}

function renderEditFile(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const args = parseArgs(tool.args)
    const r: any = tool.result
    const path = args?.path || ''
    const diff = r?.diff
    const applied = r?.data?.edits_applied
    const failed = r?.data?.failed_edits
    return (
        <div>
            <ClickablePath path={path} onFileClick={ctx.onFileClick} token={ctx.token} />
            {diff ? <DiffView diff={diff} token={ctx.token} /> : (
                <Text style={{ fontSize: 11, color: ctx.token.colorText }}>
                    {typeof applied === 'number' ? `已应用 ${applied} 处编辑${typeof failed === 'number' && failed > 0 ? `（${failed} 失败）` : ''}` : '已应用编辑'}
                </Text>
            )}
        </div>
    )
}

function renderFileSearch(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const r: any = tool.result
    const onFileClick = ctx.onFileClick
    const files: string[] = Array.isArray(r?.data) ? r.data.map((f: any) => String(f)) : parseListFromOutput(r?.output)
    if (files.length === 0) return <Text type="secondary" style={{ fontSize: 11 }}>未找到文件</Text>
    return (
        <div style={{ maxHeight: 240, overflow: 'auto', marginTop: 4 }}>
            {files.map((f, i) => (
                <div key={i} onClick={onFileClick ? () => onFileClick(f) : undefined}
                    style={{
                        fontSize: 11, padding: '1px 0', lineHeight: 1.6,
                        color: onFileClick ? ctx.token.colorLink : ctx.token.colorText,
                        cursor: onFileClick ? 'pointer' : 'default',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: MONO_FONT,
                    }}>
                    {f}
                </div>
            ))}
        </div>
    )
}

function renderGrepSearch(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const r: any = tool.result
    const onFileClick = ctx.onFileClick
    const rows = Array.isArray(r?.data) ? r.data : parseGrepFromOutput(r?.output)
    if (rows.length === 0) return <Text type="secondary" style={{ fontSize: 11 }}>未找到匹配</Text>
    return (
        <FoldedList rows={rows} renderRow={(row, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, fontSize: 11, lineHeight: 1.6, fontFamily: MONO_FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                <span
                    onClick={onFileClick && row.file ? () => onFileClick(row.file) : undefined}
                    style={{
                        color: onFileClick && row.file ? ctx.token.colorLink : ctx.token.colorTextSecondary,
                        cursor: onFileClick && row.file ? 'pointer' : 'default',
                        flexShrink: 0, textDecoration: onFileClick && row.file ? 'underline' : 'none', textUnderlineOffset: 2,
                    }}>
                    {row.file}{row.line != null ? ':' + row.line + ':' : ''}
                </span>
                <span style={{ color: ctx.token.colorText }}>{row.content}</span>
            </div>
        )} />
    )
}

function renderListDir(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const r: any = tool.result
    const entries = Array.isArray(r?.data) ? r.data : parseDirFromOutput(r?.output)
    return (
        <FoldedList rows={entries} renderRow={(e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, lineHeight: 1.6 }}>
                {e.is_dir
                    ? <FolderOutlined style={{ color: ctx.token.colorInfo, fontSize: 12 }} />
                    : <FileTextOutlined style={{ color: ctx.token.colorTextTertiary, fontSize: 12 }} />}
                <span style={{ color: e.is_dir ? ctx.token.colorText : ctx.token.colorTextSecondary }}>{e.name}</span>
            </div>
        )} />
    )
}

function renderRunCommand(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const r: any = tool.result
    const ok = r?.success !== false
    const out = typeof r?.output === 'string' ? r.output : ''
    const err = typeof r?.error === 'string' ? r.error : ''
    if (ok) {
        return out
            ? <FoldedOutput text={out} color={ctx.token.colorText} darkMode={ctx.darkMode} />
            : <Text type="secondary" style={{ fontSize: 11 }}>命令执行成功</Text>
    }
    return (
        <div>
            {err && <Text style={{ fontSize: 11, color: ctx.token.colorError, display: 'block', marginBottom: 4 }}>{err}</Text>}
            {out && <FoldedOutput text={tailLines(out, 20)} color={ctx.token.colorText} darkMode={ctx.darkMode} />}
        </div>
    )
}

function renderGetErrors(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const r: any = tool.result
    const rows = Array.isArray(r?.data) ? r.data : []
    if (rows.length === 0) {
        const text = r?.output || r?.error || ''
        return text ? <FoldedOutput text={text} color={ctx.token.colorText} darkMode={ctx.darkMode} /> : null
    }
    const onFileClick = ctx.onFileClick
    return (
        <FoldedList rows={rows} renderRow={(e, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, fontSize: 11, lineHeight: 1.6, fontFamily: MONO_FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                <span
                    onClick={onFileClick && e.file ? () => onFileClick(e.file) : undefined}
                    style={{ color: onFileClick && e.file ? ctx.token.colorLink : ctx.token.colorTextSecondary, cursor: onFileClick && e.file ? 'pointer' : 'default', flexShrink: 0, textDecoration: onFileClick && e.file ? 'underline' : 'none', textUnderlineOffset: 2 }}
                >
                    {e.file}{e.line != null ? ':' + e.line : ''}{e.column != null ? ':' + e.column : ''}
                </span>
                <span style={{ color: e.severity === 'warning' ? ctx.token.colorWarning : ctx.token.colorError }}>{e.severity || 'error'}: {e.message}</span>
            </div>
        )} />
    )
}

function renderGetSymbols(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const r: any = tool.result
    const rows = Array.isArray(r?.data) ? r.data : []
    if (rows.length === 0) {
        const text = r?.output || ''
        return text ? <FoldedOutput text={text} color={ctx.token.colorText} darkMode={ctx.darkMode} /> : null
    }
    const onFileClick = ctx.onFileClick
    return (
        <FoldedList rows={rows} renderRow={(e, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'baseline', fontSize: 11, lineHeight: 1.6, fontFamily: MONO_FONT, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                <span style={{ color: ctx.token.colorText, flexShrink: 0 }}>{e.name || ''} <Text type="secondary" style={{ fontSize: 10 }}>({e.kind_name || 'symbol'})</Text></span>
                {e.start_line != null && <span style={{ color: ctx.token.colorTextTertiary, flexShrink: 0 }}>L{e.start_line + 1}</span>}
                {e.file && (
                    <span onClick={onFileClick ? () => onFileClick(e.file) : undefined}
                        style={{ color: onFileClick ? ctx.token.colorLink : ctx.token.colorTextTertiary, cursor: onFileClick ? 'pointer' : 'default', textDecoration: onFileClick ? 'underline' : 'none', textUnderlineOffset: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.file}
                    </span>
                )}
            </div>
        )} />
    )
}

function renderLspCodeAction(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const r: any = tool.result
    const text = r?.output || r?.error || '已应用修复'
    return <Text style={{ fontSize: 11, color: ctx.token.colorText }}>{text}</Text>
}

function renderRunSkill(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const args = parseArgs(tool.args)
    const r: any = tool.result
    const name = args?.name || r?.data?.name || ''
    const argument = args?.argument || ''
    return (
        <div>
            <Text style={{ fontSize: 12, color: ctx.token.colorText, fontWeight: 500 }}>{name}</Text>
            {argument && <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>{argument}</Text>}
        </div>
    )
}

function renderWebFetch(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const r: any = tool.result
    const text = r?.output || ''
    return text ? <FoldedOutput text={text} color={ctx.token.colorText} darkMode={ctx.darkMode} /> : null
}

function renderMemory(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const args = parseArgs(tool.args)
    const r: any = tool.result
    const action = args?.action || ''
    if (action === 'save') {
        return <Text style={{ fontSize: 11, color: ctx.token.colorText }}>{r?.output || `记忆已保存: ${args?.path || ''}`}</Text>
    }
    const text = r?.output || ''
    return text ? <FoldedOutput text={text} color={ctx.token.colorText} darkMode={ctx.darkMode} /> : null
}

function renderAskQuestions(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const r: any = tool.result
    const questions = Array.isArray(r?.data?.questions) ? r.data.questions : (Array.isArray(r?.data) ? r.data : [])
    if (questions.length === 0) return <Text type="secondary" style={{ fontSize: 11 }}>{r?.output || '等待用户回答'}</Text>
    return (
        <FoldedList rows={questions} renderRow={(q, i) => (
            <div key={i} style={{ fontSize: 11, color: ctx.token.colorText, marginBottom: 2 }}>
                <Text strong style={{ fontSize: 11 }}>{i + 1}. {q?.question || q?.header || ''}</Text>
                {Array.isArray(q?.options) && q.options.length > 0 && (
                    <Text type="secondary" style={{ fontSize: 11 }}>（{q.options.join(' / ')}）</Text>
                )}
            </div>
        )} />
    )
}

function renderRunSubagent(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const r: any = tool.result
    let sub: any = r?.data
    if (typeof sub === 'string') { try { sub = JSON.parse(sub) } catch { sub = null } }
    const agentID = sub?.agent_id || ''
    const summary = sub?.completion_summary || ''
    const steps = Array.isArray(sub?.history) ? sub.history : []
    const handoffs = Array.isArray(sub?.handoffs) ? sub.handoffs : []
    if (!agentID && !summary && steps.length === 0 && handoffs.length === 0) {
        const text = r?.output || r?.error || ''
        return text ? <Text style={{ fontSize: 11, color: ctx.token.colorText }}>{text}</Text> : null
    }
    return (
        <div>
            {agentID && (
                <div style={{ marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>agent_id: </Text>
                    <Text style={{ fontSize: 11, color: ctx.token.colorText, fontFamily: MONO_FONT }}>{agentID}</Text>
                </div>
            )}
            {summary && <div style={{ marginBottom: 4 }}><FoldedOutput text={summary} color={ctx.token.colorText} darkMode={ctx.darkMode} maxLines={5} /></div>}
            {steps.length > 0 && (
                <FoldedList rows={steps} renderRow={(s, i) => (
                    <div key={i} style={{ padding: '4px 8px', background: ctx.token.colorFillContent, borderRadius: 4, border: `1px solid ${ctx.token.colorBorderSecondary}`, marginBottom: 4 }}>
                        <Text style={{ fontSize: 11, color: ctx.token.colorText }}>{i + 1}. {s.tool}</Text>
                        {s.args ? <FoldedOutput text={typeof s.args === 'string' ? s.args : JSON.stringify(s.args)} color={ctx.token.colorTextTertiary} darkMode={ctx.darkMode} maxLines={5} /> : null}
                        {s.output ? <FoldedOutput text={typeof s.output === 'string' ? s.output : JSON.stringify(s.output)} color={ctx.token.colorText} darkMode={ctx.darkMode} maxLines={5} /> : null}
                    </div>
                )} />
            )}
            {handoffs.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {handoffs.map((h: any, i: number) => (
                        <Button key={i} size="small" type="primary" ghost onClick={() => ctx.onHandoff?.(h.label || '交接', h.prompt || h.label || '')}>
                            {h.label || '交接'}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    )
}

function renderAgentOp(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const r: any = tool.result
    const text = r?.output || r?.error || '操作成功'
    return <Text style={{ fontSize: 11, color: ctx.token.colorText }}>{text}</Text>
}

function renderAgentList(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const r: any = tool.result
    const rows = Array.isArray(r?.data) ? r.data : []
    if (rows.length === 0) {
        const text = r?.output || ''
        return text ? <FoldedOutput text={text} color={ctx.token.colorText} darkMode={ctx.darkMode} maxLines={10} /> : null
    }
    return (
        <FoldedList rows={rows} renderRow={(v, i) => (
            <div key={i} style={{ marginBottom: 4, padding: '4px 8px', background: ctx.token.colorFillContent, borderRadius: 4, border: `1px solid ${ctx.token.colorBorderSecondary}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 11, color: ctx.token.colorText, fontWeight: 500 }}>{v.name}</Text>
                    <Text type="secondary" style={{ fontSize: 11, fontFamily: MONO_FONT }}>{v.agent_id}</Text>
                    <span style={{ fontSize: 10, padding: '0 6px', borderRadius: 8, color: statusColor(v.status, ctx.token), border: `1px solid ${statusColor(v.status, ctx.token)}` }}>{v.status}</span>
                </div>
                {v.completion_summary && <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>{v.completion_summary}</Text>}
                {v.task && <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>{v.task}</Text>}
            </div>
        )} />
    )
}

function renderAgentWait(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const args = parseArgs(tool.args)
    const r: any = tool.result
    const ok = r?.success !== false
    const name = r?.data?.agent_name || ''
    const id = args?.agent_id || ''
    const sub = r?.data?.result
    // 失败：优先 error 文案（含 Wait 超时路径 data.error）；成功：优先 result.summary / output
    const failText = typeof r?.data?.error === 'string' ? r.data.error : (r?.error || '')
    const text = ok ? (sub?.completion_summary || r?.output || '') : failText
    return (
        <div>
            {/* 摘要已展示 name（无 name 时为短 id）；正文仅在摘要用 name 时补充完整 id，避免 id 重复 */}
            {name && id && (
                <div style={{ marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, color: ctx.token.colorTextSecondary, fontFamily: MONO_FONT }}>{id}</Text>
                </div>
            )}
            {text ? <FoldedOutput text={text} color={ok ? ctx.token.colorText : ctx.token.colorError} darkMode={ctx.darkMode} /> : null}
        </div>
    )
}

function renderOutputFolded(tool: ToolViewItem, ctx: ToolRenderContext, maxLines = 20): ReactNode {
    const r: any = tool.result
    const text = r?.output || r?.error || ''
    return text ? <FoldedOutput text={text} color={ctx.token.colorText} darkMode={ctx.darkMode} maxLines={maxLines} /> : null
}

function renderApproveOps(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const args = parseArgs(tool.args)
    const r: any = tool.result
    const ops = Array.isArray(args?.ops) ? args.ops : []
    if (ops.length === 0) {
        const text = r?.output || ''
        return text ? <FoldedOutput text={text} color={ctx.token.colorText} darkMode={ctx.darkMode} maxLines={10} /> : null
    }
    return (
        <FoldedList rows={ops} renderRow={(op, i) => (
            <div key={i} style={{ fontSize: 11, color: ctx.token.colorText, fontFamily: MONO_FONT, lineHeight: 1.6 }}>
                {typeof op === 'string' ? op : [op?.tool, op?.path, op?.command].filter(Boolean).join(' ')}
            </div>
        )} />
    )
}

/** load_artifacts：非 ToolResult 形态，直接读 result.artifact_names 列表 */
function renderLoadArtifacts(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const r: any = tool.result
    const names: string[] = Array.isArray(r?.artifact_names) ? r.artifact_names.map((n: any) => String(n)) : []
    if (names.length === 0) return <Text type="secondary" style={{ fontSize: 11 }}>未加载附件</Text>
    return (
        <FoldedList rows={names} renderRow={(n, i) => (
            <div key={i} style={{ fontSize: 11, color: ctx.token.colorText, fontFamily: MONO_FONT, lineHeight: 1.6 }}>{n}</div>
        )} />
    )
}

/** resolveMemoryFileUri：路径可点击打开文件 */
function renderResolveMemoryFileUri(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const args = parseArgs(tool.args)
    const path = args?.path || ''
    return <ClickablePath path={path} onFileClick={ctx.onFileClick} token={ctx.token} />
}

function renderCheckApproval(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const r: any = tool.result
    const ok = r?.success !== false
    let approved: boolean | undefined
    let risk = ''
    let reason = ''
    if (typeof r?.output === 'string') {
        try {
            const parsed = JSON.parse(r.output)
            approved = parsed?.approved
            risk = parsed?.risk || ''
            reason = parsed?.reason || ''
        } catch { /* 非 JSON 输出走兜底 */ }
    }
    if (approved === undefined) {
        return <Text style={{ fontSize: 11, color: ok ? ctx.token.colorText : ctx.token.colorError }}>{r?.output || r?.error || '已放行'}</Text>
    }
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 12, color: approved ? ctx.token.colorSuccess : ctx.token.colorWarning, fontWeight: 500 }}>
                    {approved ? '已放行' : '需审批'}
                </Text>
                {risk && <span style={{ fontSize: 10, padding: '0 6px', borderRadius: 8, color: riskColor(risk, ctx.token), border: `1px solid ${riskColor(risk, ctx.token)}` }}>{riskLabel(risk)}</span>}
            </div>
            {reason && <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>{reason}</Text>}
        </div>
    )
}

function renderDefault(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    const r: any = tool.result
    const ok = r?.success !== false
    const text = r?.output || r?.error || ''
    if (!text) return null
    return <FoldedOutput text={text} color={ok ? ctx.token.colorText : ctx.token.colorError} darkMode={ctx.darkMode} />
}

/** 展开态类型化渲染分派 */
export function renderToolBody(tool: ToolViewItem, ctx: ToolRenderContext): ReactNode {
    switch (tool.name) {
        case 'read_file': return renderReadFile(tool, ctx)
        case 'write_file': return renderWriteFile(tool, ctx)
        case 'edit_file': return renderEditFile(tool, ctx)
        case 'file_search': return renderFileSearch(tool, ctx)
        case 'grep_search': return renderGrepSearch(tool, ctx)
        case 'list_dir': return renderListDir(tool, ctx)
        case 'run_command': return renderRunCommand(tool, ctx)
        case 'get_errors': return renderGetErrors(tool, ctx)
        case 'get_symbols': return renderGetSymbols(tool, ctx)
        case 'lsp_code_action': return renderLspCodeAction(tool, ctx)
        case 'run_skill': return renderRunSkill(tool, ctx)
        case 'web_fetch': return renderWebFetch(tool, ctx)
        case 'memory': return renderMemory(tool, ctx)
        case 'ask_user': return renderAskQuestions(tool, ctx)
        case 'newWorkspace': return renderOutputFolded(tool, ctx)
        case 'resolveMemoryFileUri': return renderResolveMemoryFileUri(tool, ctx)
        case 'load_artifacts': return renderLoadArtifacts(tool, ctx)
        case 'run_subagent': return renderRunSubagent(tool, ctx)
        case 'agent_suspend':
        case 'agent_resume':
        case 'agent_send':
        case 'agent_terminate':
            return renderAgentOp(tool, ctx)
        case 'agent_list': return renderAgentList(tool, ctx)
        case 'agent_wait': return renderAgentWait(tool, ctx)
        case 'todo':
        case 'seed_plan_todos':
            return renderOutputFolded(tool, ctx, 10)
        case 'approve_subagent_ops': return renderApproveOps(tool, ctx)
        case 'auto_verify': return renderOutputFolded(tool, ctx)
        case 'check_approval': return renderCheckApproval(tool, ctx)
        default: return renderDefault(tool, ctx)
    }
}
