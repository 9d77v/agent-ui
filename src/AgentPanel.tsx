import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { Button, Tooltip, message, theme } from 'antd'
import { RobotOutlined, CloseOutlined, PlusOutlined, HistoryOutlined } from '@ant-design/icons'
import { useMessageTree, type AgentMessage } from './hooks/useMessageTree'
import { useAgentWebSocket } from './hooks/useAgentWebSocket'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import ApprovalStatusBar from './ApprovalStatusBar'
import CommandApproval from './CommandApproval'
import SessionHistory from './SessionHistory'
import QuestionnaireForm from './QuestionnaireForm'
import ErrorBoundary from './ErrorBoundary'
import { AgentUIContext, defaultLocale, type AgentUILocale } from './locale/index'
import { ToolConfigModal, FilePickerModal } from './modal'
import type { ToolTreeNode } from './modal'

export interface SessionInfo {
    session_id: string
    title: string
    preview?: string
    msg_count?: number
    last_time?: string
    token_usage?: any
}

export interface PanelProps {
    getWebSocketURL: () => Promise<string>
    toolNameLabels?: Record<string, string>
    /** 工具名→显示名的映射（如 { read_file: 'Read File' }）。未设置的项回退到工具原名 */
    toolDisplayNames?: Record<string, string>
    /** 自定义 locale 文本。未设置的字段使用默认英文 */
    locale?: Partial<AgentUILocale>
    /** 模型显示名格式化函数。默认：含 || 时取后半部分 */
    formatModelLabel?: (modelValue: string) => string
    extraPanels?: ReactNode
    /** 工具配置（传入则渲染内置 ToolConfigModal） */
    toolConfig?: {
        tree: ToolTreeNode[]
        enabled?: Record<string, boolean>
        onChange?: (enabledKeys: string[]) => void
    }
    /** 文件搜索（传入则渲染内置 FilePickerModal） */
    filePicker?: {
        onSearch: (query: string) => Promise<string[]>
        onSelect: (filePath: string) => void
    }
    sessionID: string
    setSessionID: (id: string) => void
    onNewSession?: () => void
    collapsed: boolean
    onToggle: () => void
    darkMode?: boolean
    modelOptions?: { label: string; value: string; providerId: string }[]
    currentModel?: string
    onModelChange?: (v: string) => void
    onManageModels?: () => void
    thinking?: string
    onThinkingChange?: (v: string) => void
    onFilePickerOpen?: () => void
    includeProjectDocs?: boolean
    onToggleDocs?: () => void
    onToolConfigOpen?: () => void
    selectedFiles?: { path: string; startLine?: number; endLine?: number }[]
    readFileContent?: (path: string, startLine?: number, endLine?: number) => Promise<any>
    onClearFiles?: () => void
    selectedImages?: { url: string; name: string }[]
    onAddImageOpen?: () => void
    onRemoveImage?: (index: number) => void
    onClearImages?: () => void
    sessions?: SessionInfo[]
    onLoadSessions?: () => Promise<void>
    onOpenSession?: (sid: string, sessionInfo?: SessionInfo) => Promise<AgentMessage[]>
    onDeleteSession?: (sessionID: string) => Promise<{ success: boolean; error?: string }>
    tokenUsage?: any
    currentContextWindow?: number
    activeProviderId?: string
    workspaceRoot?: string
    onToggleReasoning?: (msgId: string, collapsed: boolean) => void
}

