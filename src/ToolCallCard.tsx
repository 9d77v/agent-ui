import { useState, useEffect } from 'react'
import { Typography } from 'antd'
import { LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined, CodeOutlined, FileTextOutlined, FolderOutlined, SearchOutlined, ConsoleSqlOutlined, EditOutlined, DownOutlined, RightOutlined, SaveOutlined, BranchesOutlined, QuestionCircleOutlined, CheckSquareOutlined, DeploymentUnitOutlined, LinkOutlined, ToolOutlined } from '@ant-design/icons'
import { useAgentLocale } from './locale/index'

const { Text } = Typography

export interface ToolCallItem { name: string; args: string; status: 'executing' | 'done' | 'error'; result?: any; output?: string }

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
        case 'delegate_task': return { label, icon: <BranchesOutlined style={{ color: '#1677ff' }} /> }
        default: return { label, icon: <ToolOutlined /> }
    }
}

export default function ToolCallCard({ tool, darkMode, defaultExpanded }: { tool: ToolCallItem; darkMode?: boolean; defaultExpanded?: boolean }) {
    const loc = useAgentLocale()
    const displayNames = loc.toolDisplayNames
    const [expanded, setExpanded] = useState(defaultExpanded ?? tool.status === 'executing')
    useEffect(() => { if (defaultExpanded !== undefined) setExpanded(defaultExpanded) }, [defaultExpanded])
    const meta = toolMeta(tool.name, displayNames)
    const bg = darkMode ? '#1e1e1e' : '#fafafa'; const border = darkMode ? '#333' : '#e8e8e8'; const textColor = darkMode ? '#d4d4d4' : '#333'
    return <div style={{ border: `1px solid ${border}`, borderRadius: 6, marginBottom: 6, background: bg, overflow: 'hidden' }}>
        <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', background: tool.status === 'executing' ? (darkMode ? '#1a3a5c' : '#e6f4ff') : 'transparent' }}>
            {tool.status === 'executing' ? <LoadingOutlined style={{ fontSize: 13, color: '#1677ff', flexShrink: 0 }} /> : expanded ? <DownOutlined style={{ fontSize: 10, color: '#999', flexShrink: 0 }} /> : <RightOutlined style={{ fontSize: 10, color: '#999', flexShrink: 0 }} />}
            {meta.icon}<Text style={{ fontSize: 12, fontWeight: 500, color: textColor }}>{meta.label}</Text><div style={{ flex: 1 }} />
            {tool.status === 'done' && <CheckCircleOutlined style={{ fontSize: 13, color: '#52c41a' }} />}
            {tool.status === 'error' && <CloseCircleOutlined style={{ fontSize: 13, color: '#f14c4c' }} />}
        </div>
        {expanded && <div style={{ padding: '8px 10px', borderTop: `1px solid ${border}`, fontSize: 12 }}>
            {tool.args && <><Text type="secondary" style={{ fontSize: 11 }}>{loc.tool.paramLabel}</Text><pre style={{ margin: '2px 0 6px', padding: '4px 8px', background: darkMode ? '#0d1117' : '#f6f8fa', borderRadius: 4, fontSize: 11, color: textColor, overflow: 'auto', fontFamily: "'Cascadia Code',Consolas,monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{(() => { try { return JSON.stringify(JSON.parse(tool.args), null, 2) } catch { return tool.args } })()}</pre></>}
            {tool.status !== 'executing' && tool.result && <><Text type="secondary" style={{ fontSize: 11 }}>{tool.result.success ? loc.tool.outputLabel : loc.tool.errorLabel}</Text><pre style={{ margin: '2px 0 0', padding: '6px 8px', background: darkMode ? '#0d1117' : '#f6f8fa', borderRadius: 4, fontSize: 11, color: tool.result.success ? textColor : '#f14c4c', overflow: 'auto', maxHeight: 200, fontFamily: "'Cascadia Code',Consolas,monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{tool.result.output || tool.result.error || ''}</pre></>}
        </div>}
    </div>
}
