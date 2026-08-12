import { useEffect, useRef, useState } from 'react'
import { Typography, Tag, Space, Tabs, theme } from 'antd'
import { RobotOutlined, DownOutlined, RightOutlined } from '@ant-design/icons'
import type { AgentStatus } from './types'

const { Text } = Typography

export const statusMeta: Record<string, { label: string; color: string }> = {
    idle: { label: '待命', color: 'default' },
    queued: { label: '排队中', color: 'warning' },
    running: { label: '运行中', color: 'processing' },
    suspended: { label: '挂起', color: 'orange' },
    done: { label: '完成', color: 'success' },
    failed: { label: '失败', color: 'error' },
    terminated: { label: '已终止', color: 'default' },
}

// 完成闪烁动画：agent-ui 无全局 CSS 文件，经内联 <style> 注入 @keyframes。
// 子代理完成/失败（agent_done）时对应行闪烁 3 次（0.6s×3 ≈ 1.8s），作为不弹消息的轻量反馈。
const flashKeyframes = `@keyframes agentRowFlash {
    0%, 100% { background-color: transparent; }
    50% { background-color: rgba(250, 173, 20, 0.35); }
}`

/** 最新生成在前（created_at/updated_at 倒序，缺失排后）。 */
function byNewest(a: AgentStatus, b: AgentStatus): number {
    const ta = a.created_at || a.updated_at || ''
    const tb = b.created_at || b.updated_at || ''
    if (ta && tb && ta !== tb) return ta < tb ? 1 : -1
    return 0
}

/**
 * AgentRoster 子代理编排列表（只读展示，可折叠）。
 * 默认收缩成一行（标题 + 数量），点击展开：常驻 / 一次性 两个 tab 分组展示，
 * 每组按「最新生成在前」排序（用户决策：一次性瞬态不淘汰、与常驻 tab 区分）。
 * 状态经 agent_status 广播或 GetSessionAgents 提供。
 * 子代理完成（agent_done）→ 对应行闪烁 3 次；若折叠自动展开并切到所在 tab（不弹消息）。
 */
export default function AgentRoster({ agents, darkMode, onSelect }: {
    agents: AgentStatus[]
    darkMode?: boolean
    /** 点击行回调（宿主查看子代理消息流等）。未提供时行不可点 */
    onSelect?: (agent: AgentStatus) => void
}) {
    const { token } = theme.useToken()
    const [collapsed, setCollapsed] = useState(true)
    const [tab, setTab] = useState('resident')
    const [flashIDs, setFlashIDs] = useState<Set<string>>(new Set())
    const agentsRef = useRef(agents)
    agentsRef.current = agents
    const resident = agents.filter(a => !a.transient).sort(byNewest)
    const transient = agents.filter(a => a.transient).sort(byNewest)
    const total = agents.length
    const toggle = () => setCollapsed(v => !v)

    // 子代理完成/失败（agent_done WS → useAgentWebSocket dispatch 的 CustomEvent）→ 行闪烁反馈：
    // 若折叠自动展开、切到所在 tab（常驻/一次性），对应行闪烁 3 次后恢复（2.4s 定时清除，留动画余量）。
    useEffect(() => {
        const h = (e: Event) => {
            const d = (e as CustomEvent).detail
            const id: string = d?.agent_id || ''
            if (!id) return
            const target = agentsRef.current.find(a => a.agent_id === id)
            if (target) setTab(target.transient ? 'transient' : 'resident')
            setCollapsed(false)
            setFlashIDs(prev => new Set(prev).add(id))
            setTimeout(() => {
                setFlashIDs(prev => {
                    const next = new Set(prev)
                    next.delete(id)
                    return next
                })
            }, 2400)
        }
        window.addEventListener('agent-done', h)
        return () => window.removeEventListener('agent-done', h)
    }, [])

    // 挂载竞态重放（C2）：宿主在面板整体折叠时收到 agent-done 后展开面板，本组件此时才挂载、事件已丢失——
    // 宿主把 detail 暂存到 window.__pendingAgentDone，挂载后重放一次触发既有「切对应 tab + 展开 + 行闪烁」
    // 逻辑（监听 effect 声明在前、重放 dispatch 在后，同一 mount 顺序安全）。
    useEffect(() => {
        const pending = (window as any).__pendingAgentDone
        if (pending) {
            delete (window as any).__pendingAgentDone
            window.dispatchEvent(new CustomEvent('agent-done', { detail: pending }))
        }
    }, [])

    const renderItems = (items: AgentStatus[]) => items.length === 0
        ? <Text type="secondary" style={{ fontSize: 11, paddingLeft: 6 }}>无</Text>
        : (
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {items.map(a => {
                    const st = statusMeta[a.status] || statusMeta.idle
                    const indent = (a.depth || 0) * 14
                    const flashing = flashIDs.has(a.agent_id)
                    return (
                        <div key={a.agent_id} onClick={() => onSelect?.(a)} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px',
                            borderRadius: 4, background: darkMode ? '#1e1e1e' : '#fafafa',
                            border: `1px solid ${token.colorBorderSecondary}`, marginLeft: indent, marginBottom: 4,
                            cursor: onSelect ? 'pointer' : 'default',
                            ...(flashing ? { animation: 'agentRowFlash 0.6s ease-in-out 3' } : {}),
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Space size={6}>
                                    <Text style={{ fontSize: 12, color: token.colorText }}>{a.name}</Text>
                                    <Tag color={st.color} style={{ fontSize: 10, lineHeight: '14px', margin: 0 }}>{st.label}</Tag>
                                </Space>
                                {(a.summary || a.error || a.task) && (
                                    <div style={{
                                        fontSize: 11,
                                        color: a.error ? '#ff4d4f' : token.colorTextTertiary,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {a.summary || a.error || a.task}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        )

    return (
        <>
            <style>{flashKeyframes}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0', cursor: total > 0 ? 'pointer' : 'default' }}
                    onClick={total > 0 ? toggle : undefined}
                >
                    {total > 0
                        ? (collapsed ? <RightOutlined style={{ fontSize: 10, color: token.colorTextTertiary }} /> : <DownOutlined style={{ fontSize: 10, color: token.colorTextTertiary }} />)
                        : <span style={{ width: 10 }} />}
                    <RobotOutlined style={{ fontSize: 12, color: token.colorPrimary }} />
                    <Text strong style={{ fontSize: 12, color: token.colorText }}>子代理</Text>
                    {total > 0 && <Tag style={{ fontSize: 10, lineHeight: '14px', margin: 0 }}>{total}</Tag>}
                </div>
                {total === 0 && <Text type="secondary" style={{ fontSize: 11, paddingLeft: 14 }}>无运行中的子代理</Text>}
                {!collapsed && total > 0 && (
                    <Tabs size="small" activeKey={tab} onChange={setTab}
                        items={[
                            { key: 'resident', label: `常驻 ${resident.length}`, children: renderItems(resident) },
                            { key: 'transient', label: `一次性 ${transient.length}`, children: renderItems(transient) },
                        ]}
                        style={{ fontSize: 11 }}
                    />
                )}
            </div>
        </>
    )
}
