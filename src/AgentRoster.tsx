import { useEffect, useState } from 'react'
import { Typography, Tag, Space, theme } from 'antd'
import type { AgentStatus } from './types'
import TokenProgress from './TokenProgress'

const { Text } = Typography

/** 防御性解析最近一次 token_usage JSON（解析失败返回 null）。 */
function parseLastUsage(raw?: string): any {
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
}

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

/** 最新更新在前（updated_at 优先、created_at 兜底，双缺失排后）。 */
function byUpdatedAt(a: AgentStatus, b: AgentStatus): number {
    const ta = a.updated_at || a.created_at || ''
    const tb = b.updated_at || b.created_at || ''
    if (ta && !tb) return -1
    if (!ta && tb) return 1
    if (ta !== tb) return ta < tb ? 1 : -1
    return 0
}

/**
 * AgentRoster 子代理编排列表（只读展示，常驻展开）。
 * 常驻 / 一次性合并为单一列表，按「最新更新在前」排序
 * （updated_at 优先、created_at 兜底，双缺失排后）。
 * 状态经 agent_status 广播或 GetSessionAgents 提供。
 * 子代理完成（agent_done）→ 对应行闪烁 3 次（不弹消息）。
 */
export default function AgentRoster({ agents, darkMode, onSelect }: {
    agents: AgentStatus[]
    darkMode?: boolean
    /** 点击行回调（宿主查看子代理消息流等）。未提供时行不可点 */
    onSelect?: (agent: AgentStatus) => void
}) {
    const { token } = theme.useToken()
    const [flashIDs, setFlashIDs] = useState<Set<string>>(new Set())
    // 常驻 / 一次性合并为单一列表（spread 防改 props），按更新时间倒序。
    const items = [...agents].sort(byUpdatedAt)
    const total = agents.length

    // 子代理完成/失败（agent_done WS → useAgentWebSocket dispatch 的 CustomEvent）→ 行闪烁反馈：
    // 对应行闪烁 3 次后恢复（2.4s 定时清除，留动画余量）。
    useEffect(() => {
        const h = (e: Event) => {
            const d = (e as CustomEvent).detail
            const id: string = d?.agent_id || ''
            if (!id) return
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
    // 宿主把 detail 暂存到 window.__pendingAgentDone，挂载后重放一次触发既有「展开 + 行闪烁」
    // 逻辑（监听 effect 声明在前、重放 dispatch 在后，同一 mount 顺序安全）。
    useEffect(() => {
        const pending = (window as any).__pendingAgentDone
        if (pending) {
            delete (window as any).__pendingAgentDone
            window.dispatchEvent(new CustomEvent('agent-done', { detail: pending }))
        }
    }, [])

    const renderList = (items: AgentStatus[]) => items.length === 0
        ? <Text type="secondary" style={{ fontSize: 11, paddingLeft: 6 }}>无</Text>
        : items.map(a => {
                    const st = statusMeta[a.status] || statusMeta.idle
                    const indent = (a.depth || 0) * 14
                    const flashing = flashIDs.has(a.agent_id)
                    return (
                        <div key={a.agent_id} onClick={() => onSelect?.(a)} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px',
                            borderRadius: 4, background: darkMode ? 'rgba(30,30,30,0.45)' : 'rgba(255,255,255,0.45)',
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
                            {/* 行最右：当前上下文窗口占用（TokenProgress，与主 agent 输入区一致；累计总量见会话统计弹窗） */}
                            <TokenProgress tokenUsage={parseLastUsage(a.last_token_usage)} currentContextWindow={0} darkMode={darkMode} />
                        </div>
                    )
                })

    return (
        <>
            <style>{flashKeyframes}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minHeight: 0 }}>
                {total === 0 && <Text type="secondary" style={{ fontSize: 11, paddingLeft: 0 }}>无运行中的子代理</Text>}
                {total > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                        {/* 列表容器：flex:1 + overflowY auto（可靠滚动） */}
                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                            {renderList(items)}
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
