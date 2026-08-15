/** 工具树节点 */
export interface ToolTreeNode {
    key: string
    label: string
    /** 工具描述（后端从工具定义 enrich，可选） */
    description?: string
    children?: ToolTreeNode[]
}
