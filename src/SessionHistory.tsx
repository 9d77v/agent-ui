import { useState } from 'react'
import { Button, Dropdown, Input, Modal, Typography, message, theme } from 'antd'
import { PlusOutlined, PushpinFilled, PushpinOutlined } from '@ant-design/icons'
import { useAgentLocale } from './locale/index'
import type { SessionInfo } from './types'
const { Text } = Typography

interface Props {
    sessions: SessionInfo[]
    darkMode?: boolean
    onOpen: (sid: string, sessionInfo?: any) => void
    onRefresh: () => void
    currentSessionID: string
    onNewSession: () => void
    onDeleteSession?: (sessionID: string) => Promise<{ success: boolean; error?: string }>
    /** 重命名会话（成功后由宿主负责刷新列表） */
    onRenameSession?: (sessionID: string, title: string) => Promise<{ success: boolean; error?: string }>
    /** 固定/取消固定会话（成功后由宿主负责刷新列表） */
    onTogglePin?: (sessionID: string, pinned: boolean) => Promise<{ success: boolean; error?: string }>
}

/** 会话历史列表：一行一个（非卡片），右键菜单（固定/重命名/删除），标题行右侧新建（加号）。 */
export default function SessionHistory({ sessions, darkMode, onOpen, onRefresh, currentSessionID, onNewSession, onDeleteSession, onRenameSession, onTogglePin }: Props) {
    const { token } = theme.useToken()
    const loc = useAgentLocale()
    const [renaming, setRenaming] = useState<SessionInfo | null>(null)
    const [renameValue, setRenameValue] = useState('')

    const handleRename = async () => {
        if (!renaming || !onRenameSession) return
        const title = renameValue.trim()
        if (!title) return
        const r = await onRenameSession(renaming.session_id, title)
        if (r.success) {
            message.success(loc.session.renameSuccess)
            setRenaming(null)
            onRefresh()
        } else {
            message.error(r.error || loc.session.deleteFailed)
        }
    }

    const handleDelete = async (sid: string) => {
        if (!onDeleteSession) return
        const r = await onDeleteSession(sid)
        if (r.success) {
            message.success(loc.session.deleted)
            onRefresh()
            if (currentSessionID === sid) onNewSession()
        } else {
            message.error(r.error || loc.session.deleteFailed)
        }
    }

    const handleTogglePin = async (s: SessionInfo) => {
        if (!onTogglePin) return
        const r = await onTogglePin(s.session_id, !s.pinned)
        if (r.success) {
            onRefresh()
        } else {
            message.error(r.error || loc.session.deleteFailed)
        }
    }

    return (
        <div>
            {/* 标题行：会话 + 右侧新建（加号） */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text strong style={{ color: token.colorText }}>{loc.panel.history}</Text>
                <Button type="text" size="small" icon={<PlusOutlined />} onClick={onNewSession} title={loc.panel.newSession} />
            </div>

            {sessions.length === 0 ? (
                <Text type="secondary">{loc.session.noHistory}</Text>
            ) : (
                sessions.map((s) => {
                    const active = s.session_id === currentSessionID
                    return (
                        <Dropdown
                            key={s.session_id}
                            trigger={['contextMenu']}
                            menu={{
                                items: [
                                    {
                                        key: 'pin', label: s.pinned ? loc.session.unpin : loc.session.pin,
                                        icon: <PushpinOutlined />,
                                        onClick: () => handleTogglePin(s),
                                    },
                                    { key: 'rename', label: loc.session.rename, onClick: () => { setRenaming(s); setRenameValue(s.title || '') } },
                                    { type: 'divider' },
                                    {
                                        key: 'delete', label: loc.session.deleteButton, danger: true,
                                        onClick: () => Modal.confirm({
                                            title: loc.session.deleteConfirm,
                                            okText: loc.session.deleteButton,
                                            cancelText: loc.session.cancelButton,
                                            onOk: () => handleDelete(s.session_id),
                                        }),
                                    },
                                ],
                            }}
                        >
                            {/* 一行一个（非卡片）：圆点 + 两行（标题 / 时间） */}
                            <div
                                onClick={() => onOpen(s.session_id, s)}
                                style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 8,
                                    padding: '8px 4px', cursor: 'pointer', borderRadius: 4,
                                    background: active ? token.colorFillSecondary : 'transparent',
                                }}
                            >
                                <span style={{
                                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                                    background: active ? token.colorPrimary : token.colorBorder,
                                    marginTop: 7,
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <Text
                                        style={{
                                            display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            fontSize: 13,
                                            color: active ? token.colorPrimary : token.colorText,
                                            fontWeight: active ? 500 : 400,
                                        }}
                                    >
                                        {s.pinned && <PushpinFilled style={{ color: token.colorPrimary, marginRight: 4, fontSize: 11 }} />}
                                        {s.title || loc.session.untitled}
                                    </Text>
                                    {s.last_time && (
                                        <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>
                                            {s.last_time}
                                        </Text>
                                    )}
                                </div>
                            </div>
                        </Dropdown>
                    )
                })
            )}

            {/* 重命名对话框 */}
            <Modal
                open={!!renaming}
                title={loc.session.renameTitle}
                onOk={handleRename}
                onCancel={() => setRenaming(null)}
                okText={loc.session.rename}
                cancelText={loc.session.cancelButton}
                width={360}
                destroyOnHidden
            >
                <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder={loc.session.renamePlaceholder}
                    onPressEnter={handleRename}
                    autoFocus
                />
            </Modal>
        </div>
    )
}
