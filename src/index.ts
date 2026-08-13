/**
 * agent-ui — 通用 Agent UI 框架
 */
export { AgentUIContext, useAgentLocale, defaultLocale, zhLocale } from './locale/index'
export type { AgentUILocale, AgentUIContextValue } from './locale/index'

export { useMessageTree } from './hooks/useMessageTree'
export type { AgentMessage, ToolCallEntry, MessageTree } from './hooks/useMessageTree'

export { useAgentWebSocket } from './hooks/useAgentWebSocket'

export { useAgentPanelState } from './hooks/useAgentPanelState'
export type { UseAgentPanelStateOptions, UseAgentPanelStateResult, PendingApprovalItem } from './hooks/useAgentPanelState'

export { useModelLoader } from './hooks/useModelLoader'
export type { ModelOption, ModelState, ConfigProvider } from './hooks/useModelLoader'

export { default as FrameworkAgentPanel, mergeRosterAgents } from './AgentPanel'
export type { SessionInfo, PanelProps } from './AgentPanel'

export { AgentModal, ToolConfigModal, FilePickerModal } from './modal'
export type { AgentModalProps, ToolConfigModalProps, FilePickerModalProps, ToolTreeNode } from './modal'

export { default as MessageList } from './MessageList'
export { default as MessageBubble } from './MessageBubble'
export { default as ChatInput } from './ChatInput'
export type { ChatInputProps } from './ChatInput'

export { default as ToolCallCard } from './ToolCallCard'

export { default as AgentRoster } from './AgentRoster'

export { default as AgentTranscript } from './AgentTranscript'

export { default as ToolTimeline } from './ToolTimeline'

export type { ToolViewItem, AgentStatus, AgentHandoff } from './types'

export { debounce, createModelConfigProvider } from './utils'

export { default as CommandApproval, parseApproval, languageBadge } from './CommandApproval'
export type { ParsedApproval, ApprovalKind } from './CommandApproval'
export { default as ApprovalStatusBar } from './ApprovalStatusBar'
export { default as SessionHistory } from './SessionHistory'
export { default as QuestionnaireForm } from './QuestionnaireForm'
export type { QuestionStep } from './QuestionnaireForm'

export { default as TokenProgress } from './TokenProgress'
export { default as ErrorBoundary } from './ErrorBoundary'
