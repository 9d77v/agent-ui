import { useState, useEffect, useMemo, useCallback } from 'react'
import { Tree, Typography } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import AgentModal from './AgentModal'
import type { ToolTreeNode } from './types'

const { Text } = Typography

export interface ToolConfigModalProps {
    open: boolean
    onClose: () => void
    toolTree: ToolTreeNode[]
    /** 工具启用状态（key → enabled） */
    toolEnabled?: Record<string, boolean>
    /** 工具启用状态变化时触发，keys 为当前所有已启用的 key 列表 */
    onChange?: (enabledKeys: string[]) => void
    darkMode?: boolean
}

/** 将工具树转换为 Ant Design TreeData 格式 */
function toAntdTreeData(nodes: ToolTreeNode[]): any[] {
    return nodes.map(n => ({
        title: n.label,
        key: n.key,
        children: n.children ? toAntdTreeData(n.children) : undefined,
    }))
}

/** 递归收集指定深度内的所有节点 key */
function collectKeysUpToDepth(nodes: ToolTreeNode[], maxDepth: number, currentDepth = 0): string[] {
    if (currentDepth > maxDepth) return []
    const keys: string[] = []
    for (const n of nodes) {
        keys.push(n.key)
        if (n.children && n.children.length > 0 && currentDepth < maxDepth) {
            keys.push(...collectKeysUpToDepth(n.children, maxDepth, currentDepth + 1))
        }
    }
    return keys
}

/** 递归收集所有叶子节点 key */
function collectLeafKeys(nodes: ToolTreeNode[]): string[] {
    const keys: string[] = []
    for (const n of nodes) {
        if (n.children && n.children.length > 0) {
            keys.push(...collectLeafKeys(n.children))
        } else {
            keys.push(n.key)
        }
    }
    return keys
}

/** 递归收集所有子节点 key（含自身） */
function collectAllChildKeys(nodes: ToolTreeNode[]): string[] {
    const keys: string[] = []
    for (const n of nodes) {
        keys.push(n.key)
        if (n.children) keys.push(...collectAllChildKeys(n.children))
    }
    return keys
}

export default function ToolConfigModal({ open, onClose, toolTree, toolEnabled, onChange, darkMode }: ToolConfigModalProps) {
    const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([])

    // 打开 Modal 时同步启用的叶子节点
    useEffect(() => {
        if (open && toolEnabled) {
            const enabled = collectLeafKeys(toolTree).filter(k => toolEnabled[k] !== false)
            setCheckedKeys(enabled)
        }
    }, [open, toolTree, toolEnabled])

    const handleCheck = useCallback((_checked: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }, info: any) => {
        const newChecked = Array.isArray(_checked) ? _checked : _checked.checked
        setCheckedKeys(newChecked)

        // 获取被点击节点 key，递归影响所有子节点
        const nodeKey = info.node?.key as string
        if (!nodeKey) {
            onChange?.(newChecked.map(String))
            return
        }

        const isChecked = newChecked.includes(nodeKey)
        const childKeys = collectAllChildKeys(info.node?.children || [])

        // 合并为新列表
        const finalSet = new Set(newChecked)
        if (isChecked) {
            childKeys.forEach(k => finalSet.add(k))
        } else {
            childKeys.forEach(k => finalSet.delete(k))
        }
        const finalKeys = Array.from(finalSet).map(String)

        setCheckedKeys(finalKeys)
        onChange?.(finalKeys)
    }, [onChange])

    const handleClose = () => {
        onChange?.(checkedKeys.map(String))
        onClose()
    }

    const expandedKeys = useMemo(() => collectKeysUpToDepth(toolTree, 0), [toolTree])
    const treeData = toAntdTreeData(toolTree)

    return (
        <AgentModal open={open} onClose={handleClose} darkMode={darkMode}
            title="工具配置" titleIcon={<SettingOutlined style={{ marginRight: 8 }} />} height={520}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        勾选需要注入 LLM 的工具。未勾选的工具在 Agent 调用时将不可用。
                    </Text>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                    {treeData.length === 0 ? (
                        <Text type="secondary">暂无可用工具</Text>
                    ) : (
                        <Tree
                            checkable
                            defaultExpandedKeys={expandedKeys}
                            checkedKeys={checkedKeys}
                            onCheck={handleCheck}
                            treeData={treeData}
                            style={{ fontSize: 13, background: 'transparent' }}
                        />
                    )}
                </div>
            </div>
        </AgentModal>
    )
}
