import { useState, useCallback } from 'react'
import { useRef, useEffect } from 'react'

export interface ModelOption {
    label: string
    value: string
    providerId: string
}

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

export function useModelLoader(
    collapsed: boolean,
    configProvider: ConfigProvider,
    _onOpenSettings?: () => void,
): ModelState {
    const [modelOptions, setModelOptions] = useState<ModelOption[]>([])
    const [currentModel, setCurrentModelState] = useState('')
    const [thinking, setThinkingState] = useState('off')
    const [activeProviderId, setActiveProviderId] = useState('')
    const [currentContextWindow, setCurrentContextWindow] = useState(0)

    const loadModels = useCallback(async () => {
        const providers = configProvider.getLLMProviders()
        if (!providers?.length) return null
        const options: ModelOption[] = []
        let firstProviderId = ''
        let firstModel = ''
        for (const p of providers) {
            if (!p.selected_models?.length) continue
            if (!firstProviderId) firstProviderId = p.id
            for (const m of p.selected_models) {
                if (!firstModel) firstModel = m
                options.push({ label: `${m} / ${p.name}`, value: `${p.id}||${m}`, providerId: p.id })
            }
        }
        setModelOptions(options)
        const savedProvider = configProvider.getActiveProviderId() || firstProviderId
        const savedModel = configProvider.getLastSelectedModel(savedProvider)
        const activeModel = savedModel || (options.find(o => o.providerId === savedProvider)?.value.split('||')[1] || firstModel)
        const savedThinking = configProvider.getLastThinkingMode(savedProvider)
        setActiveProviderId(savedProvider)
        setCurrentModelState(`${savedProvider}||${activeModel}`)
        setThinkingState(savedThinking || 'off')
        const cw = configProvider.getModelContextWindow(savedProvider, activeModel)
        setCurrentContextWindow(cw)
        return { providerId: savedProvider, modelName: activeModel }
    }, [configProvider])

    const setCurrentModel = useCallback((v: string) => {
        setCurrentModelState(v)
        const [pid, model] = v.split('||')
        setActiveProviderId(pid)
        configProvider.setLastSelectedModel(pid, model)
        const cw = configProvider.getModelContextWindow(pid, model)
        setCurrentContextWindow(cw)
    }, [configProvider])

    const setThinking = useCallback((v: string) => {
        setThinkingState(v)
        configProvider.setLastThinkingMode(v)
    }, [configProvider])

    useEffect(() => {
        if (!collapsed) loadModels()
    }, [collapsed, loadModels])

    useEffect(() => {
        const handler = () => loadModels()
        window.addEventListener('llm-config-changed', handler)
        return () => window.removeEventListener('llm-config-changed', handler)
    }, [loadModels])

    return { modelOptions, currentModel, thinking, activeProviderId, currentContextWindow, loadModels, setCurrentModel, setThinking }
}
