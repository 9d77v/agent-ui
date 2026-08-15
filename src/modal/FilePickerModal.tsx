import { useState, useEffect, useCallback, useRef } from 'react'
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

/** 搜索结果渲染上限：搜索返回可能含工作区 + 关联文件夹（如 go mod cache）的数万文件，
 * 全量渲染会卡死界面（无响应）。截断到上限并排序展示，足够选择定位文件。 */
const MAX_RESULTS = 200

export default function FilePickerModal({ open, onClose, onSearch, selectedFiles = [], onSelect, darkMode }: FilePickerModalProps) {
    const { token } = theme.useToken()
    const [query, setQuery] = useState('')
    const [files, setFiles] = useState<string[]>([])
    const [caseSensitive, setCaseSensitive] = useState(false)
    // 防抖 timer：onChange 每次按键都触发，直接同步全量搜索大工作区会卡顿/无响应。
    // 输入停止 250ms 后才真正发起搜索；结果截断到 MAX_RESULTS。
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }, [])

    const loadFiles = useCallback((q?: string) => {
        if (!q) { setFiles([]); return }
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
        searchTimerRef.current = setTimeout(async () => {
            try {
                const result = await onSearch(q)
                setFiles((result || []).slice(0, MAX_RESULTS).sort())
            } catch { setFiles([]) }
        }, 250)
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
