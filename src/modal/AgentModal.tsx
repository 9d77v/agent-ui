import type { ReactNode } from 'react'
import { Modal, Typography, theme } from 'antd'

const { Text } = Typography

export interface AgentModalProps {
    open: boolean
    onClose: () => void
    title?: string
    titleIcon?: ReactNode
    width?: number
    height?: number
    darkMode?: boolean
    children: ReactNode
    footer?: ReactNode
}

export default function AgentModal({ open, onClose, title, titleIcon, width, height, darkMode, children, footer }: AgentModalProps) {
    const { token } = theme.useToken()
    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={title ? <span><Text style={{ color: token.colorText }}>{titleIcon} {title}</Text></span> : undefined}
            width={width || 520}
            style={height ? { top: 20 } : undefined}
            footer={footer ?? null}
            destroyOnClose
        >
            {height ? <div style={{ maxHeight: height, overflow: 'auto' }}>{children}</div> : children}
        </Modal>
    )
}
