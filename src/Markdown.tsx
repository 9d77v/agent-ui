import { theme } from 'antd'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * MarkdownRenderer 共享 markdown 渲染组件（MessageBubble / PlanReview 等共用）。
 * ReactMarkdown + remarkGfm + antd token 主题样式注入（.markdown-body class 承接收敛样式）。
 * 提取自 MessageBubble.tsx 原内部实现，避免多处重复同款渲染。
 */
export default function MarkdownRenderer({ content }: { content: string }) {
    const { token } = theme.useToken()
    const extraStyle = `
        .markdown-body pre { background: ${token.colorFillContent} !important; border-color: ${token.colorBorderSecondary} !important; }
        .markdown-body code { background: ${token.colorFillSecondary} !important; color: ${token.colorText} !important; }
        .markdown-body pre code { background: transparent !important; }
        .markdown-body th { background: ${token.colorFillAlter} !important; }
        .markdown-body td, .markdown-body th { border-color: ${token.colorBorderSecondary} !important; }
        .markdown-body blockquote { color: ${token.colorTextSecondary} !important; }
    `
    return <div className="markdown-body" style={{ fontSize: 13, lineHeight: 1.6, color: token.colorText }}>
        <style>{extraStyle}</style>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
}
