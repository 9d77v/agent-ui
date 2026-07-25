import { createContext, useContext } from 'react'

/** Agent UI 框架的所有可配置文本 */
export interface AgentUILocale {
    // AgentPanel
    panelTitle: string
    historyTitle: string
    newSessionTitle: string

    // ChatInput
    inputPlaceholder: string
    sendTooltip: string
    stopTooltip: string
    addFileTooltip: string
    docsAttachedTooltip: string
    docsNotAttachedTooltip: string
    docsLabel: string
    noDocsLabel: string
    manageModelsLabel: string
    modelLabel: string
    toolConfigTooltip: string
    thinkingOff: string
    thinkingDefault: string
    thinkingDeep: string

    // MessageBubble
    reasoningTitle: string
    thinkingLabel: string
    retryButton: string
    truncatedSuffix: string
    fileChangeLabel: string
    revertButton: string

    // CommandApproval
    riskLevelDangerous: string
    riskLevelModerate: string
    riskLevelSafe: string
    approvalRequiredTitle: string
    skipButton: string
    confirmButton: string

    // ApprovalStatusBar
    approvalModeAuto: string
    approvalModeDefault: string
    approvalModeManual: string

    // ErrorBoundary
    errorBoundaryText: string
    reloadButton: string

    // SessionHistory
    noHistoryText: string
    untitledLabel: string
    noMessagesLabel: string
    deleteConfirmText: string
    deletedText: string
    deleteFailedText: string
    deleteButton: string
    cancelButton: string

    // QuestionnaireForm
    myAnswerLabel: string
    confirmSelectionText: string
    backToEditText: string
    submitAnswerText: string
    notSelectedText: string
    customAnswerPlaceholder: string
    questionInputPlaceholder: string

    // ToolCallCard / ToolTimeline
    paramLabel: string
    outputLabel: string
    errorLabel: string
    executingStatus: string
    completedStatus: string
    stepsLabel: string
}

/** 默认英文文本 */
export const defaultLocale: AgentUILocale = {
    panelTitle: 'AI Assistant',
    historyTitle: 'History',
    newSessionTitle: 'New Session',

    inputPlaceholder: 'Type a message, Enter to send, Shift+Enter for new line',
    sendTooltip: 'Send',
    stopTooltip: 'Stop',
    addFileTooltip: 'Add File',
    docsAttachedTooltip: 'Project docs attached',
    docsNotAttachedTooltip: 'Project docs not attached',
    docsLabel: 'Docs',
    noDocsLabel: 'No Docs',
    manageModelsLabel: 'Manage Models',
    modelLabel: 'Model',
    toolConfigTooltip: 'Tool Config',
    thinkingOff: 'Off',
    thinkingDefault: 'Default',
    thinkingDeep: 'Deep',

    reasoningTitle: 'Reasoning',
    thinkingLabel: 'Thinking...',
    retryButton: 'Retry',
    truncatedSuffix: '... (truncated)',
    fileChangeLabel: 'File Change',
    revertButton: 'Revert',

    riskLevelDangerous: '🔴 Dangerous',
    riskLevelModerate: '🟡 Moderate',
    riskLevelSafe: '🔵 Safe',
    approvalRequiredTitle: 'Approval Required',
    skipButton: 'Skip',
    confirmButton: 'Confirm',

    approvalModeAuto: 'Smart Approval',
    approvalModeDefault: 'Default Approval',
    approvalModeManual: 'Manual Approval',

    errorBoundaryText: 'Agent panel encountered an error',
    reloadButton: 'Reload',

    noHistoryText: 'No history',
    untitledLabel: '(Untitled)',
    noMessagesLabel: '(No messages)',
    deleteConfirmText: 'Delete this session?',
    deletedText: 'Deleted',
    deleteFailedText: 'Delete failed',
    deleteButton: 'Delete',
    cancelButton: 'Cancel',

    myAnswerLabel: 'My Answer:',
    confirmSelectionText: 'Confirm your selection',
    backToEditText: 'Back to Edit',
    submitAnswerText: 'Submit',
    notSelectedText: 'Not Selected',
    customAnswerPlaceholder: 'Or type a custom answer here...',
    questionInputPlaceholder: 'Please enter...',

    paramLabel: 'Parameters',
    outputLabel: 'Output',
    errorLabel: 'Error',
    executingStatus: 'Executing',
    completedStatus: 'Completed',
    stepsLabel: 'steps',
}

/** Agent UI Context 承载的所有值（locale + 框架配置） */
export interface AgentUIContextValue extends AgentUILocale {
    toolDisplayNames?: Record<string, string>
    formatModelLabel?: (modelValue: string) => string
    darkMode?: boolean
}

/** 用于向下传递 locale + 框架配置的 Context */
export const AgentUIContext = createContext<AgentUIContextValue>({ ...defaultLocale })

/** 获取当前 locale + 框架配置的 hook */
export function useAgentLocale(): AgentUIContextValue {
    return useContext(AgentUIContext)
}

/** 内置中文 locale */
export const zhLocale: AgentUILocale = {
    panelTitle: 'AI 助手',
    historyTitle: '历史会话',
    newSessionTitle: '新会话',
    inputPlaceholder: '输入消息，Enter 发送，Shift+Enter 换行',
    sendTooltip: '发送',
    stopTooltip: '停止',
    addFileTooltip: '添加文件',
    docsAttachedTooltip: '已附加项目文档',
    docsNotAttachedTooltip: '未附加项目文档',
    docsLabel: '文档',
    noDocsLabel: '无文档',
    manageModelsLabel: '管理模型',
    modelLabel: '模型',
    toolConfigTooltip: '工具配置',
    thinkingOff: '停用',
    thinkingDefault: '标准',
    thinkingDeep: '深度',
    reasoningTitle: '思考过程',
    thinkingLabel: '思考中...',
    retryButton: '重试',
    truncatedSuffix: '... (已截断)',
    fileChangeLabel: '文件变更',
    revertButton: '撤回',
    riskLevelDangerous: '🔴 危险',
    riskLevelModerate: '🟡 中等',
    riskLevelSafe: '🔵 安全',
    approvalRequiredTitle: '需要确认',
    skipButton: '跳过',
    confirmButton: '确认执行',
    approvalModeAuto: '智能审批',
    approvalModeDefault: '默认审批',
    approvalModeManual: '绕过审批',
    errorBoundaryText: 'Agent 面板遇到异常',
    reloadButton: '重新加载',
    noHistoryText: '暂无历史会话',
    untitledLabel: '(无标题)',
    noMessagesLabel: '(暂无消息)',
    deleteConfirmText: '确定删除此会话？',
    deletedText: '已删除',
    deleteFailedText: '删除失败',
    deleteButton: '删除',
    cancelButton: '取消',
    myAnswerLabel: '我的回答：',
    confirmSelectionText: '确认您的选择',
    backToEditText: '返回修改',
    submitAnswerText: '提交回答',
    notSelectedText: '未选择',
    customAnswerPlaceholder: '或在此输入自定义回答...',
    questionInputPlaceholder: '请输入...',
    paramLabel: '参数',
    outputLabel: '输出',
    errorLabel: '错误',
    executingStatus: '执行中',
    completedStatus: '已完成',
    stepsLabel: '个步骤',
}
