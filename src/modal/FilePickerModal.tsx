import { useState, useEffect, useCallback } from 'react'
import { Input, Typography } from 'antd'
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

    const bg = darkMode ? '#1e1e1e' : '#fff'
    const textColor = darkMode ? '#d4d4d4' : '#333'
    const borderColor = darkMode ? '#444' : '#d9d9d9'
    const hoverBg = darkMode ? '#2a2a2a' : '#f0f0f0'
    const selectedBg = darkMode ? '#1a3a5c' : '#e6f4ff'

    return (
        <AgentModal open={open} onClose={onClose} darkMode={darkMode} title="选择文件" titleIcon={<SearchOutlined style={{ marginRight: 8 }} />} height={460}>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    <Input size="small" placeholder="搜索项目文件..."
                        prefix={<SearchOutlined style={{ color: '#999' }} />}
                        value={query}
                        onChange={e => { setQuery(e.target.value); loadFiles(e.target.value) }}
                        style={{ flex: 1, background: bg, color: textColor, borderColor }}
                        allowClear autoFocus />
                    <span onClick={() => setCaseSensitive(v => !v)}
                        style={{ cursor: 'pointer', fontSize: 12, padding: '2px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', userSelect: 'none', color: caseSensitive ? '#1677ff' : '#999', background: bg, border: `1px solid ${borderColor}` }}>
                        Aa
                    </span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', background: bg, borderRadius: 4 }}>
                    {!query ? (
                        <div style={{ padding: 12, textAlign: 'center', color: '#999', fontSize: 12 }}>输入关键字搜索项目文件</div>
                    ) : files.length === 0 ? (
                        <div style={{ padding: 12, textAlign: 'center', color: '#999', fontSize: 12 }}>无匹配文件</div>
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
                                        fontSize: 12, lineHeight: 1.6, color: textColor,
                                        background: added ? selectedBg : 'transparent',
                                    }}
                                    onMouseEnter={e => { if (!added) e.currentTarget.style.background = hoverBg }}
                                    onMouseLeave={e => { if (!added) e.currentTarget.style.background = 'transparent' }}
                                >
                                    <CheckOutlined style={{ fontSize: 11, color: added ? '#1677ff' : 'transparent', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Text ellipsis style={{ fontSize: 12, fontWeight: 500, color: textColor }}>{fileName}</Text>
                                        <Text ellipsis style={{ fontSize: 10, display: 'block', color: darkMode ? '#888' : '#999' }}>{dir}</Text>
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
