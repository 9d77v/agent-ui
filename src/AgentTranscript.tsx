import { useState } from 'react'
import { Typography, Input, Button, Tag, theme } from 'antd'
import { SendOutlined, CloseOutlined, RobotOutlined } from '@ant-design/icons'
import MessageBubble from './MessageBubble'
import type { AgentStatus } from './types'
import type { AgentMessage } from './hooks/useMessageTree'

const { Text } = Typography

/**
 * AgentTranscript 子代理独立对话视图：展示子代理自己的消息流，底部可发送 follow-up（唤醒续跑）。
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
    const send = () => {
        const t = input.trim()
        if (!t) return
        onSend?.(t)
        setInput('')
    }
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 6,
            background: darkMode ? '#1e1e1e' : '#fff',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                <RobotOutlined style={{ color: token.colorPrimary }} />
                <Text strong style={{ fontSize: 12 }}>{agent.name}</Text>
                <Tag color="processing" style={{ fontSize: 10, lineHeight: '14px', margin: 0 }}>{agent.status}</Tag>
                <div style={{ flex: 1 }} />
                {onClose && <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClose} />}
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
                {messages.length === 0 && <Text type="secondary" style={{ fontSize: 11 }}>暂无消息（子代理运行中或已清理）</Text>}
                {messages.map(m => (
                    <MessageBubble key={m.id} msg={m} darkMode={darkMode}
                        onOpenFile={() => { }} onRetry={() => { }} onContinue={() => { }} onToggleReasoning={() => { }} />
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
