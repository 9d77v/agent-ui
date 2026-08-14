import { useState, useEffect } from 'react'
import { Typography, theme } from 'antd'
import { LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined, DownOutlined, RightOutlined } from '@ant-design/icons'
import { useAgentLocale } from './locale/index'
import { toolLabel, toolIcon, toolSummary, renderToolBody } from './toolRenderers'
import type { ToolViewItem } from './types'

const { Text } = Typography

export default function ToolCallCard({ tool, darkMode, defaultExpanded, onHandoff, onFileClick }: {
    tool: ToolViewItem
    darkMode?: boolean
    defaultExpanded?: boolean
    onHandoff?: (label: string, prompt: string) => void
    onFileClick?: (path: string) => void
}) {
    const { token } = theme.useToken()
    const loc = useAgentLocale()
    const [expanded, setExpanded] = useState(defaultExpanded ?? tool.status === 'executing')
    useEffect(() => { if (defaultExpanded !== undefined) setExpanded(defaultExpanded) }, [defaultExpanded])
    const label = toolLabel(tool.name, loc.toolDisplayNames)
    const summary = toolSummary(tool)
    return <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 6, marginBottom: 6, background: token.colorBgContainer, overflow: 'hidden' }}>
        <div onClick={() => setExpanded(!expanded)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', background: tool.status === 'executing' ? token.colorPrimaryBg : 'transparent' }}>
            {tool.status === 'executing' ? <LoadingOutlined style={{ fontSize: 13, color: token.colorPrimary, flexShrink: 0 }} /> : expanded ? <DownOutlined style={{ fontSize: 10, color: token.colorTextTertiary, flexShrink: 0 }} /> : <RightOutlined style={{ fontSize: 10, color: token.colorTextTertiary, flexShrink: 0 }} />}
            {toolIcon(tool.name, token)}
            <Text style={{ fontSize: 12, fontWeight: 500, color: token.colorText, flexShrink: 0 }}>{label}</Text>
            {summary ? (
                <Text style={{ fontSize: 11, color: token.colorTextSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 }}>{summary}</Text>
            ) : <div style={{ flex: 1 }} />}
            {tool.status === 'done' && <CheckCircleOutlined style={{ fontSize: 13, color: token.colorSuccess }} />}
            {tool.status === 'error' && <CloseCircleOutlined style={{ fontSize: 13, color: token.colorError }} />}
        </div>
        {expanded && <div style={{ padding: '8px 10px', borderTop: `1px solid ${token.colorBorderSecondary}`, fontSize: 12 }}>
            {renderToolBody(tool, { onFileClick, onHandoff, token, darkMode, loc })}
        </div>}
    </div>
}
