import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Button, Typography, theme } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import { defaultLocale } from './locale/index'
const { Text, Paragraph } = Typography

interface Props { children: ReactNode; onError?: (error: Error, errorInfo: ErrorInfo) => void; onReset?: () => void; darkMode?: boolean }
interface State { hasError: boolean; error: Error | null }

// HOC to inject theme token into class component
function withToken<P extends { darkMode?: boolean }>(WrappedComponent: React.ComponentType<P & { token: ReturnType<typeof theme.useToken>['token'] }>) {
    return function TokenizedComponent(props: P) {
        const { token } = theme.useToken()
        return <WrappedComponent {...props} token={token} />
    }
}

class ErrorBoundaryInner extends Component<Props & { token: ReturnType<typeof theme.useToken>['token'] }, State> {
    constructor(props: Props & { token: ReturnType<typeof theme.useToken>['token'] }) { super(props); this.state = { hasError: false, error: null } }
    private loc = defaultLocale
    static getDerivedStateFromError(error: Error): State { return { hasError: true, error } }
    componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error('[ErrorBoundary]', error, errorInfo); this.props.onError?.(error, errorInfo) }
    handleReset = () => { this.props.onReset?.(); this.setState({ hasError: false, error: null }) }
    render() {
        const t = this.props.token
        if (this.state.hasError) return <div style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, background: t.colorBgContainer, color: t.colorText, borderRadius: 8 }}>
            <WarningOutlined style={{ fontSize: 48, color: t.colorWarning }} />
            <Text strong style={{ fontSize: 16, color: t.colorText }}>{this.loc.error.title}</Text>
            <Paragraph type="secondary">{this.state.error?.message || ''}</Paragraph>
            <Button type="primary" onClick={this.handleReset}>{this.loc.error.reload}</Button>
        </div>
        return this.props.children
    }
}

const ErrorBoundary = withToken(ErrorBoundaryInner)
export default ErrorBoundary
