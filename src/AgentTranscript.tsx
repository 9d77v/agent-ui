import { useEffect, useRef, useState } from 'react'
import { Typography, Input, Button, Tag, theme } from 'antd'
import { SendOutlined, CloseOutlined, RobotOutlined } from '@ant-design/icons'
import MessageBubble from './MessageBubble'
import { statusMeta } from './AgentRoster'
import type { AgentStatus } from './types'
import type { AgentMessage } from './hooks/useMessageTree'

const { Text } = Typography

/**
 * AgentTranscript 子代理独立对话视图：展示子代理自己的消息流，底部可发送 follow-up（唤醒续跑）。
 * 消息渲染与主会话 MessageList 对齐：每个消息包 flex 包装（user 右对齐 / 其余左对齐）；
 * 思考块展开状态由组件内部维护（onToggleReasoning 可用，修复 2s 轮询重渲染把折叠状态复位导致展开失效）。
 */
export default function AgentTranscript({ agent, messages, onSend, onClose, darkMode }: {
    agent: AgentStatus
    messages: AgentMessage[]
    onSend?: (message: string) => void
    onClose?: () => void
    darkMode?: boolean
}) {
    const { token } = theme.useToken()
    const [input, setInput] = useState('')
    // 思考块展开状态（msgId → showReasoning）：本地维护，轮询刷新重渲染不丢折叠状态（D3 修复展开失效）
    const [showReasoning, setShowReasoning] = useState<Record<string, boolean>>({})
    // 消息容器 ref：新消息（含弹窗轮询刷新/流式增量）到达时自动滚动到底（仿 MessageList 滚动跟随）。
    // 弹窗为只读视图，不做用户上翻检测——简单先滚到底即可（D3 决策）。
    const containerRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const el = containerRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [messages])
    // 弹窗切换 agent（点击不同 roster 行）时重置思考展开状态
    useEffect(() => {
        setShowReasoning({})
    }, [agent.agent_id])
    const send = () => {
        const t = input.trim()
        if (!t) return
        onSend?.(t)
        setInput('')
    }
    const st = statusMeta[agent.status] || statusMeta.idle
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 6,
            background: darkMode ? '#1e1e1e' : '#fff',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                <RobotOutlined style={{ color: token.colorPrimary }} />
                <Text strong style={{ fontSize: 12 }}>{agent.name}</Text>
                <Tag color={st.color} style={{ fontSize: 10, lineHeight: '14px', margin: 0 }}>{st.label}</Tag>
                <div style={{ flex: 1 }} />
                {onClose && <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClose} />}
            </div>
            <div ref={containerRef} style={{ flex: 1, overflow: 'auto', padding: 8 }}>
                {messages.length === 0 && <Text type="secondary" style={{ fontSize: 11 }}>暂无消息（子代理运行中或已清理）</Text>}
                {messages.map(m => (
                    <div key={m.id} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <MessageBubble msg={{ ...m, showReasoning: showReasoning[m.id] ?? m.showReasoning }} darkMode={darkMode}
                            onOpenFile={() => { }} onRetry={() => { }} onContinue={() => { }}
                            onToggleReasoning={(msgId, collapsed) => setShowReasoning(prev => ({ ...prev, [msgId]: !collapsed }))} />
                    </div>
                ))}
            </div>
            {onSend && (
                <div style={{ display: 'flex', gap: 6, padding: 8, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                    <Input size="small" value={input} onChange={e => setInput(e.target.value)} onPressEnter={send} placeholder={`向 ${agent.name} 发送消息…`} />
                    <Button size="small" type="primary" icon={<SendOutlined />} onClick={send} />
                </div>
            )}
        </div>
    )
}
