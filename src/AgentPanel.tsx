import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { Button, Tooltip, message, theme } from 'antd'
import { RobotOutlined, CloseOutlined, PlusOutlined, HistoryOutlined, CheckOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import { useMessageTree, type AgentMessage } from './hooks/useMessageTree'
import { useAgentWebSocket } from './hooks/useAgentWebSocket'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import AgentRoster from './AgentRoster'
import ApprovalStatusBar from './ApprovalStatusBar'
import CommandApproval from './CommandApproval'
import SessionHistory from './SessionHistory'
import QuestionnaireForm from './QuestionnaireForm'
import ErrorBoundary from './ErrorBoundary'
import { AgentUIContext, defaultLocale, type AgentUILocale } from './locale/index'
import { ToolConfigModal, FilePickerModal } from './modal'
import type { ToolTreeNode } from './modal'
import type { SessionInfo, ModelOption, SelectedFile, SelectedImage, ApprovalItem, AgentStatus } from './types'

export type { SessionInfo } from './types'

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
    selectedImages?: { url: string; name: string }[]
    onAddImageOpen?: () => void
    onRemoveImage?: (index: number) => void
    onRemoveFile?: (index: number) => void
    onClearImages?: () => void
    onPasteImage?: (file: File) => void
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

// last-known 合并纯函数（A2）：实时广播（wsAgents，已按当前会话 parent_id 过滤）按 agent_id upsert 进
// lastKnown（行永不删除、状态定格为最后一次广播值，含 terminated），快照（sessionAgents）仅补「从未在广播中
// 出现过」的历史条目；条目按 parent_id 与当前会话匹配过滤（防会话切换过渡期旧会话残留串显）。
// 返回合并后的 roster 列表；lastKnown 被就地更新（upsert 语义）。
export function mergeRosterAgents(
    lastKnown: Map<string, AgentStatus>,
    wsAgents: AgentStatus[] | undefined,
    sessionAgents: AgentStatus[] | undefined,
    sessionID: string,
): AgentStatus[] {
    for (const a of wsAgents || []) {
        if (a.parent_id && a.parent_id !== sessionID) continue
        lastKnown.set(a.agent_id, a)
    }
    const map = new Map<string, AgentStatus>()
    for (const a of lastKnown.values()) {
        // lastKnown 也可能残留旧会话条目（组件已按会话重置，此处再按 parent_id 过滤为双保险）
        if (a.parent_id && a.parent_id !== sessionID) continue
        map.set(a.agent_id, a)
    }
    for (const a of sessionAgents || []) {
        if (a.parent_id && a.parent_id !== sessionID) continue
        if (!map.has(a.agent_id)) map.set(a.agent_id, a)
    }
    return Array.from(map.values())
}

export default function FrameworkAgentPanel(props: PanelProps) {
    const { collapsed, onToggle, darkMode } = props
    const { token } = theme.useToken()
    const mergedLocale = useMemo<AgentUILocale>(() => ({ ...defaultLocale, ...props.locale }), [props.locale])
    const msgTree = useMessageTree()
    const [sessionID, setSessionID] = useState(props.sessionID || '')
    const [showHistory, setShowHistory] = useState(false)
    const [approvalMode, setApprovalMode] = useState<string>(props.initialApprovalMode || 'default')
    const [sessions, setSessions] = useState<SessionInfo[]>(props.sessions || [])

    const ws = useAgentWebSocket({
        messageTree: msgTree, sessionID,
        currentModel: props.currentModel || '',
        activeProviderId: props.activeProviderId || '',
        thinking: props.thinking || 'off',
        approvalMode,
        includeProjectDocs: props.includeProjectDocs !== undefined ? props.includeProjectDocs : true,
        getWebSocketURL: props.getWebSocketURL,
    })
    // 宿主在会话打开时从后端读取持久化审批模式并传入（重启后绕过审批等设置不丢失）
    useEffect(() => {
        if (props.initialApprovalMode) {
            setApprovalMode(props.initialApprovalMode)
        }
    }, [props.initialApprovalMode])
    // 切换审批模式：更新 UI 状态 + 通知后端即时生效（当前编排后续工具判定立即读取最新值）
    const handleApprovalModeChange = useCallback((mode: string) => {
        setApprovalMode(mode)
        ws.updateApprovalMode(mode)
    }, [ws.updateApprovalMode])
    // 子代理交接：宿主可自定义；缺省把交接指令作为新用户消息发给主 agent
    const handleHandoff = useCallback((label: string, prompt: string) => {
        if (props.onHandoff) { props.onHandoff(label, prompt); return }
        ws.sendText(prompt || label || '')
    }, [props.onHandoff, ws])
    const sending = ws.sending
    // 审批卡片按索引切换查看（同批多项时逐一审阅，不必只看第一项）
    const [approvalIndex, setApprovalIndex] = useState(0)
    useEffect(() => {
        const len = ws.pendingApprovals.length
        if (len === 0) { setApprovalIndex(0); return }
        if (approvalIndex >= len) setApprovalIndex(len - 1)
    }, [ws.pendingApprovals.length, approvalIndex])
    const pendingApproval = ws.pendingApprovals.length > 0
        ? ws.pendingApprovals[Math.min(approvalIndex, ws.pendingApprovals.length - 1)]
        : null
    // 批量允许：对当前同批全部待审批逐项批准（后端攒批，全部通过后统一恢复编排）
    const approveAll = useCallback(() => {
        ws.pendingApprovals.forEach(a => ws.handleApproveTool(a.approvalId))
    }, [ws.pendingApprovals, ws.handleApproveTool])
    const prevApproval = useCallback(() => setApprovalIndex(i => Math.max(0, i - 1)), [])
    const nextApproval = useCallback(() => {
        setApprovalIndex(i => Math.min(Math.max(0, ws.pendingApprovals.length - 1), i + 1))
    }, [ws.pendingApprovals.length])
    const [questionnaireData, setQuestionnaireData] = useState<{ id: string; questions: any[] } | null>(null)
    const [toolConfigOpen, setToolConfigOpen] = useState(false)
    const [filePickerOpen, setFilePickerOpen] = useState(false)

    useEffect(() => { setSessionID(props.sessionID); if (!props.sessionID) msgTree.clearMessages() }, [props.sessionID])
    useEffect(() => { if (props.sessions) setSessions(props.sessions) }, [props.sessions])
    useEffect(() => { setQuestionnaireData(ws.questionnaireData) }, [ws.questionnaireData])

    // 发送：文本由 ChatInput 内部管理（非受控），发送时经 onSend(text) 回调传入，避免打字整树重渲染
    const handleSend = useCallback(async (text?: string) => {
        const images = props.selectedImages || []
        const files = props.selectedFiles || []
        const finalText = (text || '').trim()
        // 空请求拦截：文字、图片、文件三者都为空才禁止发送
        if (!finalText && images.length === 0 && files.length === 0) { message.warning(mergedLocale.chatInput.placeholder); return }
        if (ws.sending) return
        // 附加文件只附路径引用（含可选行号区间），不再内联文件内容：
        // 避免提示词被大段文件内容污染，agent 用 read_file 按需读取。
        let fullText = finalText
        if (files.length > 0) {
            const refs = files.map(f => {
                let ref = '- ' + f.path
                if (f.startLine !== undefined) {
                    ref += f.endLine !== undefined && f.endLine !== f.startLine ? `:${f.startLine}-${f.endLine}` : `:${f.startLine}`
                }
                return ref
            }).join('\n')
            fullText = finalText + (finalText ? '\n\n' : '') + mergedLocale.chatInput.attachedFilesLabel + ':\n' + refs
        }
        ws.sendText(fullText, images.map(img => ({ url: img.url })))
        if (props.onClearFiles) props.onClearFiles()
        if (props.onClearImages) props.onClearImages()
    }, [ws, props.selectedFiles, props.onClearFiles, props.selectedImages, props.onClearImages])

    const contextValue = useMemo(() => ({
        ...mergedLocale,
        toolDisplayNames: props.toolDisplayNames,
        formatModelLabel: props.formatModelLabel,
        darkMode,
    }), [mergedLocale, props.toolDisplayNames, props.formatModelLabel, darkMode])

    // 会话级子代理列表 —— last-known 语义（用户既定：roster 行保留、terminate 显示 terminated 不消失）：
    // 实时广播（ws.agents，hook 内已按当前会话 parent_id 过滤）按 agent_id upsert 进 lastKnownRef，
    // 不随后续广播移除——行保留，状态定格为最后一次广播值（含 terminated），不回退会话打开时的过期快照
    // （修复 terminate 后 running 残留）。快照（sessionAgents）仅补「从未在广播中出现过」的历史条目。
    // 会话切换（sessionID 变化）重置 lastKnownRef 防跨会话串显；过渡期 ws.agents 可能仍含旧会话残留，
    // 故 upsert/补快照时按 parent_id 与当前会话匹配过滤（见 mergeRosterAgents）。
    const lastKnownRef = useRef<Map<string, AgentStatus>>(new Map())
    const prevSessionRef = useRef(sessionID)
    if (prevSessionRef.current !== sessionID) {
        prevSessionRef.current = sessionID
        lastKnownRef.current = new Map()
    }
    const rosterAgents = useMemo(
        () => mergeRosterAgents(lastKnownRef.current, ws.agents, props.sessionAgents, sessionID),
        [props.sessionAgents, ws.agents, sessionID],
    )

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
                                    // 答案作为 askQuestions 工具结果回传（工具在阻塞等待，非新用户消息）
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
                            onToggleDocs={props.onToggleDocs} onToolConfigOpen={props.toolConfig ? () => setToolConfigOpen(true) : (props.onToolConfigOpen || (() => {}))}
                            selectedFiles={props.selectedFiles}
                            selectedImages={props.selectedImages}
                            onAddImageOpen={props.onAddImageOpen}
                            onRemoveImage={props.onRemoveImage}
                            onRemoveFile={props.onRemoveFile}
                            onPasteImage={props.onPasteImage} />
                        <ApprovalStatusBar approvalMode={approvalMode} onModeChange={handleApprovalModeChange}
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
