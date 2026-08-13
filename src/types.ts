// 统一公共类型定义：消除跨组件的重复类型（ModelOption/SelectedFile/工具条目等）。

/** 工具条目（时间线/卡片展示视图）。ToolCallEntry 另有 callId 用于消息树状态更新。 */
export interface ToolViewItem {
    name: string
    args: string
    status: 'executing' | 'done' | 'error'
    result?: any
    output?: string
}

/** 常驻子代理交接项（.agent.md handoffs）。 */
export interface AgentHandoff {
    label?: string
    agent?: string
    prompt?: string
    send?: boolean
    show_continue_on?: boolean
}

/** 常驻子代理状态（agent 编排树，来自 agent_status / GetAgentRoster）。 */
export interface AgentStatus {
    agent_id: string
    name: string
    status: string
    session_id: string
    parent_id?: string
    depth: number
    task?: string
    summary?: string
    files_changed?: string[]
    handoffs?: AgentHandoff[]
    error?: string
    transient?: boolean
    created_at?: string
    updated_at?: string
}

/** 模型下拉选项 */
export interface ModelOption {
    label: string
    value: string
    providerId: string
}

/** 随消息提交的已选文件 */
export interface SelectedFile {
    path: string
    startLine?: number
    endLine?: number
}

/** 随消息提交的图片 */
export interface SelectedImage {
    url: string
    name: string
    /** 压缩后 data URI 预览（webview 加载本地 file:// 不可靠，用后端返回的 base64） */
    preview?: string
    /** 压缩后字节数 */
    size?: number
}

/** 待审批项 */
export interface ApprovalItem {
    approvalId: string
    command: string
    riskLevel: string
}

/** 会话信息 */
export interface SessionInfo {
    session_id: string
    title: string
    preview?: string
    msg_count?: number
    last_time?: string
    token_usage?: any
    /** 会话是否固定（固定会话在列表置顶） */
    pinned?: boolean
}

/** token 用量 */
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
