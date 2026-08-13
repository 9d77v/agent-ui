import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { message } from 'antd'
import { useMessageTree, type MessageTree } from './useMessageTree'
import { useAgentWebSocket, type WsOutput } from './useAgentWebSocket'
import { defaultLocale, type AgentUILocale, type AgentUIContextValue } from '../locale'
import type { SessionInfo, SelectedFile, SelectedImage, AgentStatus } from '../types'

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

/** 待审批项（含来源子代理标注） */
export interface PendingApprovalItem {
    approvalId: string
    command: string
    riskLevel: string
    agent?: string
}

/** useAgentPanelState 入参：取自 PanelProps 的会话/WS/附件/roster 相关字段 */
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
    /** 子代理交接回调（plan 完成后的「开始实现」等）。缺省：把 prompt 作为新用户消息发送给主 agent */
    onHandoff?: (label: string, prompt: string) => void
    /** 会话初始审批模式（宿主从后端 GetApprovalMode 读取；重启后绕过审批等持久化设置不丢失） */
    initialApprovalMode?: string
    /** 会话详情关联的子代理列表（打开会话时由宿主 GetSessionAgents 提供；优先于全局 agent_status 推送） */
    sessionAgents?: AgentStatus[]
    selectedFiles?: SelectedFile[]
    onClearFiles?: () => void
    selectedImages?: SelectedImage[]
    onClearImages?: () => void
    sessions?: SessionInfo[]
}

/** useAgentPanelState 出参：会话/WS/审批/问卷/roster/发送的完整状态与回调 */
export interface UseAgentPanelStateResult {
    msgTree: MessageTree
    ws: WsOutput
    sessionID: string
    setSessionID: (id: string) => void
    sessions: SessionInfo[]
    approvalMode: string
    handleApprovalModeChange: (mode: string) => void
    /** 审批卡片当前索引（同批多项时翻页审阅） */
    approvalIndex: number
    pendingApproval: PendingApprovalItem | null
    approveAll: () => void
    prevApproval: () => void
    nextApproval: () => void
    questionnaireData: { id: string; questions: any[] } | null
    setQuestionnaireData: (v: { id: string; questions: any[] } | null) => void
    /** 会话级子代理列表（last-known 合并：行保留、状态定格，terminated 不消失） */
    rosterAgents: AgentStatus[]
    /** 发送：文字+文件引用+图片拼接；空请求拦截；发送后清空附件 */
    handleSend: (text?: string) => Promise<void>
    handleHandoff: (label: string, prompt: string) => void
    contextValue: AgentUIContextValue
    mergedLocale: AgentUILocale
}

/**
 * 抽取 FrameworkAgentPanel 的全部「胶水」状态与回调（消息树 + WS + 会话 + 审批多卡索引 +
 * 问卷同步 + roster last-known 合并 + 发送拼接 + 交接），供 FrameworkAgentPanel 薄壳与新宿主
 * 布局共用，单一状态源（避免两处漂移）。
 */
export function useAgentPanelState(opts: UseAgentPanelStateOptions): UseAgentPanelStateResult {
    const mergedLocale = useMemo<AgentUILocale>(() => ({ ...defaultLocale, ...opts.locale }), [opts.locale])
    const msgTree = useMessageTree()
    const [sessionID, setSessionID] = useState(opts.sessionID || '')
    const [approvalMode, setApprovalMode] = useState<string>(opts.initialApprovalMode || 'default')
    const [sessions, setSessions] = useState<SessionInfo[]>(opts.sessions || [])

    const ws = useAgentWebSocket({
        messageTree: msgTree, sessionID,
        currentModel: opts.currentModel || '',
        activeProviderId: opts.activeProviderId || '',
        thinking: opts.thinking || 'off',
        approvalMode,
        includeProjectDocs: opts.includeProjectDocs !== undefined ? opts.includeProjectDocs : true,
        getWebSocketURL: opts.getWebSocketURL,
    })
    // 宿主在会话打开时从后端读取持久化审批模式并传入（重启后绕过审批等设置不丢失）
    useEffect(() => {
        if (opts.initialApprovalMode) {
            setApprovalMode(opts.initialApprovalMode)
        }
    }, [opts.initialApprovalMode])
    // 切换审批模式：更新 UI 状态 + 通知后端即时生效（当前编排后续工具判定立即读取最新值）
    const handleApprovalModeChange = useCallback((mode: string) => {
        setApprovalMode(mode)
        ws.updateApprovalMode(mode)
    }, [ws.updateApprovalMode])
    // 子代理交接：宿主可自定义；缺省把交接指令作为新用户消息发给主 agent
    const handleHandoff = useCallback((label: string, prompt: string) => {
        if (opts.onHandoff) { opts.onHandoff(label, prompt); return }
        ws.sendText(prompt || label || '')
    }, [opts.onHandoff, ws.sendText])
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

    useEffect(() => { setSessionID(opts.sessionID); if (!opts.sessionID) msgTree.clearMessages() }, [opts.sessionID])
    useEffect(() => { if (opts.sessions) setSessions(opts.sessions) }, [opts.sessions])
    useEffect(() => { setQuestionnaireData(ws.questionnaireData) }, [ws.questionnaireData])

    // 发送：文本由 ChatInput 内部管理（非受控），发送时经 onSend(text) 回调传入，避免打字整树重渲染
    const handleSend = useCallback(async (text?: string) => {
        const images = opts.selectedImages || []
        const files = opts.selectedFiles || []
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
        if (opts.onClearFiles) opts.onClearFiles()
        if (opts.onClearImages) opts.onClearImages()
    }, [ws, opts.selectedFiles, opts.onClearFiles, opts.selectedImages, opts.onClearImages, mergedLocale])

    const contextValue = useMemo<AgentUIContextValue>(() => ({
        ...mergedLocale,
        toolDisplayNames: opts.toolDisplayNames,
        formatModelLabel: opts.formatModelLabel,
        darkMode: opts.darkMode,
    }), [mergedLocale, opts.toolDisplayNames, opts.formatModelLabel, opts.darkMode])

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
        () => mergeRosterAgents(lastKnownRef.current, ws.agents, opts.sessionAgents, sessionID),
        [opts.sessionAgents, ws.agents, sessionID],
    )

    return {
        msgTree, ws, sessionID, setSessionID, sessions,
        approvalMode, handleApprovalModeChange,
        approvalIndex, pendingApproval, approveAll, prevApproval, nextApproval,
        questionnaireData, setQuestionnaireData,
        rosterAgents, handleSend, handleHandoff, contextValue, mergedLocale,
    }
}
