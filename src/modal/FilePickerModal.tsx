import { useState, useEffect, useCallback } from 'react'
import { Input, Typography, theme } from 'antd'
import { SearchOutlined, CheckOutlined } from '@ant-design/icons'
import AgentModal from './AgentModal'

const { Text } = Typography

export interface FilePickerModalProps {
    open: boolean
    onClose: () => void
    /** 搜索文件回调 */
    onSearch: (query: string) => Promise<string[]>
    /** 已选文件路径列表 */
    selectedFiles?: string[]
    /** 选择文件回调 */
    onSelect: (filePath: string) => void
    darkMode?: boolean
}

export default function FilePickerModal({ open, onClose, onSearch, selectedFiles = [], onSelect, darkMode }: FilePickerModalProps) {
    const { token } = theme.useToken()
    const [query, setQuery] = useState('')
    const [files, setFiles] = useState<string[]>([])
    const [caseSensitive, setCaseSensitive] = useState(false)

    const loadFiles = useCallback(async (q?: string) => {
        if (!q) { setFiles([]); return }
        try {
            const result = await onSearch(q)
            setFiles((result || []).sort())
        } catch { setFiles([]) }
    }, [onSearch])

    useEffect(() => { if (open) { setQuery(''); setFiles([]) } }, [open])

    return (
        <AgentModal open={open} onClose={onClose} darkMode={darkMode} title="选择文件" titleIcon={<SearchOutlined style={{ marginRight: 8 }} />} height={460}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    <Input size="small" placeholder="搜索项目文件..."
                        prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
                        value={query}
                        onChange={e => { setQuery(e.target.value); loadFiles(e.target.value) }}
                        style={{ flex: 1 }}
                        allowClear autoFocus />
                    <span onClick={() => setCaseSensitive(v => !v)}
                        style={{ cursor: 'pointer', fontSize: 12, padding: '2px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', userSelect: 'none', color: caseSensitive ? token.colorPrimary : token.colorTextTertiary, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` }}>
                        Aa
                    </span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', background: token.colorBgContainer, borderRadius: 4 }}>
                    {!query ? (
                        <div style={{ padding: 12, textAlign: 'center', color: token.colorTextTertiary, fontSize: 12 }}>输入关键字搜索项目文件</div>
                    ) : files.length === 0 ? (
                        <div style={{ padding: 12, textAlign: 'center', color: token.colorTextTertiary, fontSize: 12 }}>无匹配文件</div>
                    ) : (
                        files.map((fp, i) => {
                            const fileName = fp.replace(/\\/g, '/').split('/').pop() || fp
                            const dir = fp.replace(/\\/g, '/').split('/').slice(0, -1).join('/')
                            const added = selectedFiles.some(f => f === fp)
                            return (
                                <div key={i}
                                    onClick={() => { onSelect(fp); onClose() }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '4px 6px', borderRadius: 3, cursor: 'pointer',
                                        fontSize: 12, lineHeight: 1.6, color: token.colorText,
                                        background: added ? token.colorPrimaryBg : 'transparent',
                                    }}
                                    onMouseEnter={e => { if (!added) e.currentTarget.style.background = token.colorFillAlter }}
                                    onMouseLeave={e => { if (!added) e.currentTarget.style.background = 'transparent' }}
                                >
                                    <CheckOutlined style={{ fontSize: 11, color: added ? token.colorPrimary : 'transparent', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Text ellipsis style={{ fontSize: 12, fontWeight: 500, color: token.colorText }}>{fileName}</Text>
                                        <Text ellipsis style={{ fontSize: 10, display: 'block', color: token.colorTextTertiary }}>{dir}</Text>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </AgentModal>
    )
}
