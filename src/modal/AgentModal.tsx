import type { ReactNode } from 'react'
import { Modal, Typography } from 'antd'

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
    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={title ? <span><Text style={{ color: darkMode ? '#d4d4d4' : undefined }}>{titleIcon} {title}</Text></span> : undefined}
            width={width || 520}
            style={height ? { top: 20 } : undefined}
            footer={footer ?? null}
            destroyOnClose
        >
            {height ? <div style={{ maxHeight: height, overflow: 'auto' }}>{children}</div> : children}
        </Modal>
    )
}
