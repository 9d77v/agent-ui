import { useState, useEffect } from 'react'
import { Button, Typography, theme } from 'antd'
import { LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined, CodeOutlined, FileTextOutlined, FolderOutlined, SearchOutlined, ConsoleSqlOutlined, EditOutlined, DownOutlined, RightOutlined, SaveOutlined, QuestionCircleOutlined, CheckSquareOutlined, DeploymentUnitOutlined, LinkOutlined, ToolOutlined } from '@ant-design/icons'
import { useAgentLocale } from './locale/index'
import type { ToolViewItem } from './types'

const { Text } = Typography

function toolMeta(name: string, displayNames?: Record<string, string>) {
    const label = displayNames?.[name] || name
    switch (name) {
        case 'read_file': return { label, icon: <FileTextOutlined style={{ color: '#1677ff' }} /> }
        case 'write_file': return { label, icon: <SaveOutlined style={{ color: '#52c41a' }} /> }
        case 'edit_file': return { label, icon: <EditOutlined style={{ color: '#1677ff' }} /> }
        case 'file_search': return { label, icon: <SearchOutlined style={{ color: '#722ed1' }} /> }
        case 'grep_search': return { label, icon: <SearchOutlined style={{ color: '#722ed1' }} /> }
        case 'list_dir': return { label, icon: <FolderOutlined style={{ color: '#fa8c16' }} /> }
        case 'run_command': return { label, icon: <ConsoleSqlOutlined style={{ color: '#13c2c2' }} /> }
        case 'get_errors': return { label, icon: <CodeOutlined style={{ color: '#eb2f96' }} /> }
        case 'memory': return { label, icon: <SaveOutlined style={{ color: '#999' }} /> }
        case 'todo': return { label, icon: <CheckSquareOutlined style={{ color: '#fa8c16' }} /> }
        case 'askQuestions': return { label, icon: <QuestionCircleOutlined style={{ color: '#722ed1' }} /> }
        case 'newWorkspace': return { label, icon: <DeploymentUnitOutlined style={{ color: '#1677ff' }} /> }
        default: return { label, icon: <ToolOutlined /> }
    }
}

export default function ToolCallCard({ tool, darkMode, defaultExpanded, onHandoff }: { tool: ToolViewItem; darkMode?: boolean; defaultExpanded?: boolean; onHandoff?: (label: string, prompt: string) => void }) {
    const { token } = theme.useToken()
    const loc = useAgentLocale()
    const displayNames = loc.toolDisplayNames
    const [expanded, setExpanded] = useState(defaultExpanded ?? tool.status === 'executing')
    useEffect(() => { if (defaultExpanded !== undefined) setExpanded(defaultExpanded) }, [defaultExpanded])
    const meta = toolMeta(tool.name, displayNames)
    return <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 6, marginBottom: 6, background: token.colorBgContainer, overflow: 'hidden' }}>
        <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', background: tool.status === 'executing' ? token.colorPrimaryBg : 'transparent' }}>
            {tool.status === 'executing' ? <LoadingOutlined style={{ fontSize: 13, color: token.colorPrimary, flexShrink: 0 }} /> : expanded ? <DownOutlined style={{ fontSize: 10, color: token.colorTextTertiary, flexShrink: 0 }} /> : <RightOutlined style={{ fontSize: 10, color: token.colorTextTertiary, flexShrink: 0 }} />}
            {meta.icon}<Text style={{ fontSize: 12, fontWeight: 500, color: token.colorText }}>{meta.label}</Text><div style={{ flex: 1 }} />
            {tool.status === 'done' && <CheckCircleOutlined style={{ fontSize: 13, color: token.colorSuccess }} />}
            {tool.status === 'error' && <CloseCircleOutlined style={{ fontSize: 13, color: token.colorError }} />}
        </div>
        {expanded && <div style={{ padding: '8px 10px', borderTop: `1px solid ${token.colorBorderSecondary}`, fontSize: 12 }}>
            {tool.args && <><Text type="secondary" style={{ fontSize: 11 }}>{loc.tool.paramLabel}</Text><pre style={{ margin: '2px 0 6px', padding: '4px 8px', background: token.colorFillContent, borderRadius: 4, fontSize: 11, color: token.colorText, overflow: 'auto', fontFamily: "'Cascadia Code',Consolas,monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{(() => {
                let obj: any = null
                try { obj = JSON.parse(tool.args) } catch { return tool.args }
                // 命令工具只展示实际执行的命令，不暴露内部参数（command/explanation/goal 等）
                if (tool.name === 'run_command' && typeof obj?.command === 'string') {
                    return '$ ' + obj.command
                }
                return JSON.stringify(obj, null, 2)
            })()}</pre></>}
            {tool.status !== 'executing' && tool.result && <><Text type="secondary" style={{ fontSize: 11 }}>{tool.result.success ? loc.tool.outputLabel : loc.tool.errorLabel}</Text><pre style={{ margin: '2px 0 0', padding: '6px 8px', background: token.colorFillContent, borderRadius: 4, fontSize: 11, color: tool.result.success ? token.colorText : token.colorError, overflow: 'auto', maxHeight: 200, fontFamily: "'Cascadia Code',Consolas,monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{tool.result.output || tool.result.error || ''}</pre></>}
            {/* 子代理执行过程 + 交接按钮 + agent_id（run_subagent 统一派发结果，位于 result.data；仅前端展示，不作为 LLM 上下文） */}
            {tool.name === 'run_subagent' && tool.status !== 'executing' && (() => {
                const r = (tool.result as any)
                let sub: any = r?.data
                if (typeof sub === 'string') { try { sub = JSON.parse(sub) } catch { sub = null } }
                const agentID = sub?.agent_id || ''
                const steps = Array.isArray(sub?.history) ? sub.history : []
                const handoffs = Array.isArray(sub?.handoffs) ? sub.handoffs : []
                if (steps.length === 0 && handoffs.length === 0 && !agentID) return null
                return (
                    <div style={{ marginTop: 6 }}>
                        {agentID && <><Text type="secondary" style={{ fontSize: 11 }}>agent_id</Text><div style={{ fontSize: 11, color: token.colorText }}>{agentID}</div></>}
                        {steps.length > 0 && <>
                            <Text type="secondary" style={{ fontSize: 11 }}>子代理执行过程</Text>
                            {steps.map((s: any, i: number) => (
                                <div key={i} style={{ marginTop: 4, padding: '4px 8px', background: token.colorFillContent, borderRadius: 4, border: `1px solid ${token.colorBorderSecondary}` }}>
                                    <Text style={{ fontSize: 11, color: token.colorText }}>{i + 1}. {s.tool}</Text>
                                    {s.args && <pre style={{ margin: '2px 0 0', fontSize: 10, color: token.colorTextTertiary, overflow: 'auto', maxHeight: 80, fontFamily: "'Cascadia Code',Consolas,monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{s.args}</pre>}
                                    {s.output && <pre style={{ margin: '2px 0 0', fontSize: 10, color: token.colorText, overflow: 'auto', maxHeight: 120, fontFamily: "'Cascadia Code',Consolas,monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{s.output}</pre>}
                                </div>
                            ))}
                        </>}
                        {handoffs.length > 0 && (
                            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {handoffs.map((h: any, i: number) => (
                                    <Button key={i} size="small" type="primary" ghost
                                        onClick={() => onHandoff?.(h.label || '交接', h.prompt || h.label || '')}>
                                        {h.label || '交接'}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })()}
        </div>}
    </div>
}
