import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Button, Typography } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import { defaultLocale } from './locale/index'
const { Text, Paragraph } = Typography

interface Props { children: ReactNode; onError?: (error: Error, errorInfo: ErrorInfo) => void; onReset?: () => void }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) { super(props); this.state = { hasError: false, error: null } }
    private loc = defaultLocale
    static getDerivedStateFromError(error: Error): State { return { hasError: true, error } }
    componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error('[ErrorBoundary]', error, errorInfo); this.props.onError?.(error, errorInfo) }
    handleReset = () => { this.props.onReset?.(); this.setState({ hasError: false, error: null }) }
    render() {
        if (this.state.hasError) return <div style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <WarningOutlined style={{ fontSize: 48, color: '#faad14' }} />
            <Text strong style={{ fontSize: 16 }}>{this.loc.error.title}</Text>
            <Paragraph type="secondary">{this.state.error?.message || ''}</Paragraph>
            <Button type="primary" onClick={this.handleReset}>{this.loc.error.reload}</Button>
        </div>
        return this.props.children
    }
}
