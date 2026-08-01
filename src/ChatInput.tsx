import { Input, Button, Select, Tooltip, Dropdown, Typography, Space, theme } from 'antd'
import { CheckOutlined, SettingOutlined, FileAddOutlined, PictureOutlined, CloseOutlined, ToolOutlined, PauseCircleOutlined, EnterOutlined } from '@ant-design/icons'
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
    selectedImages?: { path: string; name: string; data: string }[]
    onAddImageOpen?: () => void
    onRemoveImage?: (index: number) => void
}

export default function ChatInput(p: ChatInputProps) {
    const { inputText, onInputChange, onSend, sending, onCancel, onKeyDown } = p
    const { token } = theme.useToken()
    const loc = useAgentLocale()
    const thinkingItems = [
        { key: 'off', label: loc.chatInput.thinkingOff },
        { key: 'default', label: loc.chatInput.thinkingDefault },
        { key: 'deep', label: loc.chatInput.thinkingDeep },
    ]
    const formatLabel = loc.formatModelLabel || ((v: string) => v.includes('||') ? v.split('||')[1] : v)
    return (
        <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
            {p.selectedFiles && p.selectedFiles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 8px 0' }}>
                    {p.selectedFiles.map((f, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '1px 6px', borderRadius: 4, fontSize: 11, background: token.colorFillAlter, color: token.colorPrimary, maxWidth: 160 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path.split('/').pop() || f.path}</span>
                        </span>
                    ))}
                </div>
            )}
            {p.selectedImages && p.selectedImages.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 8px 0' }}>
                    {p.selectedImages.map((img, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 4, fontSize: 11, background: token.colorFillAlter, color: token.colorPrimary, maxWidth: 180 }}>
                            <img src={`data:image/webp;base64,${img.data}`} alt={img.name} style={{ width: 18, height: 18, objectFit: 'cover', borderRadius: 3 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.name}</span>
                            <CloseOutlined style={{ cursor: 'pointer', fontSize: 10, color: token.colorTextTertiary }} onClick={() => p.onRemoveImage?.(i)} />
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
                        : <Tooltip title={loc.chatInput.sendTooltip}><Button type="primary" shape="circle" size="small" icon={<EnterOutlined style={{ fontSize: 16 }} />} onClick={onSend} disabled={!inputText.trim() && !(p.selectedImages && p.selectedImages.length > 0)} /></Tooltip>}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderTop: `1px solid ${token.colorBorderSecondary}`, gap: 2 }}>
                <Tooltip title={loc.chatInput.addFileTooltip}><Button type="text" size="small" icon={<FileAddOutlined />} onClick={p.onFilePickerOpen} /></Tooltip>
                {p.onAddImageOpen && (
                    <Tooltip title={loc.chatInput.addImageTooltip}><Button type="text" size="small" icon={<PictureOutlined />} onClick={p.onAddImageOpen} /></Tooltip>
                )}
                {p.onToggleDocs && <Tooltip title={p.includeProjectDocs ? loc.chatInput.docsAttachedTooltip : loc.chatInput.docsNotAttachedTooltip}>
                    <Button type="text" size="small" icon={<span style={{ fontSize: 13 }}>📄</span>} onClick={p.onToggleDocs} style={{ color: p.includeProjectDocs ? token.colorPrimary : token.colorTextTertiary, fontSize: 12 }}>{p.includeProjectDocs ? loc.chatInput.docsLabel : loc.chatInput.noDocsLabel}</Button>
                </Tooltip>}
                <div style={{ width: 1, height: 16, background: token.colorBorderSecondary, margin: '0 2px' }} />
                <Dropdown menu={{ items: [...(p.modelOptions || []).map(m => ({ key: m.value, icon: m.value === p.currentModel ? <CheckOutlined style={{ color: token.colorPrimary }} /> : undefined, label: (() => { const sep = m.label.lastIndexOf(' / '); return sep === -1 ? m.label : <span>{m.label.slice(0, sep)} <span style={{ color: token.colorTextTertiary, fontSize: 11 }}>{m.label.slice(sep + 3)}</span></span> })() })), { type: 'divider' }, { key: 'manage-models', label: <Space><SettingOutlined />{loc.chatInput.manageModelsLabel}</Space> }], onClick: ({ key }) => { if (key === 'manage-models') p.onManageModels?.(); else p.onModelChange?.(key) } }} trigger={['click']}>
                    <Button type="text" size="small" style={{ fontSize: 12, maxWidth: 140 }}>{p.currentModel ? <Text ellipsis style={{ maxWidth: 110, fontSize: 12 }}>{formatLabel(p.currentModel)}</Text> : loc.chatInput.modelLabel}</Button>
                </Dropdown>
                {(p.modelOptions || []).length > 0 && <>
                    <div style={{ width: 1, height: 16, background: token.colorBorderSecondary, margin: '0 2px' }} />
                    <Select size="small" value={p.thinking} onChange={p.onThinkingChange} style={{ minWidth: 50 }} options={thinkingItems.map(t => ({ label: t.label, value: t.key }))} variant="borderless" suffixIcon={null} popupMatchSelectWidth={false} />
                    <div style={{ width: 1, height: 16, background: token.colorBorderSecondary, margin: '0 2px' }} />
                    <Tooltip title={loc.chatInput.toolConfigTooltip}><Button type="text" size="small" icon={<ToolOutlined style={{ fontSize: 14 }} />} onClick={p.onToolConfigOpen} /></Tooltip>
                </>}
                <div style={{ flex: 1 }} />
            </div>
        </div>
    )
}
