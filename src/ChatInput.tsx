import { useState, useEffect } from 'react'
import { Input, Button, Select, Tooltip, Dropdown, Typography, Space, Modal, theme } from 'antd'
import { CheckOutlined, SettingOutlined, FileAddOutlined, PictureOutlined, PlusOutlined, CloseOutlined, ToolOutlined, ArrowUpOutlined } from '@ant-design/icons'
import { useAgentLocale } from './locale/index'
import type { ModelOption, SelectedFile, SelectedImage } from './types'

const { Text } = Typography
const { TextArea } = Input

export interface ChatInputProps {
    /** 受控模式可选：外部传入时同步；不传则组件内部管理文本（推荐，打字只重渲染 ChatInput，避免父组件整树重渲染卡顿） */
    inputText?: string
    onInputChange?: (v: string) => void
    onSend: (text?: string) => void
    sending: boolean; onCancel: () => void; onKeyDown?: (e: React.KeyboardEvent) => void
    darkMode?: boolean; onFilePickerOpen?: () => void; includeProjectDocs?: boolean; onToggleDocs?: () => void
    modelOptions?: ModelOption[]
    currentModel?: string; onModelChange?: (v: string) => void; onManageModels?: () => void
    thinking?: string; onThinkingChange?: (v: string) => void; onToolConfigOpen?: () => void
    selectedFiles?: SelectedFile[]
    selectedImages?: SelectedImage[]
    /** 单条消息最大可附加图片数（用于显示「已选 n/max」；缺省不显示） */
    maxImages?: number
    onAddImageOpen?: () => void
    onRemoveImage?: (index: number) => void
    onRemoveFile?: (index: number) => void
    onPasteImage?: (file: File) => void
    /** 快捷文本（Agent 面板输入组件一键发送；label=text，hover chip 展开点击即发送） */
    quickTexts?: string[]
}

