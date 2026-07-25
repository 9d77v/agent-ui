import { useState, useEffect, useRef } from 'react'
import { Typography, Tag } from 'antd'
import { DownOutlined, RightOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, ClockCircleOutlined } from '@ant-design/icons'
import ToolCallCard from './ToolCallCard'
import { useAgentLocale } from './locale/index'

const { Text } = Typography
export interface TimelineToolItem { name: string; args: string; status: 'executing' | 'done' | 'error'; result?: any }

export default function ToolTimeline({ tools, darkMode, onFileClick: _onFileClick }: { tools: TimelineToolItem[]; darkMode?: boolean; onFileClick?: (path: string) => void }) {
    const loc = useAgentLocale()
    const isExecuting = tools.some(t => t.status === 'executing')
    const [expanded, setExpanded] = useState(isExecuting)
    const wasRef = useRef(isExecuting)
    useEffect(() => { if (wasRef.current && !isExecuting && tools.length > 0) setExpanded(false); wasRef.current = isExecuting }, [isExecuting, tools.length])
    const doneCount = tools.filter(t => t.status === 'done' || t.status === 'error').length
    const totalCount = tools.length
    if (totalCount === 0) return null
    return <div style={{ border: `1px solid ${darkMode ? '#333' : '#f0f0f0'}`, borderRadius: 6, marginBottom: 8, overflow: 'hidden', background: darkMode ? '#1e1e1e' : '#fff' }}>
        <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', background: isExecuting ? (darkMode ? '#1a3a5c' : '#e6f4ff') : (darkMode ? '#2d2d2d' : '#fafafa'), userSelect: 'none' }}>
            {expanded ? <DownOutlined style={{ fontSize: 10, color: '#999' }} /> : <RightOutlined style={{ fontSize: 10, color: '#999' }} />}
            <Text style={{ fontSize: 12, color: darkMode ? '#d4d4d4' : '#333', fontWeight: 500 }}>{isExecuting ? `${loc.tool.executingStatus} ${doneCount}/${totalCount}` : `${loc.tool.completedStatus} ${doneCount}/${totalCount} ${loc.tool.stepsLabel}`}</Text>
            <div style={{ flex: 1, height: 4, maxWidth: 100, background: darkMode ? '#333' : '#e8e8e8', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`, background: isExecuting ? '#1677ff' : '#52c41a', borderRadius: 2, transition: 'width 0.3s ease' }} />
            </div>
            {isExecuting && <Tag color="processing" style={{ fontSize: 10, lineHeight: '14px', padding: '0 4px' }}>{doneCount}/{totalCount}</Tag>}
        </div>
        {expanded && <div style={{ padding: '4px 10px 8px' }}>{tools.map((tool, idx) => <StepRow key={tool.name + idx} tool={tool} index={idx + 1} darkMode={darkMode} />)}</div>}
    </div>
}

function StepRow({ tool, index, darkMode }: { tool: TimelineToolItem; index: number; darkMode?: boolean }) {
    const [expanded, setExpanded] = useState(tool.status === 'executing')
    const loc = useAgentLocale()
    const label = loc.toolDisplayNames?.[tool.name] || tool.name
    return <div style={{ marginBottom: 2, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '3px 0' }}>
            <div style={{ flexShrink: 0, marginTop: 2, width: 16, textAlign: 'center' }}>
                {tool.status === 'executing' ? <LoadingOutlined style={{ color: '#1677ff', fontSize: 13 }} /> : tool.status === 'done' ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 13 }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 13 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none', padding: '1px 0' }}>
                    <Text style={{ fontSize: 12, color: darkMode ? '#d4d4d4' : '#333', fontWeight: 500 }}>{index}. {label}</Text>
                    <div style={{ flex: 1 }} />
                    {expanded ? <DownOutlined style={{ fontSize: 9, color: '#999' }} /> : <RightOutlined style={{ fontSize: 9, color: '#999' }} />}
                </div>
                {expanded && <div style={{ marginTop: 4 }}><ToolCallCard tool={{ name: tool.name, args: tool.args, status: tool.status }} darkMode={darkMode} /></div>}
            </div>
        </div>
    </div>
}
