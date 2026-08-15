import { useState, type ReactNode } from 'react'
import { Button, Tooltip, theme } from 'antd'
import { RobotOutlined, CloseOutlined, PlusOutlined, HistoryOutlined, CheckOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import type { AgentMessage } from './hooks/useMessageTree'
import { useAgentPanelState } from './hooks/useAgentPanelState'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import AgentRoster from './AgentRoster'
import ApprovalStatusBar from './ApprovalStatusBar'
import CommandApproval from './CommandApproval'
import SessionHistory from './SessionHistory'
import QuestionnaireForm from './QuestionnaireForm'
import ErrorBoundary from './ErrorBoundary'
import { AgentUIContext, type AgentUILocale } from './locale/index'
import { ToolConfigModal, FilePickerModal } from './modal'
import type { ToolTreeNode } from './modal'
import type { SessionInfo, ModelOption, SelectedFile, SelectedImage, AgentStatus } from './types'

export type { SessionInfo } from './types'

// mergeRosterAgents 已随状态抽取迁移到 useAgentPanelState（保持对外导出不变，避免破坏既有引用）
export { mergeRosterAgents } from './hooks/useAgentPanelState'

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
    /** 渲染在输入区上方的面板（如会话待办清单），位于 MessageList/审批之后、ChatInput 之前 */
    bottomPanels?: ReactNode
    /** 工具展示（传入则渲染内置 ToolConfigModal；只读分类卡片，无勾选） */
    toolConfig?: {
        tree: ToolTreeNode[]
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
    /** 子代理交接回调（plan 完成后的「开始实现」等）。缺省：把 prompt 作为新用户消息发送给主 agent */
    onHandoff?: (label: string, prompt: string) => void
    /** 会话初始审批模式（宿主从后端 GetApprovalMode 读取；重启后绕过审批等持久化设置不丢失） */
    initialApprovalMode?: string
    /** 会话详情关联的子代理列表（打开会话时由宿主 GetSessionAgents 提供；优先于全局 agent_status 推送） */
    sessionAgents?: AgentStatus[]
    /** 点击 roster 行回调（宿主查看子代理消息流等） */
    onSelectAgent?: (agent: AgentStatus) => void
    onToolConfigOpen?: () => void
    selectedFiles?: { path: string; startLine?: number; endLine?: number }[]
    onClearFiles?: () => void
    selectedImages?: SelectedImage[]
    /** 单条消息最大可附加图片数（显示「已选 n/max」用；缺省不显示） */
    maxImages?: number
    onAddImageOpen?: () => void
    onRemoveImage?: (index: number) => void
    onRemoveFile?: (index: number) => void
    onClearImages?: () => void
    onPasteImage?: (file: File) => void
    /** 快捷文本（Agent 面板输入组件一键发送；label=text，hover chip 展开点击即发送） */
    quickTexts?: string[]
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
    const { collapsed, onToggle, darkMode } = props
    const { token } = theme.useToken()
    const [showHistory, setShowHistory] = useState(false)
    const [toolConfigOpen, setToolConfigOpen] = useState(false)
    const [filePickerOpen, setFilePickerOpen] = useState(false)

    const state = useAgentPanelState({
        getWebSocketURL: props.getWebSocketURL,
        toolDisplayNames: props.toolDisplayNames,
        formatModelLabel: props.formatModelLabel,
        locale: props.locale,
        sessionID: props.sessionID,
        setSessionID: props.setSessionID,
        onNewSession: props.onNewSession,
        darkMode,
        currentModel: props.currentModel,
        activeProviderId: props.activeProviderId,
        thinking: props.thinking,
        includeProjectDocs: props.includeProjectDocs,
        onHandoff: props.onHandoff,
        initialApprovalMode: props.initialApprovalMode,
        sessionAgents: props.sessionAgents,
        selectedFiles: props.selectedFiles,
        onClearFiles: props.onClearFiles,
        selectedImages: props.selectedImages,
        onClearImages: props.onClearImages,
        sessions: props.sessions,
    })
    const { msgTree, ws, sessionID, setSessionID, sessions, approvalMode, handleApprovalModeChange,
        approvalIndex, pendingApproval, approveAll, prevApproval, nextApproval,
        questionnaireData, setQuestionnaireData, rosterAgents, handleSend, handleHandoff, contextValue, mergedLocale } = state

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
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <MessageList messageOrder={msgTree.messageOrder} messageMap={msgTree.messageMap}
                                darkMode={darkMode} streamingMsgId={ws.streamingMsgId}
                                onOpenFile={ws.handleOpenFile} onRetry={ws.handleRetry}
                                onContinue={ws.handleContinue}
                                toolAutoExpand={ws.pendingApprovals.length === 0}
                                onHandoff={handleHandoff}
                                onToggleReasoning={(msgId, collapsed) => msgTree.updateMessage(msgId, msg => ({ ...msg, showReasoning: !collapsed }))} />
                        </div>
                    </>
                )}

                {!showHistory && (
                    <>
                        {pendingApproval && (
                            <div style={{ margin: '8px 12px 0' }}>
                                {ws.pendingApprovals.length > 1 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                        <Button size="small" icon={<LeftOutlined />} disabled={approvalIndex === 0} onClick={prevApproval} />
                                        <span style={{ flex: 1, textAlign: 'center', color: token.colorTextSecondary, fontSize: 12 }}>
                                            {mergedLocale.approval.pendingCount.replace('{n}', String(ws.pendingApprovals.length))} · {approvalIndex + 1}/{ws.pendingApprovals.length}
                                        </span>
                                        <Button size="small" icon={<RightOutlined />} disabled={approvalIndex >= ws.pendingApprovals.length - 1} onClick={nextApproval} />
                                        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={approveAll}>
                                            {mergedLocale.approval.approveAllButton}
                                        </Button>
                                    </div>
                                )}
                                <CommandApproval key={pendingApproval.approvalId} approvalId={pendingApproval.approvalId} command={pendingApproval.command}
                                    riskLevel={pendingApproval.riskLevel} agent={pendingApproval.agent}
                                    onApprove={() => ws.handleApproveTool(pendingApproval.approvalId)}
                                    onReject={() => ws.handleRejectTool(pendingApproval.approvalId)} darkMode={darkMode} />
                            </div>
                        )}
                        {questionnaireData && (
                            <QuestionnaireForm steps={questionnaireData.questions || []} initialAnswers={undefined}
                                onComplete={(answers: string) => {
                                    // 答案作为 ask_user 工具结果回传（工具在阻塞等待，非新用户消息）
                                    // 提交成功才收起表单；失败（连接断开）保留表单供重试
                                    const ok = ws.submitQuestionnaireAnswer(questionnaireData.id, answers)
                                    if (ok) setQuestionnaireData(null)
                                }} darkMode={darkMode} />
                        )}
                        {props.bottomPanels}
                        {rosterAgents.length > 0 && (
                            <div style={{ padding: '6px 12px 0', flexShrink: 0 }}>
                                <AgentRoster agents={rosterAgents} darkMode={darkMode} onSelect={props.onSelectAgent} />
                            </div>
                        )}
                        <ChatInput onSend={handleSend}
                            sending={ws.sending} onCancel={ws.handleCancel}
                            darkMode={darkMode} modelOptions={props.modelOptions || []} currentModel={props.currentModel || ''}
                            onModelChange={props.onModelChange || (() => {})} onManageModels={props.onManageModels || (() => {})}
                            thinking={props.thinking || 'off'} onThinkingChange={props.onThinkingChange || (() => {})}
                            onFilePickerOpen={props.filePicker ? () => setFilePickerOpen(true) : (props.onFilePickerOpen || (() => {}))}
                            includeProjectDocs={props.includeProjectDocs !== undefined ? props.includeProjectDocs : true}
                            onToggleDocs={props.onToggleDocs} onToolConfigOpen={props.toolConfig ? () => setToolConfigOpen(true) : props.onToolConfigOpen}
                            selectedFiles={props.selectedFiles}
                            selectedImages={props.selectedImages}
                            maxImages={props.maxImages}
                            onAddImageOpen={props.onAddImageOpen}
                            onRemoveImage={props.onRemoveImage}
                            onRemoveFile={props.onRemoveFile}
                            onPasteImage={props.onPasteImage}
                            quickTexts={props.quickTexts} />
                        <ApprovalStatusBar approvalMode={approvalMode} onModeChange={handleApprovalModeChange}
                            tokenUsage={props.tokenUsage || null} currentContextWindow={props.currentContextWindow || 0} darkMode={darkMode} />
                    </>
                )}
                {props.toolConfig && (
                    <ToolConfigModal open={toolConfigOpen} onClose={() => setToolConfigOpen(false)}
                        toolTree={props.toolConfig.tree} darkMode={darkMode} />
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