export default function ChatInput(p: ChatInputProps) {
    const { inputText, onInputChange, onSend, sending, onCancel, onKeyDown } = p
    const { token } = theme.useToken()
    const loc = useAgentLocale()
    // 非受控模式：文本由组件内部管理（打字只重渲染 ChatInput，避免父组件整树重渲染卡顿）；
    // 兼容受控模式：外部传入 inputText 时同步。
    const [text, setText] = useState(inputText || '')
    // 输入聚焦状态：聚焦时整个 ChatInput 显示蓝色边框（VSCode 风格，而非仅 textarea）
    const [focused, setFocused] = useState(false)
    // 图片大图预览（点击缩略图打开 Modal；关闭按钮位于图片右上角）
    const [previewImg, setPreviewImg] = useState<SelectedImage | null>(null)
    useEffect(() => {
        if (inputText !== undefined) setText(inputText)
    }, [inputText])
    const handleChange = (v: string) => {
        setText(v)
        onInputChange?.(v)
    }
    // 是否有可发送内容（文本非空，或已附加文件/图片）
    const canSend = !!text.trim() || !!p.selectedImages?.length || !!p.selectedFiles?.length
    // 是否有快捷文本（合并到发送按钮：hover 展开点击即发送）
    const hasQuick = !!(p.quickTexts && p.quickTexts.length > 0)
    const send = () => {
        if (sending || !canSend) return
        onSend(text)
        setText('')
    }
    const thinkingItems = [
        { key: 'off', label: loc.chatInput.thinkingOff },
        { key: 'default', label: loc.chatInput.thinkingDefault },
        { key: 'deep', label: loc.chatInput.thinkingDeep },
    ]
    const formatLabel = loc.formatModelLabel || ((v: string) => v.includes('||') ? v.split('||')[1] : v)
    return (
        // 整体为圆角边框盒子（VSCode 风格）：聚焦时整个 ChatInput 范围显示主题色边框
        <div
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
                border: `1px solid ${focused ? token.colorPrimary : token.colorBorderSecondary}`,
                borderRadius: 8,
                transition: 'border-color 0.2s ease',
            }}
        >
            {p.selectedFiles && p.selectedFiles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 8px 0' }}>
                    {p.selectedFiles.map((f, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '1px 6px', borderRadius: 4, fontSize: 11, background: token.colorFillAlter, color: token.colorPrimary, maxWidth: 160 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path.split('/').pop() || f.path}</span>
                            <CloseOutlined style={{ cursor: 'pointer', fontSize: 10, color: token.colorTextTertiary }} onClick={() => p.onRemoveFile?.(i)} />
                        </span>
                    ))}
                </div>
            )}
            {p.selectedImages && p.selectedImages.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 8px 0' }}>
                    {p.maxImages ? (
                        <span style={{ fontSize: 11, color: token.colorTextTertiary, alignSelf: 'center', marginRight: 2 }}>
                            {loc.chatInput.imageCountLabel.replace('{n}', String(p.selectedImages.length)).replace('{max}', String(p.maxImages))}
                        </span>
                    ) : null}
                    {p.selectedImages.map((img, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 4, fontSize: 11, background: token.colorFillAlter, color: token.colorPrimary, maxWidth: 200 }}>
                            <img src={img.preview || img.url} alt={img.name} onClick={() => setPreviewImg(img)} style={{ width: 22, height: 22, objectFit: 'cover', borderRadius: 3, cursor: 'zoom-in' }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.name}</span>
                            <CloseOutlined style={{ cursor: 'pointer', fontSize: 10, color: token.colorTextTertiary }} onClick={() => p.onRemoveImage?.(i)} />
                        </span>
                    ))}
                </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px' }}>
                <TextArea value={text} onChange={e => handleChange(e.target.value)}
                    onKeyDown={(e) => {
                        // 非受控模式下在组件内处理 Enter 发送（父组件不再持有 inputText）
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            send()
                            return
                        }
                        onKeyDown?.(e)
                    }}
                    onPaste={(e) => {
                        // Ctrl+V 粘贴图片：剪贴板含图片文件时拦截，交给宿主上传（不走文本粘贴）
                        const items = e.clipboardData?.items
                        if (!items) return
                        for (const it of items) {
                            if (it.kind === 'file' && it.type.startsWith('image/')) {
                                const file = it.getAsFile()
                                if (file) {
                                    e.preventDefault()
                                    p.onPasteImage?.(file)
                                }
                                break
                            }
                        }
                    }}
                    placeholder={loc.chatInput.placeholder} autoSize={{ minRows: 2, maxRows: 6 }} disabled={sending}
                    variant="borderless" style={{ flex: 1, background: 'transparent', padding: '8px 0 8px 10px', resize: 'none', fontSize: 13, outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', borderTop: `1px solid ${token.colorBorderSecondary}`, gap: 2 }}>
                {/* 十字添加按钮：hover 展开「添加文件 / 添加图片」两个选项（点击流程与原来一致） */}
                {(p.onFilePickerOpen || p.onAddImageOpen) && (
                    <Dropdown
                        trigger={['hover']}
                        menu={{
                            items: [
                                ...(p.onFilePickerOpen ? [{ key: 'file', icon: <FileAddOutlined />, label: loc.chatInput.addFileTooltip }] : []),
                                ...(p.onAddImageOpen ? [{ key: 'image', icon: <PictureOutlined />, label: loc.chatInput.addImageTooltip }] : []),
                            ],
                            onClick: ({ key }) => {
                                if (key === 'file') p.onFilePickerOpen?.()
                                else if (key === 'image') p.onAddImageOpen?.()
                            },
                        }}
                    >
                        <Button type="text" size="small" icon={<PlusOutlined style={{ fontSize: 14 }} />} />
                    </Dropdown>
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
                    {p.onToolConfigOpen && <Tooltip title={loc.chatInput.toolConfigTooltip}><Button type="text" size="small" icon={<ToolOutlined style={{ fontSize: 14 }} />} onClick={p.onToolConfigOpen} /></Tooltip>}
                </>}
                <div style={{ flex: 1 }} />
                {/* 发送/停止按钮：快捷文本已合并到发送按钮——hover 展开快捷文本列表（点击某项即发送），点击按钮主体发送当前输入；运行中变为停止 */}
                {sending ? (
                    <Tooltip title={loc.chatInput.stopTooltip}>
                        {/* VSCode stop 图标：实心方块（antd 无该图标，用 span 绘制） */}
                        <Button type="text" size="small" icon={<span style={{ display: 'inline-block', width: 10, height: 10, background: token.colorError, borderRadius: 2 }} />} onClick={onCancel} style={{ color: token.colorError }} />
                    </Tooltip>
                ) : (
                    <Dropdown
                        trigger={['hover']}
                        disabled={!hasQuick}
                        menu={{
                            items: (p.quickTexts || []).map((t, i) => ({ key: String(i), label: t })),
                            onClick: ({ key }) => onSend(p.quickTexts![Number(key)]),
                        }}
                    >
                        {/* 发送按钮：不设 tooltip（hover 时快捷文本下拉本身即提示，避免上弹 tooltip 下弹菜单的叠加干扰） */}
                        <Button type="text" size="small" icon={<ArrowUpOutlined style={{ fontSize: 16 }} />} onClick={send} disabled={!canSend && !hasQuick} style={canSend || hasQuick ? { color: token.colorPrimary } : undefined} />
                    </Dropdown>
                )}
            </div>

            {/* 图片大图预览（Modal 右上角 X 即图片右上角，避免与窗口关闭按钮重叠） */}
            {previewImg && (
                <Modal
                    open
                    onCancel={() => setPreviewImg(null)}
                    footer={null}
                    title={null}
                    centered
                    width="fit-content"
                    styles={{ body: { padding: 8 } }}
                >
                    <img
                        src={previewImg.preview || previewImg.url}
                        alt={previewImg.name}
                        style={{ maxWidth: '70vw', maxHeight: '70vh', display: 'block' }}
                    />
                </Modal>
            )}
        </div>
    )
}
