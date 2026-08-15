import type { ReactNode } from 'react'
import { Typography, theme } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import AgentModal from './AgentModal'
import type { ToolTreeNode } from './types'
import { toolIcon } from '../toolRenderers'

const { Text } = Typography

export interface ToolConfigModalProps {
    open: boolean
    onClose: () => void
    /** 静态工具树（分类 + 名称 + 描述；只读展示，全量注入） */
    toolTree: ToolTreeNode[]
    darkMode?: boolean
}

/** 工具卡片：图标 + 名称（key）+ 描述（VSCode 风格只读展示） */
function ToolCard({ node, token }: { node: ToolTreeNode; token: any }) {
    return (
        <div style={{ display: 'flex', gap: 8, padding: '8px 10px', border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 6, background: token.colorBgContainer }}>
            <div style={{ marginTop: 2, flexShrink: 0 }}>{toolIcon(node.key, token)}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: token.colorText, lineHeight: 1.4 }}>{node.label}</div>
                {node.key && node.key !== node.label && (
                    <div style={{ fontSize: 11, color: token.colorTextTertiary, fontFamily: 'monospace' }}>{node.key}</div>
                )}
                {node.description && (
                    <div style={{ fontSize: 12, color: token.colorTextSecondary, marginTop: 4, lineHeight: 1.5 }}>{node.description}</div>
                )}
            </div>
        </div>
    )
}

/** 递归渲染工具树为分类卡片：叶子 = 卡片；子节点全为叶子 = 分组标题 + 卡片网格；更深 = 分类标题 + 递归 */
function renderNodes(nodes: ToolTreeNode[], token: any): ReactNode {
    return nodes.map(node => {
        const children = node.children || []
        if (children.length === 0) {
            return <ToolCard key={node.key} node={node} token={token} />
        }
        const childrenAreLeaves = children.every(c => !c.children || c.children.length === 0)
        if (childrenAreLeaves) {
            return (
                <div key={node.key} style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: token.colorTextSecondary, margin: '0 0 8px', letterSpacing: 0.5 }}>{node.label}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                        {children.map(c => <ToolCard key={c.key} node={c} token={token} />)}
                    </div>
                </div>
            )
        }
        return (
            <div key={node.key} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: token.colorText, margin: '0 0 8px' }}>{node.label}</div>
                {renderNodes(children, token)}
            </div>
        )
    })
}

export default function ToolConfigModal({ open, onClose, toolTree, darkMode }: ToolConfigModalProps) {
    const { token } = theme.useToken()
    return (
        <AgentModal open={open} onClose={onClose} darkMode={darkMode}
            title="工具" titleIcon={<SettingOutlined style={{ marginRight: 8 }} />} height={520}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        当前 Agent 可用工具（只读展示，全量注入）。
                    </Text>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                    {toolTree.length === 0 ? (
                        <Text type="secondary">暂无可用工具</Text>
                    ) : (
                        renderNodes(toolTree, token)
                    )}
                </div>
            </div>
        </AgentModal>
    )
}
