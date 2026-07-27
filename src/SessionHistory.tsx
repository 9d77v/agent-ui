import { Button, Popconfirm, Space, Typography, message, theme } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { useAgentLocale } from './locale/index'
const { Text } = Typography

interface Session { session_id: string; title: string; preview?: string; msg_count?: number; last_time?: string; token_usage?: any }
interface Props { sessions: Session[]; darkMode?: boolean; onOpen: (sid: string, sessionInfo?: any) => void; onRefresh: () => void; currentSessionID: string; onNewSession: () => void; onDeleteSession?: (sessionID: string) => Promise<{ success: boolean; error?: string }> }

export default function SessionHistory({ sessions, darkMode, onOpen, onRefresh, currentSessionID, onNewSession, onDeleteSession }: Props) {
    const { token } = theme.useToken()
    const loc = useAgentLocale()
    return <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text strong style={{ color: token.colorText }}>{loc.panel.history}</Text>
        </div>
        {sessions.length === 0 ? <Text type="secondary">{loc.session.noHistory}</Text> : sessions.map(s => (
            <div key={s.session_id} style={{ padding: '10px 12px', marginBottom: 8, borderRadius: 8, cursor: 'pointer', background: token.colorFillAlter, border: `1px solid ${token.colorBorderSecondary}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }} onClick={() => onOpen(s.session_id, s)}>
                    <Text style={{ fontSize: 13, display: 'block', marginBottom: 2, fontWeight: 500 }}>{s.title || loc.session.untitled}</Text>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{s.preview || loc.session.noMessages}</Text>
                    <Space size="small"><Text type="secondary" style={{ fontSize: 11 }}>{s.msg_count} {loc.tool.stepsLabel}</Text><Text type="secondary" style={{ fontSize: 11 }}>{s.last_time}</Text></Space>
                </div>
                <Popconfirm title={loc.session.deleteConfirm} placement="left" onConfirm={async () => { try { if (onDeleteSession) { const r = await onDeleteSession(s.session_id); if (r.success) { message.success(loc.session.deleted); onRefresh(); if (currentSessionID === s.session_id) onNewSession() } else { message.error(r.error || loc.session.deleteFailed) } } } catch { message.error(loc.session.deleteFailed) } }} okText={loc.session.deleteButton} cancelText={loc.session.cancelButton}>
                    <Button type="text" size="small" danger style={{ flexShrink: 0, marginTop: 2 }} icon={<DeleteOutlined />} onClick={e => e.stopPropagation()} />
                </Popconfirm>
            </div>
        ))}
    </div>
}
