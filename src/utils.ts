/**
 * agent-ui 共享工具函数
 */

// 防抖工具
export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number) {
    let timer: ReturnType<typeof setTimeout> | null = null
    const debounced = (...args: Parameters<T>) => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
            fn(...args)
            timer = null
        }, ms)
    }
    debounced.cancel = () => {
        if (timer) { clearTimeout(timer); timer = null }
    }
    return debounced
}

/**
 * 配置提供者适配器
 * 用于适配 useModelLoader 所需的 ConfigProvider 接口
 */
export function createModelConfigProvider(config: {
    getLLMProviders?: () => any[]
    getDefaultLLMID?: () => string
    getProvider?: (id: string) => any
    getCachedModels?: (id: string) => any[]
    getSelectedModels?: (id: string) => string[]
    getLastSelectedModel?: (providerId: string) => string
    setLastSelectedModel?: (providerId: string, model: string) => void
    getLastThinkingMode?: (providerId: string) => string
    setLastThinkingMode?: (providerId: string, mode: string) => void
    getModelContextWindows?: (providerId?: string) => Record<string, number>
    setModelContextWindow?: (id: string, tokens: number) => void
}) {
    return {
        getLLMProviders: config.getLLMProviders ?? (() => []),
        getActiveProviderId: () => config.getDefaultLLMID?.(),
        getLastSelectedModel: (providerId: string) => config.getLastSelectedModel?.(providerId) ?? '',
        setLastSelectedModel: (providerId: string, modelId: string) => config.setLastSelectedModel?.(providerId, modelId),
        getLastThinkingMode: (providerId: string) => config.getLastThinkingMode?.(providerId) ?? '',
        setLastThinkingMode: (providerId: string, mode: string) => config.setLastThinkingMode?.(providerId, mode),
        getModelContextWindow: (providerId: string, modelId: string) => {
            const windows = config.getModelContextWindows?.(providerId) ?? {}
            return windows[modelId] ?? windows[providerId] ?? 0
        },
    }
}
