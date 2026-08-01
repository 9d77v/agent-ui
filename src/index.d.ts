declare module 'agent-ui' {
    import type { ReactNode } from 'react'
    export interface SessionInfo { session_id: string; title: string; preview?: string; msg_count?: number; last_time?: string; token_usage?: any }
    export interface AgentMessage { id: string; seq?: number; turnId?: string; role: 'user' | 'assistant' | 'tool' | 'model'; content: string; reasoning?: string; loading?: boolean; showReasoning?: boolean; needsContinue?: boolean; toolList?: any[]; fileDiff?: any; retryInfo?: any }

    export interface PanelLocale { title: string; history: string; newSession: string }
    export interface ChatInputLocale { placeholder: string; sendTooltip: string; stopTooltip: string; addFileTooltip: string; addImageTooltip: string; docsAttachedTooltip: string; docsNotAttachedTooltip: string; docsLabel: string; noDocsLabel: string; manageModelsLabel: string; modelLabel: string; toolConfigTooltip: string; thinkingOff: string; thinkingDefault: string; thinkingDeep: string }
    export interface MessageLocale { reasoningTitle: string; thinkingLabel: string; retryButton: string; continueButton: string; maxIterationsNote: string; truncatedSuffix: string; fileChangeLabel: string; revertButton: string }
    export interface ToolLocale { paramLabel: string; outputLabel: string; errorLabel: string; executingStatus: string; completedStatus: string; stepsLabel: string }
    export interface ApprovalLocale { riskLevelDangerous: string; riskLevelModerate: string; riskLevelSafe: string; requiredTitle: string; skipButton: string; confirmButton: string; modeAuto: string; modeDefault: string; modeManual: string }
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
        toolNameLabels?: Record<string, string>
        toolDisplayNames?: Record<string, string>
        locale?: Partial<AgentUILocale>
        formatModelLabel?: (modelValue: string) => string
        extraPanels?: ReactNode
        toolConfig?: { tree: ToolTreeNode[]; enabled?: Record<string, boolean>; onChange?: (enabledKeys: string[]) => void }
        filePicker?: { onSearch: (query: string) => Promise<string[]>; onSelect: (filePath: string) => void }
        sessionID: string; setSessionID: (id: string) => void
        onNewSession?: () => void; collapsed: boolean; onToggle: () => void; darkMode?: boolean
        modelOptions?: { label: string; value: string; providerId: string }[]
        currentModel?: string; onModelChange?: (v: string) => void; onManageModels?: () => void
        thinking?: string; onThinkingChange?: (v: string) => void; onFilePickerOpen?: () => void
        includeProjectDocs?: boolean; onToggleDocs?: () => void; onToolConfigOpen?: () => void
        selectedFiles?: { path: string; startLine?: number; endLine?: number }[]
        readFileContent?: (path: string, startLine?: number, endLine?: number) => Promise<any>
        onClearFiles?: () => void
        selectedImages?: { path: string; name: string; data: string }[]
        onAddImageOpen?: () => void
        onRemoveImage?: (index: number) => void
        onClearImages?: () => void
        sessions?: SessionInfo[]; onLoadSessions?: () => Promise<void>
        onOpenSession?: (sid: string, sessionInfo?: SessionInfo) => Promise<AgentMessage[]>
        onDeleteSession?: (sessionID: string) => Promise<{ success: boolean; error?: string }>
        tokenUsage?: any; currentContextWindow?: number; activeProviderId?: string; workspaceRoot?: string
        onToggleReasoning?: (msgId: string, collapsed: boolean) => void
    }
    export function useMessageTree(): { messageMap: Record<string, AgentMessage>; messageOrder: string[]; addMessage: (msg: AgentMessage) => void; updateMessage: (msgId: string, updater: (msg: AgentMessage) => AgentMessage) => void; clearMessages: () => void }
    export function useModelLoader(collapsed: boolean, configProvider: any, onOpenSettings?: () => void): any
    export function FrameworkAgentPanel(props: PanelProps): JSX.Element
    export default FrameworkAgentPanel

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

    // ---- LLMConfigPanel ----
    export interface LLMProviderItem {
        id: string; name: string; provider_type: string; base_url: string
        preset_name?: string; workspace_id?: string; is_default?: boolean
        created_at?: string; selected_models?: string[]
    }
    export interface ModelInfoItem { id: string; created?: number; owned_by?: string }
    export interface LLMConfigPanelAPI {
        getProviders: () => LLMProviderItem[] | Promise<LLMProviderItem[]>
        addProvider: (provider: LLMProviderItem) => Promise<void>
        updateProvider: (provider: LLMProviderItem) => Promise<void>
        deleteProvider: (id: string) => Promise<void>
        saveAPIKey: (id: string, key: string) => Promise<void>
        checkAPIKeyExists?: (id: string) => Promise<boolean>
        listModels: (baseURL: string, apiKey: string, providerType: string) => Promise<ModelInfoItem[]>
        cacheModels: (providerId: string, models: ModelInfoItem[]) => Promise<void>
        getSelectedModels?: (providerId: string) => string[]
        setSelectedModels?: (providerId: string, modelIds: string[]) => void
        getContextWindows?: () => Record<string, number>
        setContextWindow?: (modelId: string, tokens: number) => void
    }
    export interface LLMConfigPanelProps {
        api: LLMConfigPanelAPI
        autoAddAliyun?: boolean
        extraColumns?: any[]
        onBeforeSave?: (provider: LLMProviderItem) => Promise<void>
    }
    export const PROVIDER_PRESETS: { label: string; types: { label: string; value: string; url: string }[] }[]
    export const LLMConfigPanel: React.FC<LLMConfigPanelProps>
}
