import { useState, useEffect } from 'react'
import {
    Button, Checkbox, Form, Input, Select, Space, Table, Tag, Typography,
    message, Modal, Empty, Popconfirm, Divider,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

// ========================================
// 类型定义
// ========================================

export interface LLMProviderItem {
    id: string
    name: string
    provider_type: string
    base_url: string
    preset_name?: string
    workspace_id?: string
    is_default?: boolean
    created_at?: string
    selected_models?: string[]
}

export interface ModelInfoItem {
    id: string
    created?: number
    owned_by?: string
}

export interface LLMConfigPanelAPI {
    /** 获取所有 LLM 供应商列表 */
    getProviders: () => LLMProviderItem[] | Promise<LLMProviderItem[]>
    /** 添加新供应商 */
    addProvider: (provider: LLMProviderItem) => Promise<void>
    /** 更新供应商 */
    updateProvider: (provider: LLMProviderItem) => Promise<void>
    /** 删除供应商 */
    deleteProvider: (id: string) => Promise<void>
    /** 保存 API Key */
    saveAPIKey: (id: string, key: string) => Promise<void>
    /** 检查 API Key 是否存在（可选） */
    checkAPIKeyExists?: (id: string) => Promise<boolean>
    /** 获取模型列表 */
    listModels: (baseURL: string, apiKey: string, providerType: string) => Promise<ModelInfoItem[]>
    /** 缓存模型列表 */
    cacheModels: (providerId: string, models: ModelInfoItem[]) => Promise<void>
    /** 获取已选模型 */
    getSelectedModels?: (providerId: string) => string[]
    /** 设置已选模型 */
    setSelectedModels?: (providerId: string, modelIds: string[]) => void
    /** 获取上下文窗口大小（可选） */
    getContextWindows?: () => Record<string, number>
    /** 设置上下文窗口大小（可选） */
    setContextWindow?: (modelId: string, tokens: number) => void
}

export interface LLMConfigPanelProps {
    api: LLMConfigPanelAPI
    autoAddAliyun?: boolean
    /** 额外表格列（如上下文窗口） */
    extraColumns?: any[]
    /** 保存前的额外处理 */
    onBeforeSave?: (provider: LLMProviderItem) => Promise<void>
}

// ========================================
// 供应商预设
// ========================================

export const PROVIDER_PRESETS = [
    {
        label: 'DeepSeek',
        types: [
            { label: 'OpenAI', value: 'openai', url: 'https://api.deepseek.com' },
            { label: 'Anthropic', value: 'anthropic', url: 'https://api.deepseek.com/anthropic' },
        ],
    },
    {
        label: '阿里云百炼',
        types: [
            { label: 'OpenAI', value: 'openai', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
        ],
    },
    {
        label: 'LM Studio',
        types: [
            { label: 'OpenAI', value: 'openai', url: 'http://127.0.0.1:1234/v1' },
        ],
    },
    {
        label: '自定义',
        types: [
            { label: 'OpenAI', value: 'openai', url: '' },
            { label: 'Anthropic', value: 'anthropic', url: '' },
        ],
    },
]

// ========================================
// 组件
// ========================================

export default function LLMConfigPanel({ api, autoAddAliyun, extraColumns, onBeforeSave }: LLMConfigPanelProps) {
    const [providers, setProviders] = useState<LLMProviderItem[]>([])
    const [loading, setLoading] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingProvider, setEditingProvider] = useState<LLMProviderItem | null>(null)
    const [selectedProvider, setSelectedProvider] = useState<string>('')
    const [selectedType, setSelectedType] = useState<string>('')
    const [tempApiKey, setTempApiKey] = useState('')
    const [fetchingModels, setFetchingModels] = useState(false)
    const [modelList, setModelList] = useState<ModelInfoItem[]>([])
    const [hasApiKey, setHasApiKey] = useState(false)
    const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set())
    const [form] = Form.useForm()

    const loadProviders = async () => {
        setLoading(true)
        try {
            const data = await api.getProviders()
            setProviders(Array.isArray(data) ? data : [])
        } catch { /* ignore */ }
        finally { setLoading(false) }
    }

    useEffect(() => { loadProviders() }, [])

    // 自动弹出添加阿里云百炼对话框
    useEffect(() => {
        if (autoAddAliyun && !editingProvider) {
            handleAdd()
            setTimeout(() => {
                const preset = PROVIDER_PRESETS.find(p => p.label === '阿里云百炼')
                if (preset) {
                    setSelectedProvider('阿里云百炼')
                    setModelList([])
                    const firstType = preset.types[0]
                    setSelectedType(firstType.value)
                    form.setFieldsValue({ base_url: firstType.url })
                }
            }, 100)
        }
    }, [autoAddAliyun])

    // 当前选中的供应商预设
    const currentPreset = PROVIDER_PRESETS.find(p => p.label === selectedProvider)

    // 处理打开添加对话框
    const handleAdd = () => {
        setEditingProvider(null)
        setSelectedProvider('')
        setSelectedType('')
        setTempApiKey('')
        setModelList([])
        setSelectedModelIds(new Set())
        setHasApiKey(false)
        form.resetFields()
        setModalOpen(true)
    }

    // 处理打开编辑对话框
    const handleEdit = async (record: LLMProviderItem) => {
        setEditingProvider(record)
        setSelectedProvider('')
        setSelectedType(record.provider_type)
        setModelList([])
        setSelectedModelIds(new Set((api.getSelectedModels?.(record.id) || record.selected_models || []) as string[]))
        const windows = api.getContextWindows?.() ?? {}
        setTempApiKey('')

        // 检查 API Key 是否存在
        if (api.checkAPIKeyExists) {
            try {
                const exists = await api.checkAPIKeyExists(record.id)
                setHasApiKey(exists)
            } catch { setHasApiKey(false) }
        }

        form.setFieldsValue({
            name: record.name,
            base_url: record.base_url,
            provider_type: record.provider_type,
            workspace_id: record.workspace_id || '',
        })
        setModalOpen(true)
    }

    // 处理选择供应商
    const handleProviderSelect = (value: string) => {
        setSelectedProvider(value)
        setSelectedType('')
        setModelList([])
        const preset = PROVIDER_PRESETS.find(p => p.label === value)
        if (preset && preset.types.length > 0) {
            const firstType = preset.types[0]
            setSelectedType(firstType.value)
            form.setFieldsValue({ provider_type: firstType.value, base_url: firstType.url })
        }
    }

    // 判断是否能刷新模型列表
    const canFetchModels = () => {
        const url = form.getFieldValue('base_url')
        return url && url.trim() !== '' && (tempApiKey || hasApiKey)
    }

    // 刷新模型列表
    const handleFetchModels = async () => {
        const url = form.getFieldValue('base_url')
        if (!url) { message.warning('请先填写 API 地址'); return }

        // 如果没有临时 API Key 且没有已保存的 Key，则提示
        if (!tempApiKey && !hasApiKey) {
            message.warning('请先输入 API Key')
            return
        }

        setFetchingModels(true)
        try {
            const apiKey = tempApiKey || '' // 后端会从凭据管理器读取已保存的 Key
            const models = await api.listModels(url, apiKey, selectedType || 'openai')
            setModelList(models)
            if (models.length === 0) {
                message.info('未获取到模型列表，请检查 API 地址和 Key')
            } else {
                message.success(`获取到 ${models.length} 个模型`)
            }
        } catch (e: any) {
            message.error('获取模型列表失败: ' + (e?.message || String(e)))
        } finally {
            setFetchingModels(false)
        }
    }

    // 处理保存
    const handleSave = async () => {
        try {
            const values = await form.validateFields()
            const provider: LLMProviderItem = {
                id: editingProvider?.id || '',
                name: values.name,
                provider_type: selectedType || values.provider_type,
                base_url: values.base_url,
                preset_name: (selectedProvider !== '自定义' && selectedProvider !== '') ? selectedProvider : undefined,
                workspace_id: values.workspace_id || undefined,
                is_default: editingProvider?.is_default,
            }

            if (onBeforeSave) {
                await onBeforeSave(provider)
            }

            if (editingProvider) {
                await api.updateProvider(provider)
            } else {
                await api.addProvider(provider)
            }

            // 保存 API Key
            if (tempApiKey) {
                await api.saveAPIKey(provider.id, tempApiKey)
            }

            // 缓存模型列表
            if (modelList.length > 0) {
                await api.cacheModels(provider.id, modelList)
            }

            // 保存选中的模型
            if (api.setSelectedModels && selectedModelIds.size > 0) {
                api.setSelectedModels(provider.id, Array.from(selectedModelIds))
            }

            message.success(editingProvider ? '已更新' : '已添加')
            setModalOpen(false)
            await loadProviders()
        } catch (e: any) {
            if (e?.message) message.error(e.message)
        }
    }

    // 处理删除
    const handleDelete = async (id: string) => {
        try {
            await api.deleteProvider(id)
            message.success('已删除')
            await loadProviders()
        } catch (e: any) {
            message.error('删除失败: ' + (e?.message || String(e)))
        }
    }

    // 表格列定义
    const columns = [
        { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
        { title: 'API 类型', dataIndex: 'provider_type', key: 'provider_type', width: 100,
            render: (v: string) => <Tag>{v}</Tag>,
        },
        { title: 'API 地址', dataIndex: 'base_url', key: 'base_url', ellipsis: true },
        { title: '预设', dataIndex: 'preset_name', key: 'preset_name', width: 100 },
        ...(extraColumns || []),
        {
            title: '操作', key: 'action', width: 100,
            render: (_: any, record: LLMProviderItem) => (
                <Space>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                        编辑
                    </Button>
                    <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
                        <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ]

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={5} style={{ margin: 0 }}>LLM 供应商</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加供应商</Button>
            </div>

            {providers.length === 0 && !loading ? (
                <Empty description="暂无供应商，请添加" />
            ) : (
                <Table
                    dataSource={providers}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    size="small"
                />
            )}

            <Modal
                title={editingProvider ? '编辑供应商' : '添加供应商'}
                open={modalOpen}
                onOk={handleSave}
                onCancel={() => setModalOpen(false)}
                width={640}
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
                        <Input placeholder="例如: DeepSeek Chat" />
                    </Form.Item>

                    <Form.Item label="供应商" help="选择预设自动填充 API 地址">
                        <Select
                            placeholder="选择预设（可选）"
                            value={selectedProvider || undefined}
                            onChange={handleProviderSelect}
                            allowClear
                            options={PROVIDER_PRESETS.map(p => ({ label: p.label, value: p.label }))}
                        />
                    </Form.Item>

                    <Form.Item label="API 类型" name="provider_type" rules={[{ required: true, message: '请选择 API 类型' }]}>
                        <Select
                            value={selectedType || undefined}
                            onChange={(v) => { setSelectedType(v); if (!currentPreset) form.setFieldsValue({ base_url: '' }) }}
                            options={
                                currentPreset
                                    ? currentPreset.types.map(t => ({ label: t.label, value: t.value }))
                                    : [
                                        { label: 'OpenAI', value: 'openai' },
                                        { label: 'Anthropic', value: 'anthropic' },
                                    ]
                            }
                        />
                    </Form.Item>

                    <Form.Item label="API 地址" name="base_url" rules={[{ required: true, message: '请输入 API 地址' }]}>
                        <Input placeholder="https://api.openai.com/v1" />
                    </Form.Item>

                    <Form.Item label="工作空间 ID" name="workspace_id">
                        <Input placeholder="可选" />
                    </Form.Item>

                    <Divider />
                    <Text type="secondary" style={{ fontSize: 12 }}>保存供应商后，API Key 将通过系统凭据管理器安全存储。</Text>

                    <div style={{ marginTop: 8 }}>
                        <Input.Password
                            placeholder={hasApiKey ? '已保存 API Key（留空不修改）' : '输入 API Key'}
                            value={tempApiKey}
                            onChange={e => setTempApiKey(e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <Divider />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text strong>模型列表</Text>
                        <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={handleFetchModels}
                            loading={fetchingModels}
                            disabled={!canFetchModels()}
                        >
                            刷新模型列表
                        </Button>
                    </div>

                    {modelList.length > 0 && (
                        <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #d9d9d9', borderRadius: 6, padding: 8 }}>
                            <Checkbox
                                checked={selectedModelIds.size === modelList.length}
                                indeterminate={selectedModelIds.size > 0 && selectedModelIds.size < modelList.length}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedModelIds(new Set(modelList.map(m => m.id)))
                                    } else {
                                        setSelectedModelIds(new Set())
                                    }
                                }}
                                style={{ marginBottom: 4 }}
                            >
                                全选
                            </Checkbox>
                            {modelList.map(m => (
                                <div key={m.id} style={{ padding: '2px 0' }}>
                                    <Checkbox
                                        checked={selectedModelIds.has(m.id)}
                                        onChange={(e) => {
                                            const next = new Set(selectedModelIds)
                                            if (e.target.checked) next.add(m.id)
                                            else next.delete(m.id)
                                            setSelectedModelIds(next)
                                        }}
                                    >
                                        <Text style={{ fontSize: 13 }}>{m.id}</Text>
                                    </Checkbox>
                                </div>
                            ))}
                        </div>
                    )}
                </Form>
            </Modal>
        </div>
    )
}
