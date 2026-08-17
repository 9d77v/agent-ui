declare module 'agent-ui' {
    import type { ReactNode } from 'react'
    export interface SessionInfo { session_id: string; title: string; preview?: string; msg_count?: number; last_time?: string; token_usage?: any; pinned?: boolean; provider_id?: string; model?: string; thinking?: string }
    export interface ToolCallEntry { callId?: string; name: string; args: string; status: 'executing' | 'done' | 'error'; result?: any }
    export interface AgentMessageRetryInfo { messageId: string; sessionId: string; message: string; model: string; providerId: string; mode: string; thinking: string; done?: boolean }
    export interface AgentMessageFileDiff { filePath: string; original?: any; modified?: any }
    export interface Attachment { type: 'image' | 'file'; path: string; name?: string; preview?: string; startLine?: number; endLine?: number }
    export interface AgentMessage { id: string; seq?: number; turnId?: string; role: 'user' | 'assistant' | 'tool' | 'model'; content: string; reasoning?: string; loading?: boolean; showReasoning?: boolean; needsContinue?: boolean; toolList?: ToolCallEntry[]; retryInfo?: AgentMessageRetryInfo; fileDiff?: AgentMessageFileDiff; timestamp?: string; model?: string; attachments?: Attachment[] }
    export interface AgentHandoff { label?: string; agent?: string; prompt?: string; send?: boolean; show_continue_on?: boolean }
    export interface AgentStatus { agent_id: string; name: string; status: string; session_id: string; parent_id?: string; depth: number; task?: string; completion_summary?: string; files_changed?: string[]; handoffs?: AgentHandoff[]; error?: string; transient?: boolean; created_at?: string; updated_at?: string }

    export interface PanelLocale { title: string; history: string; newSession: string }
    export interface ChatInputLocale { placeholder: string; stopTooltip: string; addFileTooltip: string; addImageTooltip: string; docsAttachedTooltip: string; docsNotAttachedTooltip: string; docsLabel: string; noDocsLabel: string; manageModelsLabel: string; modelLabel: string; toolConfigTooltip: string; thinkingOff: string; thinkingDefault: string; thinkingDeep: string; imageCountLabel: string; attachedFilesLabel: string }
    export interface MessageLocale { reasoningTitle: string; thinkingLabel: string; retryButton: string; continueButton: string; maxIterationsNote: string; truncatedSuffix: string; fileChangeLabel: string; revertButton: string }
    export interface ToolLocale { paramLabel: string; outputLabel: string; errorLabel: string; executingStatus: string; completedStatus: string; stepsLabel: string }
    export interface ApprovalLocale { riskLevelDangerous: string; riskLevelModerate: string; riskLevelSafe: string; requiredTitle: string; skipButton: string; confirmButton: string; modeAuto: string; modeDefault: string; modeManual: string; allowButton: string; commandTitle: string; fileTitle: string; toolTitle: string; commandDesc: string; fileDesc: string; toolDesc: string; hiddenLines: string; collapse: string; pendingCount: string; approveAllButton: string }
    export type ApprovalKind = 'command' | 'file' | 'tool'
    export interface ParsedApproval { kind: ApprovalKind; filePath: string; display: string }
    export function parseApproval(command: string): ParsedApproval
    export function languageBadge(filePath: string): string
    export interface SessionLocale { title: string; noHistory: string; untitled: string; noMessages: string; deleteConfirm: string; deleted: string; deleteFailed: string; deleteButton: string; cancelButton: string }
    export interface QuestionnaireLocale { myAnswer: string; confirmSelection: string; backToEdit: string; submit: string; notSelected: string; customAnswerPlaceholder: string; inputPlaceholder: string }
    export interface ErrorLocale { title: string; reload: string }
    export interface AgentUILocale {
        panel: PanelLocale
        chatInput: ChatInputLocale
        message: MessageLocale
        tool: ToolLocale
        approval: ApprovalLocale
        session: SessionLocale
        questionnaire: QuestionnaireLocale
        error: ErrorLocale
    }
    export interface AgentUIContextValue extends AgentUILocale {
        toolDisplayNames?: Record<string, string>
        formatModelLabel?: (modelValue: string) => string
        darkMode?: boolean
    }
    export const AgentUIContext: React.Context<AgentUIContextValue>
    export function useAgentLocale(): AgentUIContextValue
    export const defaultLocale: AgentUILocale
    export const zhLocale: AgentUILocale

    export interface PanelProps {
        getWebSocketURL: () => Promise<string>
        toolDisplayNames?: Record<string, string>
        locale?: Partial<AgentUILocale>
        formatModelLabel?: (modelValue: string) => string
        extraPanels?: ReactNode
        bottomPanels?: ReactNode
        toolConfig?: { tree: ToolTreeNode[] }
        filePicker?: { onSearch: (query: string) => Promise<string[]>; onSelect: (filePath: string) => void }
        sessionID: string; setSessionID: (id: string) => void
        onNewSession?: () => void; collapsed: boolean; onToggle: () => void; darkMode?: boolean
        modelOptions?: ModelOption[]
        currentModel?: string; onModelChange?: (v: string) => void; onManageModels?: () => void
        thinking?: string; onThinkingChange?: (v: string) => void; onFilePickerOpen?: () => void
        includeProjectDocs?: boolean; onToggleDocs?: () => void; onToolConfigOpen?: () => void
        /** 会话初始审批模式（宿主从后端 GetApprovalMode 读取；重启后绕过审批等持久化设置不丢失） */
        initialApprovalMode?: string
        /** 子代理交接回调（plan 完成后的「开始实现」等）。缺省：切到 agent 模式并发送 prompt 给主 agent */
        onHandoff?: (label: string, prompt: string) => void
        /** 会话详情关联的子代理列表（打开会话时由宿主 GetSessionAgents 提供；优先于全局 agent_status 推送） */
        sessionAgents?: AgentStatus[]
        /** 点击 roster 行回调（宿主查看子代理消息流等） */
        onSelectAgent?: (agent: AgentStatus) => void
        selectedFiles?: SelectedFile[]
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
        sessions?: SessionInfo[]; onLoadSessions?: () => Promise<void>
        onOpenSession?: (sid: string, sessionInfo?: SessionInfo) => Promise<AgentMessage[]>
        onDeleteSession?: (sessionID: string) => Promise<{ success: boolean; error?: string }>
        tokenUsage?: TokenUsage; currentContextWindow?: number; activeProviderId?: string; workspaceRoot?: string
        onToggleReasoning?: (msgId: string, collapsed: boolean) => void
    }
    export interface MessageTree {
        messageMap: Record<string, AgentMessage>
        messageOrder: string[]
        addMessage: (msg: AgentMessage) => void
        updateMessage: (msgId: string, updater: (msg: AgentMessage) => AgentMessage) => void
        updateToolByCallId: (callId: string, updater: (tool: ToolCallEntry) => ToolCallEntry) => void
        clearMessages: () => void
    }
    export function useMessageTree(): MessageTree

    // ---- useAgentPanelState（FrameworkAgentPanel 状态抽取：会话/WS/审批/问卷/roster/发送） ----
    export interface PendingApprovalItem { approvalId: string; command: string; riskLevel: string; agent?: string }
    export interface UseAgentPanelStateOptions {
        getWebSocketURL: () => Promise<string>
        toolDisplayNames?: Record<string, string>
        formatModelLabel?: (modelValue: string) => string
        locale?: Partial<AgentUILocale>
        sessionID: string
        setSessionID: (id: string) => void
        onNewSession?: () => void
        darkMode?: boolean
        currentModel?: string
        activeProviderId?: string
        thinking?: string
        includeProjectDocs?: boolean
        onHandoff?: (label: string, prompt: string) => void
        initialApprovalMode?: string
        sessionAgents?: AgentStatus[]
        selectedFiles?: SelectedFile[]
        onClearFiles?: () => void
        selectedImages?: SelectedImage[]
        onClearImages?: () => void
        sessions?: SessionInfo[]
    }
    export interface UseAgentPanelStateResult {
        msgTree: MessageTree
        ws: {
            sendText: (text: string, images?: SendImageInput[], files?: SendFileInput[]) => void
            sending: boolean
            wsRef: React.MutableRefObject<WebSocket | null>
            streamingMsgIdRef: React.MutableRefObject<string | null>
            streamingMsgId: string | null
            pendingApprovals: PendingApprovalItem[]
            questionnaireData: { id: string; questions: any[] } | null
            setQuestionnaireData: (v: { id: string; questions: any[] } | null) => void
            setPendingApprovals: React.Dispatch<React.SetStateAction<PendingApprovalItem[]>>
            handleApproveTool: (approvalId: string) => void
            handleRejectTool: (approvalId: string) => void
            handleRevertFile: (filePath: string, backupPath: string) => void
            handleOpenFile: (filePath: string) => void
            handleCancel: () => void
            handleRetry: (retryInfo: any) => void
            handleContinue: () => void
            submitQuestionnaireAnswer: (questionnaireId: string, answers: string) => boolean
            updateApprovalMode: (mode: string) => void
            agents: AgentStatus[]
        }
        sessionID: string
        setSessionID: (id: string) => void
        sessions: SessionInfo[]
        approvalMode: string
        handleApprovalModeChange: (mode: string) => void
        approvalIndex: number
        pendingApproval: PendingApprovalItem | null
        approveAll: () => void
        prevApproval: () => void
        nextApproval: () => void
        questionnaireData: { id: string; questions: any[] } | null
        setQuestionnaireData: (v: { id: string; questions: any[] } | null) => void
        rosterAgents: AgentStatus[]
        handleSend: (text?: string) => Promise<void>
        handleHandoff: (label: string, prompt: string) => void
        contextValue: AgentUIContextValue
        mergedLocale: AgentUILocale
    }
    export function useAgentPanelState(opts: UseAgentPanelStateOptions): UseAgentPanelStateResult
    export interface ModelOption { label: string; value: string; providerId: string }
    export interface SelectedFile { path: string; startLine?: number; endLine?: number }
    export interface SelectedImage { url: string; name: string; preview?: string; size?: number }
    export interface SendImageInput { url: string; name?: string; preview?: string }
    export interface SendFileInput { path: string; startLine?: number; endLine?: number }
    export interface ModelState {
        modelOptions: ModelOption[]
        currentModel: string
        thinking: string
        activeProviderId: string
        currentContextWindow: number
        loadModels: () => Promise<{ providerId: string; modelName: string } | null>
        setCurrentModel: (v: string) => void
        setThinking: (v: string) => void
    }
    export interface ConfigProvider {
        getLLMProviders: () => any[]
        getLastSelectedModel: (providerId: string) => string
        getLastThinkingMode: (providerId: string) => string
        getActiveProviderId: () => string
        setLastSelectedModel: (providerId: string, model: string) => void
        setLastThinkingMode: (mode: string) => void
        getModelContextWindow: (providerId: string, modelId: string) => number
    }
    export function useModelLoader(collapsed: boolean, configProvider: ConfigProvider, onOpenSettings?: () => void): ModelState
    export function FrameworkAgentPanel(props: PanelProps): JSX.Element
    export default FrameworkAgentPanel
    /** last-known roster 合并纯函数（广播 upsert 不移除、快照补历史、按 parent_id 过滤） */
    export function mergeRosterAgents(lastKnown: Map<string, AgentStatus>, wsAgents: AgentStatus[] | undefined, sessionAgents: AgentStatus[] | undefined, sessionID: string): AgentStatus[]

    // ---- ChatInput ----
    export interface ChatInputProps {
        inputText?: string
        onInputChange?: (v: string) => void
        onSend: (text?: string) => void
        sending: boolean
        onCancel: () => void
        onKeyDown?: (e: React.KeyboardEvent) => void
        darkMode?: boolean
        onFilePickerOpen?: () => void
        includeProjectDocs?: boolean
        onToggleDocs?: () => void
        modelOptions?: ModelOption[]
        currentModel?: string
        onModelChange?: (v: string) => void
        onManageModels?: () => void
        thinking?: string
        onThinkingChange?: (v: string) => void
        onToolConfigOpen?: () => void
        selectedFiles?: SelectedFile[]
        selectedImages?: SelectedImage[]
        /** 单条消息最大可附加图片数（显示「已选 n/max」用；缺省不显示） */
        maxImages?: number
        onAddImageOpen?: () => void
        onRemoveImage?: (index: number) => void
        onRemoveFile?: (index: number) => void
        onPasteImage?: (file: File) => void
        /** 快捷文本（Agent 面板输入组件一键发送；label=text，hover chip 展开点击即发送） */
        quickTexts?: string[]
    }
    export const ChatInput: React.FC<ChatInputProps>

    // ---- Message 组件 ----
    export interface MessageBubbleProps {
        msg: AgentMessage
        darkMode?: boolean
        streamingMsgId?: string | null
        onOpenFile: (path: string) => void
        onRetry: (retryInfo: AgentMessageRetryInfo) => void
        onContinue: () => void
        onToggleReasoning: (msgId: string, collapsed: boolean) => void
    }
    export const MessageBubble: React.FC<MessageBubbleProps>
    /** 消息 hover 元数据时间格式化：今天 → HH:mm；非今天 → YYYY-MM-DD HH:mm（本地时区） */
    export function formatMessageTime(iso: string): string

    // ---- 附件解析/剥离工具（用户消息附件渲染共用） ----
    export interface ParsedFileRef { path: string; startLine?: number; endLine?: number }
    export const ARTIFACT_PLACEHOLDER_RE: RegExp
    export const ARTIFACT_NAME_RE: RegExp
    export function parseAttachedFiles(content: string, label?: string): ParsedFileRef[]
    export function stripFileRefBlock(content: string, label?: string): string
    export function countImagePlaceholders(content: string): number
    export function stripImagePlaceholders(content: string, maxStrip?: number): string

    // ---- 多 Agent 编排（只读展示，子代理自动化执行） ----
    export interface AgentRosterProps { agents: AgentStatus[]; darkMode?: boolean; onSelect?: (agent: AgentStatus) => void }
    export const AgentRoster: React.FC<AgentRosterProps>

    // ---- 子代理独立消息流（只读展示；onSend 可选） ----
    export interface AgentTranscriptProps {
        agent: AgentStatus
        messages: AgentMessage[]
        onSend?: (message: string) => void
        onClose?: () => void
        darkMode?: boolean
    }
    export const AgentTranscript: React.FC<AgentTranscriptProps>

    export interface MessageListProps {
        messageOrder: string[]
        messageMap: Record<string, AgentMessage>
        darkMode?: boolean
        streamingMsgId?: string | null
        onOpenFile: (path: string) => void
        onRetry: (retryInfo: AgentMessageRetryInfo) => void
        onContinue: () => void
        onToggleReasoning: (msgId: string, collapsed: boolean) => void
        /** 是否自动展开工具参数（审批进行中传 false：命令详情由审批卡片展示，避免与工具卡片重复） */
        toolAutoExpand?: boolean
        /** 子代理交接回调（run_subagent 结果的 handoffs 按钮） */
        onHandoff?: (label: string, prompt: string) => void
        /** 外部滚动定位（用户消息上/下箭头导航）：非空时滚动到对应消息并暂停自动跟随 */
        scrollToMsgId?: string
        /** 滚动时回调当前视口所在的用户消息 id（无用户消息时 null）；用于外部计数跟随视口 */
        onUserMsgScrollChange?: (msgId: string | null) => void
    }
    export const MessageList: React.FC<MessageListProps>

    // ---- 审批卡片 / 问卷 / 审批状态栏 / 会话历史 ----
    export interface CommandApprovalProps {
        approvalId: string
        command: string
        riskLevel: string
        /** 来源子代理名（空 = 主会话） */
        agent?: string
        onApprove: (approvalId: string) => void
        onReject: (approvalId: string) => void
        onTrust?: () => void
        darkMode?: boolean
    }
    export const CommandApproval: React.FC<CommandApprovalProps>

    export interface QuestionStep { id: string; question: string; options?: string[]; default?: string; custom?: boolean; input?: boolean; last?: boolean; multi?: boolean; allowFreeformInput?: boolean }
    export interface QuestionnaireFormProps { steps: QuestionStep[]; initialAnswers?: Record<string, string>; onSaveProgress?: (answers: Record<string, string>) => void; onComplete: (answers: string) => void; darkMode?: boolean }
    export const QuestionnaireForm: React.FC<QuestionnaireFormProps>

    export interface ApprovalStatusBarProps {
        approvalMode: string
        onModeChange: (mode: string) => void
        tokenUsage: any
        currentContextWindow: number
        darkMode?: boolean
        /** 手动压缩入口阈值（百分比，0=禁用），透传给 TokenProgress */
        manualCompactThreshold?: number
        /** 压缩进行中 */
        compactLoading?: boolean
        /** 点击压缩回调 */
        onCompact?: () => void
    }
    export const ApprovalStatusBar: React.FC<ApprovalStatusBarProps>

    export interface SessionHistoryProps {
        sessions: SessionInfo[]
        darkMode?: boolean
        onOpen: (sid: string, sessionInfo?: any) => void
        onRefresh: () => void
        currentSessionID: string
        onNewSession: () => void
        onDeleteSession?: (sessionID: string) => Promise<{ success: boolean; error?: string }>
        /** 重命名会话 */
        onRenameSession?: (sessionID: string, title: string) => Promise<{ success: boolean; error?: string }>
        /** 固定/取消固定会话 */
        onTogglePin?: (sessionID: string, pinned: boolean) => Promise<{ success: boolean; error?: string }>
        /** 搜索栏槽位：渲染在标题行与列表之间（由宿主提供，如会话标题搜索框）；不传则不渲染 */
        searchBar?: React.ReactNode
    }
    export const SessionHistory: React.FC<SessionHistoryProps>

    // ---- Token 进度 ----
    export interface TokenUsage {
        prompt_tokens?: number
        completion_tokens?: number
        total_tokens?: number
        cached_tokens?: number
        context_window?: number
        reserved_tokens?: number
        system_tokens?: number
        tools_tokens?: number
        messages_tokens?: number
        tool_results_tokens?: number
    }
    export interface TokenProgressProps {
        tokenUsage: TokenUsage | null
        currentContextWindow: number
        darkMode?: boolean
        /** 手动压缩入口阈值（百分比，0=禁用）。上下文占用达到该比例时显示「压缩」按钮 */
        manualCompactThreshold?: number
        /** 压缩进行中（禁用按钮防重复点击） */
        compactLoading?: boolean
        /** 点击压缩回调 */
        onCompact?: () => void
    }
    export const TokenProgress: React.FC<TokenProgressProps>

    export const ErrorBoundary: React.FC<{ onReset?: () => void; darkMode?: boolean; children?: ReactNode }>

    // ---- Modal ----
    export interface AgentModalProps { open: boolean; onClose: () => void; title?: string; titleIcon?: ReactNode; width?: number; height?: number; darkMode?: boolean; children: ReactNode; footer?: ReactNode }
    export const AgentModal: React.FC<AgentModalProps>

    export interface ToolTreeNode { key: string; label: string; description?: string; children?: ToolTreeNode[] }
    export interface ToolConfigModalProps { open: boolean; onClose: () => void; toolTree: ToolTreeNode[]; darkMode?: boolean }
    export const ToolConfigModal: React.FC<ToolConfigModalProps>

    export interface FilePickerModalProps { open: boolean; onClose: () => void; onSearch: (query: string) => Promise<string[]>; selectedFiles?: string[]; onSelect: (filePath: string) => void; darkMode?: boolean }
    export const FilePickerModal: React.FC<FilePickerModalProps>

    // ---- Utils ----
    export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): { (...args: Parameters<T>): void; cancel(): void }
    export function createModelConfigProvider(config: {
        getLLMProviders: () => any[]
        getDefaultLLMID?: () => string
        getProvider?: (id: string) => any
        getCachedModels?: (id: string) => any[]
        getLastSelectedModel?: (providerId: string) => string
        setLastSelectedModel?: (providerId: string, model: string) => void
        getLastThinkingMode?: (providerId: string) => string
        setLastThinkingMode?: (providerId: string, mode: string) => void
        getModelContextWindows?: (providerId?: string) => Record<string, number>
    }): any
}
