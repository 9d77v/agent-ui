declare module 'agent-ui' {
    import type { ReactNode } from 'react'
    export interface SessionInfo { session_id: string; title: string; preview?: string; msg_count?: number; last_time?: string; token_usage?: any }
    export interface ToolCallEntry { callId?: string; name: string; args: string; status: 'executing' | 'done' | 'error'; result?: any }
    export interface AgentMessageRetryInfo { messageId: string; sessionId: string; message: string; model: string; providerId: string; mode: string; thinking: string; done?: boolean }
    export interface AgentMessageFileDiff { filePath: string; original?: any; modified?: any }
    export interface AgentMessage { id: string; seq?: number; turnId?: string; role: 'user' | 'assistant' | 'tool' | 'model'; content: string; reasoning?: string; loading?: boolean; showReasoning?: boolean; needsContinue?: boolean; toolList?: ToolCallEntry[]; retryInfo?: AgentMessageRetryInfo; fileDiff?: AgentMessageFileDiff }

    export interface PanelLocale { title: string; history: string; newSession: string }
    export interface ChatInputLocale { placeholder: string; sendTooltip: string; stopTooltip: string; addFileTooltip: string; addImageTooltip: string; docsAttachedTooltip: string; docsNotAttachedTooltip: string; docsLabel: string; noDocsLabel: string; manageModelsLabel: string; modelLabel: string; toolConfigTooltip: string; thinkingOff: string; thinkingDefault: string; thinkingDeep: string }
    export interface MessageLocale { reasoningTitle: string; thinkingLabel: string; retryButton: string; continueButton: string; maxIterationsNote: string; truncatedSuffix: string; fileChangeLabel: string; revertButton: string }
    export interface ToolLocale { paramLabel: string; outputLabel: string; errorLabel: string; executingStatus: string; completedStatus: string; stepsLabel: string }
    export interface ApprovalLocale { riskLevelDangerous: string; riskLevelModerate: string; riskLevelSafe: string; requiredTitle: string; skipButton: string; confirmButton: string; modeAuto: string; modeDefault: string; modeManual: string; allowButton: string; commandTitle: string; fileTitle: string; toolTitle: string; commandDesc: string; fileDesc: string; toolDesc: string; hiddenLines: string; collapse: string }
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
        toolConfig?: { tree: ToolTreeNode[]; enabled?: Record<string, boolean>; onChange?: (enabledKeys: string[]) => void }
        filePicker?: { onSearch: (query: string) => Promise<string[]>; onSelect: (filePath: string) => void }
        sessionID: string; setSessionID: (id: string) => void
        onNewSession?: () => void; collapsed: boolean; onToggle: () => void; darkMode?: boolean
        modelOptions?: ModelOption[]
        currentModel?: string; onModelChange?: (v: string) => void; onManageModels?: () => void
        thinking?: string; onThinkingChange?: (v: string) => void; onFilePickerOpen?: () => void
        includeProjectDocs?: boolean; onToggleDocs?: () => void; onToolConfigOpen?: () => void
        selectedFiles?: SelectedFile[]
        readFileContent?: (path: string, startLine?: number, endLine?: number) => Promise<any>
        onClearFiles?: () => void
        selectedImages?: SelectedImage[]
        onAddImageOpen?: () => void
        onRemoveImage?: (index: number) => void
        onClearImages?: () => void
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
    export interface ModelOption { label: string; value: string; providerId: string }
    export interface SelectedFile { path: string; startLine?: number; endLine?: number }
    export interface SelectedImage { url: string; name: string }
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

    export interface MessageListProps {
        messageOrder: string[]
        messageMap: Record<string, AgentMessage>
        darkMode?: boolean
        streamingMsgId?: string | null
        onOpenFile: (path: string) => void
        onRetry: (retryInfo: AgentMessageRetryInfo) => void
        onContinue: () => void
        onToggleReasoning: (msgId: string, collapsed: boolean) => void
    }
    export const MessageList: React.FC<MessageListProps>

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
    export interface TokenProgressProps { tokenUsage: TokenUsage | null; currentContextWindow: number; darkMode?: boolean }
    export const TokenProgress: React.FC<TokenProgressProps>

    export const ErrorBoundary: React.FC<{ onReset?: () => void; darkMode?: boolean; children?: ReactNode }>

    // ---- Modal ----
    export interface AgentModalProps { open: boolean; onClose: () => void; title?: string; titleIcon?: ReactNode; width?: number; height?: number; darkMode?: boolean; children: ReactNode; footer?: ReactNode }
    export const AgentModal: React.FC<AgentModalProps>

    export interface ToolTreeNode { key: string; label: string; children?: ToolTreeNode[] }
    export interface ToolConfigModalProps { open: boolean; onClose: () => void; toolTree: ToolTreeNode[]; toolEnabled?: Record<string, boolean>; onChange?: (enabledKeys: string[]) => void; darkMode?: boolean }
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
