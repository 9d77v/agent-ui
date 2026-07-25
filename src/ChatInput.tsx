import { Input, Button, Select, Tooltip, Dropdown, Typography, Space } from 'antd'
import { CheckOutlined, SettingOutlined, FileAddOutlined, ToolOutlined, PauseCircleOutlined, EnterOutlined } from '@ant-design/icons'
import { useAgentLocale } from './locale/index'

const { Text } = Typography
const { TextArea } = Input

export interface ChatInputProps {
    inputText: string; onInputChange: (v: string) => void; onSend: () => void
    sending: boolean; onCancel: () => void; onKeyDown: (e: React.KeyboardEvent) => void
    darkMode?: boolean; onFilePickerOpen?: () => void; includeProjectDocs?: boolean; onToggleDocs?: () => void
    modelOptions?: { label: string; value: string; providerId: string }[]
    currentModel?: string; onModelChange?: (v: string) => void; onManageModels?: () => void
    thinking?: string; onThinkingChange?: (v: string) => void; onToolConfigOpen?: () => void
    selectedFiles?: { path: string; startLine?: number; endLine?: number }[]
}

const agentBorderColor = (d?: boolean) => d ? '#333' : '#f0f0f0'

export default function ChatInput(p: ChatInputProps) {
    const { darkMode, inputText, onInputChange, onSend, sending, onCancel, onKeyDown } = p
    const loc = useAgentLocale()
    const thinkingItems = [
        { key: 'off', label: loc.chatInput.thinkingOff },
        { key: 'default', label: loc.chatInput.thinkingDefault },
        { key: 'deep', label: loc.chatInput.thinkingDeep },
    ]
    const formatLabel = loc.formatModelLabel || ((v: string) => v.includes('||') ? v.split('||')[1] : v)
    return (
        <div style={{ borderTop: `1px solid ${agentBorderColor(darkMode)}` }}>
            {p.selectedFiles && p.selectedFiles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 8px 0' }}>
                    {p.selectedFiles.map((f, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '1px 6px', borderRadius: 4, fontSize: 11, background: darkMode ? '#333' : '#e6f4ff', color: darkMode ? '#d4d4d4' : '#1677ff', maxWidth: 160 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path.split('/').pop() || f.path}</span>
                        </span>
                    ))}
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px' }}>
                <TextArea value={inputText} onChange={e => onInputChange(e.target.value)} onKeyDown={onKeyDown}
                    placeholder={loc.chatInput.placeholder} autoSize={{ minRows: 2, maxRows: 6 }} disabled={sending}
                    variant="borderless" style={{ flex: 1, background: 'transparent', padding: '8px 0 8px 10px', resize: 'none', fontSize: 13 }} />
                <div style={{ padding: '4px 6px 4px 0', flexShrink: 0 }}>
                    {sending ? <Tooltip title={loc.chatInput.stopTooltip}><Button shape="circle" size="small" danger icon={<PauseCircleOutlined style={{ fontSize: 16 }} />} onClick={onCancel} /></Tooltip>
                        : <Tooltip title={loc.chatInput.sendTooltip}><Button type="primary" shape="circle" size="small" icon={<EnterOutlined style={{ fontSize: 16 }} />} onClick={onSend} disabled={!inputText.trim()} /></Tooltip>}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderTop: `1px solid ${agentBorderColor(darkMode)}`, gap: 2 }}>
                <Tooltip title={loc.chatInput.addFileTooltip}><Button type="text" size="small" icon={<FileAddOutlined />} onClick={p.onFilePickerOpen} /></Tooltip>
                {p.onToggleDocs && <Tooltip title={p.includeProjectDocs ? loc.chatInput.docsAttachedTooltip : loc.chatInput.docsNotAttachedTooltip}>
                    <Button type="text" size="small" icon={<span style={{ fontSize: 13 }}>📄</span>} onClick={p.onToggleDocs} style={{ color: p.includeProjectDocs ? '#1677ff' : '#999', fontSize: 12 }}>{p.includeProjectDocs ? loc.chatInput.docsLabel : loc.chatInput.noDocsLabel}</Button>
                </Tooltip>}
                <div style={{ width: 1, height: 16, background: agentBorderColor(darkMode), margin: '0 2px' }} />
                <Dropdown menu={{ items: [...(p.modelOptions || []).map(m => ({ key: m.value, icon: m.value === p.currentModel ? <CheckOutlined style={{ color: '#1677ff' }} /> : undefined, label: (() => { const sep = m.label.lastIndexOf(' / '); return sep === -1 ? m.label : <span>{m.label.slice(0, sep)} <span style={{ color: '#999', fontSize: 11 }}>{m.label.slice(sep + 3)}</span></span> })() })), { type: 'divider' }, { key: 'manage-models', label: <Space><SettingOutlined />{loc.chatInput.manageModelsLabel}</Space> }], onClick: ({ key }) => { if (key === 'manage-models') p.onManageModels?.(); else p.onModelChange?.(key) } }} trigger={['click']}>
                    <Button type="text" size="small" style={{ fontSize: 12, maxWidth: 140 }}>{p.currentModel ? <Text ellipsis style={{ maxWidth: 110, fontSize: 12 }}>{formatLabel(p.currentModel)}</Text> : loc.chatInput.modelLabel}</Button>
                </Dropdown>
                {(p.modelOptions || []).length > 0 && <>
                    <div style={{ width: 1, height: 16, background: agentBorderColor(darkMode), margin: '0 2px' }} />
                    <Select size="small" value={p.thinking} onChange={p.onThinkingChange} style={{ minWidth: 50 }} options={thinkingItems.map(t => ({ label: t.label, value: t.key }))} variant="borderless" suffixIcon={null} popupMatchSelectWidth={false} />
                    <div style={{ width: 1, height: 16, background: agentBorderColor(darkMode), margin: '0 2px' }} />
                    <Tooltip title={loc.chatInput.toolConfigTooltip}><Button type="text" size="small" icon={<ToolOutlined style={{ fontSize: 14 }} />} onClick={p.onToolConfigOpen} /></Tooltip>
                </>}
                <div style={{ flex: 1 }} />
            </div>
        </div>
    )
}
