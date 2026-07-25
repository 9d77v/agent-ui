import { Button, Dropdown } from 'antd'
import { ThunderboltOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons'
import TokenProgress from './TokenProgress'
import { useAgentLocale } from './locale/index'

interface Props { approvalMode: string; onModeChange: (mode: string) => void; tokenUsage: any; currentContextWindow: number; darkMode?: boolean }

export default function ApprovalStatusBar({ approvalMode, onModeChange, tokenUsage, currentContextWindow, darkMode }: Props) {
    const loc = useAgentLocale()
    const modeLabel = approvalMode === 'auto' ? loc.approval.modeAuto : approvalMode === 'default' ? loc.approval.modeDefault : loc.approval.modeManual
    const modeColor = approvalMode === 'bypass' ? '#1677ff' : approvalMode === 'auto' ? '#faad14' : (darkMode ? '#ffffff' : '#666')
    const modeIcon = approvalMode === 'bypass' ? <LockOutlined /> : approvalMode === 'auto' ? <UnlockOutlined /> : <ThunderboltOutlined />
    return <div style={{ display: 'flex', alignItems: 'center', padding: '2px 8px', borderTop: `1px solid ${darkMode ? '#333' : '#f0f0f0'}`, background: darkMode ? '#252525' : '#f5f5f5' }}>
        <Dropdown menu={{ onClick: ({ key }) => onModeChange(key), items: [{ key: 'default', label: loc.approval.modeDefault, icon: <ThunderboltOutlined /> }, { key: 'bypass', label: loc.approval.modeManual, icon: <LockOutlined /> }, { key: 'auto', label: loc.approval.modeAuto, icon: <UnlockOutlined /> }] }} trigger={['click']}>
            <Button type="text" size="small" style={{ fontSize: 12, color: modeColor }} icon={modeIcon}>{modeLabel}</Button>
        </Dropdown>
        <div style={{ flex: 1 }} />
        <TokenProgress tokenUsage={tokenUsage} currentContextWindow={currentContextWindow} darkMode={darkMode} />
    </div>
}
