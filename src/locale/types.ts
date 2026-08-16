/** Agent 面板 */
export interface PanelLocale {
    title: string
    history: string
    newSession: string
}

/** 输入框 */
export interface ChatInputLocale {
    placeholder: string
    stopTooltip: string
    addFileTooltip: string
    addImageTooltip: string
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
    /** 已选图片数/上限（{n}/{max} 为占位符） */
    imageCountLabel: string
    /** 附加文件引用的标签（发送消息时附在路径列表前的标题） */
    attachedFilesLabel: string
}

/** 消息气泡 */
export interface MessageLocale {
    reasoningTitle: string
    thinkingLabel: string
    retryButton: string
    continueButton: string
    maxIterationsNote: string
    truncatedSuffix: string
    fileChangeLabel: string
    revertButton: string
}

/** 工具调用卡片/时间线 */
export interface ToolLocale {
    paramLabel: string
    outputLabel: string
    errorLabel: string
    executingStatus: string
    completedStatus: string
    stepsLabel: string
}

/** 审批 */
export interface ApprovalLocale {
    riskLevelDangerous: string
    riskLevelModerate: string
    riskLevelSafe: string
    requiredTitle: string
    skipButton: string
    confirmButton: string
    modeAuto: string
    modeDefault: string
    modeManual: string
    /** VSCode 风格批准卡片文案 */
    allowButton: string
    /** 待审批计数（{n} 为数量占位） */
    pendingCount: string
    /** 批量全部允许按钮 */
    approveAllButton: string
    commandTitle: string
    fileTitle: string
    toolTitle: string
    commandDesc: string
    fileDesc: string
    toolDesc: string
    hiddenLines: string
    collapse: string
}

/** 会话历史 */
export interface SessionLocale {
    title: string
    noHistory: string
    untitled: string
    noMessages: string
    deleteConfirm: string
    deleted: string
    deleteFailed: string
    deleteButton: string
    cancelButton: string
    /** 右键菜单：重命名 */
    rename: string
    /** 右键菜单：固定 */
    pin: string
    /** 右键菜单：取消固定 */
    unpin: string
    /** 重命名对话框标题 */
    renameTitle: string
    /** 重命名输入占位符 */
    renamePlaceholder: string
    /** 重命名成功提示 */
    renameSuccess: string
}

/** 问卷 */
export interface QuestionnaireLocale {
    myAnswer: string
    confirmSelection: string
    backToEdit: string
    submit: string
    notSelected: string
    customAnswerPlaceholder: string
    inputPlaceholder: string
}

/** 错误边界 */
export interface ErrorLocale {
    title: string
    reload: string
}

/** Agent UI 框架完整国际化接口 */
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
