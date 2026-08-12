import { useState, useEffect, useMemo } from 'react'
import { Button, Input, Typography, Space, Progress, theme } from 'antd'
import { RightOutlined, CheckOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useAgentLocale } from './locale/index'
const { Text } = Typography

export interface QuestionStep { id: string; question: string; options?: string[]; default?: string; custom?: boolean; input?: boolean; last?: boolean; multi?: boolean; allowFreeformInput?: boolean }
interface Props { steps: QuestionStep[]; initialAnswers?: Record<string, string>; onSaveProgress?: (answers: Record<string, string>) => void; onComplete: (answers: string) => void; darkMode?: boolean }

export default function QuestionnaireForm({ steps, initialAnswers, onSaveProgress, onComplete, darkMode }: Props) {
    const { token } = theme.useToken()
    const loc = useAgentLocale()
    // 归一化 step id（防御）：后端已保证唯一（空/重复 header 回退 qN），此处兜底防止旧数据/其他来源的碰撞
    const normSteps = useMemo(() => {
        const used = new Set<string>()
        return steps.map((s, i) => {
            let id = s.id || ''
            if (!id || used.has(id)) {
                id = `q${i + 1}`
                let j = 2
                while (used.has(id)) id = `q${i + 1}_${j++}`
            }
            used.add(id)
            return { ...s, id }
        })
    }, [steps])
    const total = normSteps.length
    const [showReview, setShowReview] = useState(false)
    const [currentIdx, setCurrentIdx] = useState(() => { if (initialAnswers) { for (let i = 0; i < normSteps.length; i++) if (!initialAnswers[normSteps[i].id]) return i; return normSteps.length } return 0 })
    const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers || {})
    // 每个问题的自定义输入框内容（per-step 隔离：问题间独立，切换问题不串扰）
    const [customTexts, setCustomTexts] = useState<Record<string, string>>({})
    const [preSelected] = useState<Record<string, string>>(() => { const init: Record<string, string> = {}; for (const s of normSteps) { if (initialAnswers?.[s.id]) init[s.id] = initialAnswers[s.id]; else if (s.default) init[s.id] = s.default } return init })
    useEffect(() => { if (currentIdx >= total) setShowReview(true) }, [])
    const saveProgress = (a: Record<string, string>) => onSaveProgress?.(a)
    const step = currentIdx < total ? normSteps[currentIdx] : null
    const currentDefault = step ? (preSelected[step.id] || '') : ''
    useEffect(() => { if (!step || answers[step.id] || !currentDefault) return; const na = { ...answers, [step.id]: currentDefault }; setAnswers(na); saveProgress(na) }, [currentIdx])
    const isMulti = (s: QuestionStep): boolean => { if (typeof s.multi === 'boolean') return s.multi; if (/多选|\((.*?可.*?多.*?)\)|（.*?可.*?多.*?）/i.test(s.question)) return true; return false }
    const selectOption = (value: string) => { if (!step) return; const cur = answers[step.id] || ''; let nv: string; if (isMulti(step)) { const sel = cur ? cur.split('、').filter(Boolean) : []; const idx = sel.indexOf(value); idx >= 0 ? sel.splice(idx, 1) : sel.push(value); nv = sel.join('、') } else { nv = cur === value ? '' : value }; setCustomTexts(prev => ({ ...prev, [step.id]: '' })); const na = { ...answers, [step.id]: nv }; if (!nv) delete na[step.id]; setAnswers(na); saveProgress(na) }
    const handleSubmit = () => { const fa = { ...answers }; const lines = [loc.questionnaire.myAnswer]; for (const s of normSteps) { const val = fa[s.id] || preSelected[s.id]; if (val) lines.push(`- ${s.question}：${val}`) }; onComplete(lines.join('\n')) }
    if (showReview) return <div style={{ margin: '12px 0', padding: 16, background: token.colorFillAlter, borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}>
        <Text strong style={{ display: 'block', marginBottom: 16, fontSize: 14, color: token.colorText }}>{loc.questionnaire.confirmSelection}</Text>
        {normSteps.map(s => { const val = answers[s.id] || preSelected[s.id] || ''; return <div key={s.id} style={{ marginBottom: 12, padding: '8px 12px', background: token.colorBgContainer, borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}` }}><Text style={{ fontSize: 12, color: token.colorTextTertiary, display: 'block', marginBottom: 2 }}>{s.question}</Text><Text style={{ fontSize: 14, color: token.colorText }}>{val || <Text type="secondary" style={{ fontSize: 13 }}>{loc.questionnaire.notSelected}</Text>}</Text></div> })}
        <Space style={{ width: '100%', marginTop: 8 }}><Button onClick={() => { setCurrentIdx(total - 1); setShowReview(false) }}>{loc.questionnaire.backToEdit}</Button><Button type="primary" disabled={steps.some(s => !answers[s.id] && !preSelected[s.id])} icon={<CheckOutlined />} onClick={handleSubmit}>{loc.questionnaire.submit}</Button></Space>
    </div>
    if (!step) return null
    return <div style={{ margin: '12px 0', padding: 16, background: token.colorFillAlter, borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}>
        <div style={{ marginBottom: 8 }}><Text type="secondary" style={{ fontSize: 12 }}>{currentIdx + 1}/{total}</Text><Progress percent={Math.round(((showReview ? total : currentIdx) / total) * 100)} showInfo={false} strokeColor={token.colorPrimary} size="small" /></div>
        <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 14, color: token.colorText }}>{step.question}</Text>
        <div style={{ marginBottom: 12 }}>
            {step.options && step.options.length > 0 && <Space style={{ marginBottom: 10 }} wrap>{step.options.map(opt => { const isSelected = (answers[step.id!] || '').split('、').includes(opt); return <Button key={opt} size="small" type={isSelected ? 'primary' : 'default'} onClick={() => selectOption(opt)}>{opt}{isSelected && ' ✓'}</Button> })}</Space>}
            <Input.TextArea rows={2} placeholder={step.input ? loc.questionnaire.inputPlaceholder : loc.questionnaire.customAnswerPlaceholder} value={customTexts[step.id] || ''} onChange={e => { setCustomTexts(prev => ({ ...prev, [step!.id]: e.target.value })); const t = e.target.value.trim(); const na = { ...answers }; if (t) na[step!.id] = t; else if (!answers[step!.id]) delete na[step!.id]; setAnswers(na); saveProgress(na) }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 12 }}>
            <Button size="small" icon={<ArrowLeftOutlined />} disabled={currentIdx === 0} onClick={() => setCurrentIdx(currentIdx - 1)} />
            <Button size="small" type="primary" icon={total === 1 ? <CheckOutlined /> : <RightOutlined />} disabled={total === 1 && !(answers[step!.id] || preSelected[step!.id])} onClick={() => { if (total === 1) { handleSubmit(); return } const val = (customTexts[step!.id] || '').trim() || answers[step!.id] || currentDefault; if (!val) return; const na = { ...answers, [step!.id]: val }; setAnswers(na); saveProgress(na); if (currentIdx === total - 1) setShowReview(true); else setCurrentIdx(currentIdx + 1) }}>{total === 1 ? loc.questionnaire.submit : ''}</Button>
        </div>
    </div>
}
