export { enLocale as defaultLocale } from './en'
export { zhLocale } from './zh'
export type { AgentUILocale, PanelLocale, ChatInputLocale, MessageLocale, ToolLocale, ApprovalLocale, SessionLocale, QuestionnaireLocale, ErrorLocale } from './types'

import { createContext, useContext } from 'react'
import type { AgentUILocale } from './types'
import { enLocale } from './en'

/** Agent UI Context 承载的所有值（locale + 框架配置） */
export interface AgentUIContextValue extends AgentUILocale {
    toolDisplayNames?: Record<string, string>
    formatModelLabel?: (modelValue: string) => string
    darkMode?: boolean
}

/** 用于向下传递 locale + 框架配置的 Context */
export const AgentUIContext = createContext<AgentUIContextValue>({ ...enLocale })

/** 获取当前 locale + 框架配置的 hook */
export function useAgentLocale(): AgentUIContextValue {
    return useContext(AgentUIContext)
}
