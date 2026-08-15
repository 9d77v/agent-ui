# agent-ui

通用 AI Agent 对话界面 UI 组件库。提供消息列表、聊天输入、工具调用可视化等 React 组件。

## 核心组件

### FrameworkAgentPanel

主面板组件。

| Prop               | 说明                                     |
| ------------------ | ---------------------------------------- |
| `locale`           | 国际化文本                               |
| `toolNameLabels`   | 工具显示名映射                           |
| `toolDisplayNames` | 工具显示名映射（时间线/卡片）            |
| `toolConfig`       | 工具展示数据（静态工具树，只读）       |
| `filePicker`       | 文件选择数据                             |
| `getWebSocketURL`  | WebSocket 连接地址                       |

### 子组件

`MessageList`、`MessageBubble`、`ChatInput`、`ToolTimeline`、`SessionHistory`、`CommandApproval`、`ApprovalStatusBar`、`ErrorBoundary`。