export default function FrameworkAgentPanel(props: PanelProps) {
    const { collapsed, onToggle, darkMode, toolNameLabels } = props
    const { token } = theme.useToken()
    const mergedLocale = useMemo<AgentUILocale>(() => ({ ...defaultLocale, ...props.locale }), [props.locale])
    const msgTree = useMessageTree()
    const [sessionID, setSessionID] = useState(props.sessionID || '')
    const [inputText, setInputText] = useState('')
    const [showHistory, setShowHistory] = useState(false)
    const [approvalMode, setApprovalMode] = useState<string>('default')
    const [sessions, setSessions] = useState<SessionInfo[]>(props.sessions || [])

    const ws = useAgentWebSocket({
        messageTree: msgTree, sessionID,
        currentModel: props.currentModel || '',
        activeProviderId: props.activeProviderId || '',
        thinking: props.thinking || 'off',
        approvalMode,
        includeProjectDocs: props.includeProjectDocs !== undefined ? props.includeProjectDocs : true,
        selectedFiles: props.selectedFiles || [],
        workspaceRoot: props.workspaceRoot,
        getWebSocketURL: props.getWebSocketURL,
    })
    const sending = ws.sending
    const pendingApproval = ws.pendingApprovals.length > 0 ? ws.pendingApprovals[0] : null
    const [questionnaireData, setQuestionnaireData] = useState<{ id: string; questions: any[] } | null>(null)
    const [toolConfigOpen, setToolConfigOpen] = useState(false)
    const [filePickerOpen, setFilePickerOpen] = useState(false)

    useEffect(() => { setSessionID(props.sessionID); if (!props.sessionID) msgTree.clearMessages() }, [props.sessionID])
    useEffect(() => { if (props.sessions) setSessions(props.sessions) }, [props.sessions])
    useEffect(() => { setQuestionnaireData(ws.questionnaireData) }, [ws.questionnaireData])

    const handleSend = useCallback(async () => {
        const images = props.selectedImages || []
        const files = props.selectedFiles || []
        // 空请求拦截：文字、图片、文件三者都为空才禁止发送
        if (!inputText.trim() && images.length === 0 && files.length === 0) { message.warning(mergedLocale.chatInput.placeholder); return }
        if (ws.sending) return
        let fullText = inputText
        if (files.length > 0 && props.readFileContent) {
            const contents: string[] = []
            for (const f of files) {
                try {
                    const r: any = await props.readFileContent(f.path, f.startLine, f.endLine)
                    if (r?.success && r.content) {
                        const body = typeof r.content === 'string' ? r.content : (r.content.content || JSON.stringify(r.content))
                        contents.push('### ' + f.path + '\n```\n' + body.slice(0, 3000) + '\n```')
                    }
                } catch {}
            }
            if (contents.length > 0) fullText = inputText + '\n\n---\n' + contents.join('\n\n')
        }
        setInputText('')
        ws.sendText(fullText, images.map(img => ({ url: img.url })))
        if (props.onClearFiles) props.onClearFiles()
        if (props.onClearImages) props.onClearImages()
    }, [inputText, ws, props.selectedFiles, props.readFileContent, props.onClearFiles, props.selectedImages, props.onClearImages])

    const contextValue = useMemo(() => ({
        ...mergedLocale,
        toolDisplayNames: props.toolDisplayNames,
        formatModelLabel: props.formatModelLabel,
        darkMode,
    }), [mergedLocale, props.toolDisplayNames, props.formatModelLabel, darkMode])

    if (collapsed) {
        return (
            <div style={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 12, borderLeft: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer }}>
                <Tooltip title={mergedLocale.panel.title} placement="left"><Button type="text" icon={<RobotOutlined style={{ fontSize: 22, color: token.colorPrimary }} />} onClick={onToggle} /></Tooltip>
            </div>
        )
    }

    return (
        <AgentUIContext.Provider value={contextValue}>
        <ErrorBoundary onReset={() => msgTree.clearMessages()} darkMode={darkMode}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%', borderLeft: `1px solid ${token.colorBorderSecondary}`, background: token.colorBgContainer }}>
                <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: `1px solid ${token.colorBorderSecondary}`, flexShrink: 0 }}>
                    <RobotOutlined style={{ fontSize: 18, color: token.colorPrimary, marginRight: 8 }} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: token.colorText }}>{mergedLocale.panel.title}</span>
                    <Tooltip title={mergedLocale.panel.history}><Button type="text" size="small" icon={<HistoryOutlined />} onClick={() => { const next = !showHistory; setShowHistory(next); if (next) props.onLoadSessions?.() }} /></Tooltip>
                    <Tooltip title={mergedLocale.panel.newSession}><Button type="text" size="small" icon={<PlusOutlined />} onClick={() => { msgTree.clearMessages(); props.onNewSession?.(); setShowHistory(false) }} /></Tooltip>
                    <Button type="text" size="small" icon={<CloseOutlined />} onClick={onToggle} />
                </div>

                {showHistory && (
                    <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
                        <SessionHistory sessions={sessions} darkMode={darkMode} onDeleteSession={props.onDeleteSession}
                            onOpen={async (sid, sessionInfo) => { props.setSessionID(sid); setShowHistory(false); if (props.onOpenSession) { msgTree.clearMessages(); const msgs = await props.onOpenSession(sid, sessionInfo); for (const m of msgs) msgTree.addMessage(m) } }}
                            onRefresh={() => props.onLoadSessions?.()} currentSessionID={sessionID}
                            onNewSession={() => { msgTree.clearMessages(); props.onNewSession?.(); setShowHistory(false) }} />
                    </div>
                )}

                {!showHistory && (
                    <>
                        {props.extraPanels}
                        {questionnaireData && !sending && (
                            <QuestionnaireForm steps={questionnaireData.questions || []} initialAnswers={undefined}
                                onComplete={(answers: string) => { ws.sendText(answers); setQuestionnaireData(null) }} darkMode={darkMode} />
                        )}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <MessageList messageOrder={msgTree.messageOrder} messageMap={msgTree.messageMap}
                                darkMode={darkMode} streamingMsgId={ws.streamingMsgId} toolNameLabels={toolNameLabels}
                                onOpenFile={ws.handleOpenFile} onRevertFile={ws.handleRevertFile} onRetry={ws.handleRetry}
                                onContinue={ws.handleContinue}
                                onToggleReasoning={(msgId, collapsed) => msgTree.updateMessage(msgId, msg => ({ ...msg, showReasoning: !collapsed }))} />
                        </div>
                    </>
                )}

                {!showHistory && (
                    <>
                        {pendingApproval && (
                            <CommandApproval approvalId={pendingApproval.approvalId} command={pendingApproval.command}
                                riskLevel={pendingApproval.riskLevel}
                                onApprove={() => ws.handleApproveTool(pendingApproval.approvalId)}
                                onReject={() => ws.handleRejectTool(pendingApproval.approvalId)} darkMode={darkMode} />
                        )}
                        <ChatInput inputText={inputText} onInputChange={setInputText} onSend={handleSend}
                            sending={ws.sending} onCancel={ws.handleCancel}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                            darkMode={darkMode} modelOptions={props.modelOptions || []} currentModel={props.currentModel || ''}
                            onModelChange={props.onModelChange || (() => {})} onManageModels={props.onManageModels || (() => {})}
                            thinking={props.thinking || 'off'} onThinkingChange={props.onThinkingChange || (() => {})}
                            onFilePickerOpen={props.filePicker ? () => setFilePickerOpen(true) : (props.onFilePickerOpen || (() => {}))}
                            includeProjectDocs={props.includeProjectDocs !== undefined ? props.includeProjectDocs : true}
                            onToggleDocs={props.onToggleDocs} onToolConfigOpen={props.toolConfig ? () => setToolConfigOpen(true) : (props.onToolConfigOpen || (() => {}))}
                            selectedFiles={props.selectedFiles}
                            selectedImages={props.selectedImages}
                            onAddImageOpen={props.onAddImageOpen}
                            onRemoveImage={props.onRemoveImage} />
                        <ApprovalStatusBar approvalMode={approvalMode} onModeChange={setApprovalMode}
                            tokenUsage={props.tokenUsage || null} currentContextWindow={props.currentContextWindow || 0} darkMode={darkMode} />
                    </>
                )}
                {props.toolConfig && (
                    <ToolConfigModal open={toolConfigOpen} onClose={() => setToolConfigOpen(false)}
                        toolTree={props.toolConfig.tree} toolEnabled={props.toolConfig.enabled}
                        onChange={props.toolConfig.onChange} darkMode={darkMode} />
                )}
                {props.filePicker && (
                    <FilePickerModal open={filePickerOpen} onClose={() => setFilePickerOpen(false)}
                        onSearch={props.filePicker.onSearch}
                        selectedFiles={props.selectedFiles?.map(f => f.path)}
                        onSelect={props.filePicker.onSelect}
                        darkMode={darkMode} />
                )}
            </div>
        </ErrorBoundary>
        </AgentUIContext.Provider>
    )
}
