// 用户消息附件解析/剥离工具（live 与 history 共用同一条渲染路径）。
// - live：sendText 直接构造 attachments 存入树消息；content 仍含"附加文件"文本块与 '🖼 [图片]' 占位（仅无文字时）
// - history：宿主 loadHistory 用 parseAttachedFiles 解析文件块、用占位符正则收集 artifact 名重建附件
// - 气泡显示前用 stripFileRefBlock / stripImagePlaceholders 剥离，避免与结构化附件 UI（缩略图/chip）重复展示

/** 附件文件引用（parseAttachedFiles 返回项） */
export interface ParsedFileRef {
    path: string
    startLine?: number
    endLine?: number
}

/** ADK 图片占位符（历史消息中 artifact 占位文本，ChatArea maskArtifactPlaceholders 会美化成 🖼 [图片]） */
export const ARTIFACT_PLACEHOLDER_RE = /Uploaded file: artifact_\S+\. It has been saved to the artifacts/g

/** 从 artifact 占位符中提取 artifact 名（history 重建图片附件用，capture group 1 = artifact_xxx） */
export const ARTIFACT_NAME_RE = /Uploaded file: (artifact_\S+)\. It has been saved to the artifacts/g

/** 图片占位符显示形态（mask 后 🖼 [图片]）与原始 ADK 占位符 */
export const IMAGE_PLACEHOLDER_RE = /🖼\s*\[图片\]|Uploaded file: artifact_\S+\. It has been saved to the artifacts/g

/** 文件引用行格式：- /path/to/file 或 - /path/to/file:10 或 - /path/to/file:10-20 */
function parseFileRefLine(line: string): ParsedFileRef | null {
    const m = /^-\s+(.+)$/.exec(line)
    if (!m) return null
    const raw = m[1].trim()
    // 行号区间格式 path:start[-end]（冒号后全为数字才按行号解析，避免吞掉 Windows 盘符 C:\...）
    const idx = raw.lastIndexOf(':')
    if (idx > 0 && /^\d+(-\d+)?$/.test(raw.slice(idx + 1))) {
        const path = raw.slice(0, idx)
        const range = raw.slice(idx + 1)
        const dash = range.indexOf('-')
        if (dash >= 0) {
            return { path, startLine: parseInt(range.slice(0, dash), 10), endLine: parseInt(range.slice(dash + 1), 10) }
        }
        return { path, startLine: parseInt(range, 10) }
    }
    return { path: raw }
}

/** 解析"附加文件:"块（label 行 + 连续 "- " 引用行）为文件引用列表 */
export function parseAttachedFiles(content: string, label = '附加文件'): ParsedFileRef[] {
    const lines = (content || '').split('\n')
    const result: ParsedFileRef[] = []
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line === label || line === label + ':') {
            // 收集该行之后的连续 "- " 引用行
            let j = i + 1
            while (j < lines.length && /^-\s+/.test(lines[j])) {
                const ref = parseFileRefLine(lines[j])
                if (ref) result.push(ref)
                j++
            }
            i = j - 1
        }
    }
    return result
}

/** 剥离"附加文件:"块（label 行 + 连续 "- " 引用行），供气泡显示 */
export function stripFileRefBlock(content: string, label = '附加文件'): string {
    const lines = (content || '').split('\n')
    const out: string[] = []
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line === label || line === label + ':') {
            let j = i + 1
            while (j < lines.length && /^-\s+/.test(lines[j])) j++
            i = j - 1
            continue
        }
        out.push(lines[i])
    }
    return out.join('\n')
}

/** 统计图片占位符数量 */
export function countImagePlaceholders(content: string): number {
    const m = (content || '').match(IMAGE_PLACEHOLDER_RE)
    return m ? m.length : 0
}

/**
 * 剥离图片占位符（最多剥离 maxStrip 个；缺省全剥）。
 * maxStrip = 实际图片附件数时：artifact 缺失（附件未建成）的占位符保留文字兜底。
 */
export function stripImagePlaceholders(content: string, maxStrip: number = Infinity): string {
    let remaining = maxStrip
    return (content || '').replace(IMAGE_PLACEHOLDER_RE, (match) => {
        if (remaining <= 0) return match
        remaining--
        return ''
    })
}
