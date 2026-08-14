import { useState, useEffect, useRef } from 'react'
import { Typography, Tag, theme } from 'antd'
import { DownOutlined, RightOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, ClockCircleOutlined } from '@ant-design/icons'
import ToolCallCard from './ToolCallCard'
import { useAgentLocale } from './locale/index'
import { toolSummary } from './toolRenderers'
import type { ToolViewItem } from './types'

const { Text } = Typography

export default function ToolTimeline({ tools, darkMode, onFileClick, autoExpand = true, onHandoff }: { tools: ToolViewItem[]; darkMode?: boolean; onFileClick?: (path: string) => void; autoExpand?: boolean; onHandoff?: (label: string, prompt: string) => void }) {
    const { token } = theme.useToken()
    const loc = useAgentLocale()
    const isExecuting = tools.some(t => t.status === 'executing')
    const [expanded, setExpanded] = useState(autoExpand && isExecuting)
    const wasRef = useRef(isExecuting)
    useEffect(() => { if (wasRef.current && !isExecuting && tools.length > 0) setExpanded(false); wasRef.current = isExecuting }, [isExecuting, tools.length])
    const doneCount = tools.filter(t => t.status === 'done' || t.status === 'error').length
    const totalCount = tools.length
    if (totalCount === 0) return null
    return <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 6, marginBottom: 8, overflow: 'hidden', background: token.colorBgContainer }}>
        <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', background: isExecuting ? token.colorPrimaryBg : token.colorFillAlter, userSelect: 'none' }}>
            {expanded ? <DownOutlined style={{ fontSize: 10, color: token.colorTextTertiary }} /> : <RightOutlined style={{ fontSize: 10, color: token.colorTextTertiary }} />}
            <Text style={{ fontSize: 12, color: token.colorText, fontWeight: 500 }}>{isExecuting ? `${loc.tool.executingStatus} ${doneCount}/${totalCount}` : `${loc.tool.completedStatus} ${doneCount}/${totalCount} ${loc.tool.stepsLabel}`}</Text>
            <div style={{ flex: 1, height: 4, maxWidth: 100, background: token.colorBorderSecondary, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`, background: isExecuting ? token.colorPrimary : token.colorSuccess, borderRadius: 2, transition: 'width 0.3s ease' }} />
            </div>
            {isExecuting && <Tag color="processing" style={{ fontSize: 10, lineHeight: '14px', padding: '0 4px' }}>{doneCount}/{totalCount}</Tag>}
        </div>
        {expanded && <div style={{ padding: '4px 10px 8px' }}>{tools.map((tool, idx) => <StepRow key={tool.name + idx} tool={tool} index={idx + 1} darkMode={darkMode} autoExpand={autoExpand} onHandoff={onHandoff} onFileClick={onFileClick} />)}</div>}
    </div>
}

function StepRow({ tool, index, darkMode, autoExpand = true, onHandoff, onFileClick }: { tool: ToolViewItem; index: number; darkMode?: boolean; autoExpand?: boolean; onHandoff?: (label: string, prompt: string) => void; onFileClick?: (path: string) => void }) {
    const [expanded, setExpanded] = useState(autoExpand && tool.status === 'executing')
    const { token } = theme.useToken()
    const loc = useAgentLocale()
    const label = loc.toolDisplayNames?.[tool.name] || tool.name
    const summary = toolSummary(tool)
    return <div style={{ marginBottom: 2, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '3px 0' }}>
            <div style={{ flexShrink: 0, marginTop: 2, width: 16, textAlign: 'center' }}>
                {tool.status === 'executing' ? <LoadingOutlined style={{ color: token.colorPrimary, fontSize: 13 }} /> : tool.status === 'done' ? <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 13 }} /> : <CloseCircleOutlined style={{ color: token.colorError, fontSize: 13 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none', padding: '1px 0' }}>
                    <Text style={{ fontSize: 12, color: token.colorText, fontWeight: 500, flexShrink: 0 }}>{index}. {label}</Text>
                    {!expanded && summary && (
                        <Text style={{ fontSize: 11, color: token.colorTextTertiary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 }}>{summary}</Text>
                    )}
                    {(!expanded || !summary) && <div style={{ flex: 1 }} />}
                    {expanded ? <DownOutlined style={{ fontSize: 9, color: token.colorTextTertiary }} /> : <RightOutlined style={{ fontSize: 9, color: token.colorTextTertiary }} />}
                </div>
                {expanded && <div style={{ marginTop: 4 }}><ToolCallCard tool={tool} darkMode={darkMode} onHandoff={onHandoff} onFileClick={onFileClick} /></div>}
            </div>
        </div>
    </div>
}
