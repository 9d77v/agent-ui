# agent-ui

通用 AI Agent 对话界面 UI 框架。提供消息列表、聊天输入、工具调用可视化、审批流程等开箱即用的 React 组件。

## 安装

```bash
npm install agent-ui
# 或
pnpm add agent-ui
```

依赖（peer）：`react ^18`, `antd ^6`, `@ant-design/icons ^6`, `react-markdown ^9`, `remark-gfm ^4`

## 快速开始

```tsx
import { FrameworkAgentPanel, zhLocale } from "agent-ui";

function App() {
  return (
    <FrameworkAgentPanel
      collapsed={false}
      onToggle={() => {}}
      locale={zhLocale} // 中文界面，默认英文
      getWebSocketURL={async () => "ws://localhost:8080/ws"}
      sessionID={sessionID}
      setSessionID={setSessionID}
      modelOptions={modelOptions}
      currentModel={currentModel}
      onModelChange={setCurrentModel}
    />
  );
}
```

## 核心组件

### FrameworkAgentPanel

主面板组件，包含消息列表、输入框、审批状态栏等所有子组件。

| Prop               | 类型                           | 说明                                     |
| ------------------ | ------------------------------ | ---------------------------------------- |
| `locale`           | `Partial<AgentUILocale>`       | 国际化文本，内置 `zhLocale`              |
| `toolNameLabels`   | `Record<string, string>`       | 工具显示名（如 `read_file: '读取文件'`） |
| `toolDisplayNames` | `Record<string, string>`       | 工具在时间线/卡片中的显示名              |
| `formatModelLabel` | `(v: string) => string`        | 模型标签格式化函数                       |
| `toolConfig`       | `{ tree, enabled?, onChange }` | 工具配置弹窗数据                         |
| `filePicker`       | `{ onSearch, onSelect }`       | 文件选择弹窗数据                         |
| `getWebSocketURL`  | `() => Promise<string>`        | WebSocket 连接地址                       |
| `modelOptions`     | `ModelOption[]`                | 模型选择列表                             |

### 子组件

| 组件                | 说明                                          |
| ------------------- | --------------------------------------------- |
| `MessageList`       | 消息列表（虚拟滚动）                          |
| `MessageBubble`     | 消息气泡（Markdown 渲染、思考过程、工具调用） |
| `ChatInput`         | 聊天输入框（多行、文件附加、模型切换）        |
| `ToolCallCard`      | 工具调用卡片                                  |
| `ToolTimeline`      | 工具调用时间线                                |
| `SessionHistory`    | 会话历史列表                                  |
| `CommandApproval`   | 命令审批组件                                  |
| `ApprovalStatusBar` | 审批模式状态栏                                |
| `QuestionnaireForm` | 问卷表单                                      |
| `ErrorBoundary`     | 错误边界                                      |

### Modal 组件

| 组件              | 说明                                                       |
| ----------------- | ---------------------------------------------------------- |
| `AgentModal`      | 通用 Modal 容器（支持 titleIcon、darkMode、height 滚动）   |
| `ToolConfigModal` | 工具配置弹窗（基于 `AgentModal`，勾选即存）                |
| `FilePickerModal` | 文件搜索弹窗（基于 `AgentModal`，`onSearch` 由应用层注入） |

## 国际化

### 使用内置中文

```tsx
import { zhLocale } from 'agent-ui'

<FrameworkAgentPanel locale={zhLocale} ... />
```

### 自定义英文

```tsx
import { defaultLocale } from 'agent-ui'

<FrameworkAgentPanel locale={defaultLocale} ... />
```

### 自定义部分文本

```tsx
<FrameworkAgentPanel locale={{
    panel: { title: 'My Assistant', history: 'Chat History', newSession: 'New Chat' },
    chatInput: { placeholder: 'Type something...', sendTooltip: 'Send', stopTooltip: 'Stop' },
}} ... />
```

### 完整接口

`AgentUILocale` 按组件分组：

```tsx
interface AgentUILocale {
  panel: PanelLocale; // 面板标题
  chatInput: ChatInputLocale; // 输入框
  message: MessageLocale; // 消息气泡
  tool: ToolLocale; // 工具卡片/时间线
  approval: ApprovalLocale; // 审批
  session: SessionLocale; // 会话历史
  questionnaire: QuestionnaireLocale; // 问卷
  error: ErrorLocale; // 错误边界
}
```

## 结构化 Props

### 工具配置

```tsx
<FrameworkAgentPanel
  toolConfig={{
    tree: toolTree, // ToolTreeNode[]
    enabled: toolEnabled, // Record<string, boolean>
    onChange: async (keys) => {
      // 勾选变化时回调
      await saveToolConfig(keys);
    },
  }}
/>
```

### 文件选择

```tsx
<FrameworkAgentPanel
  filePicker={{
    onSearch: async (query) => {
      const result = await searchFiles(query);
      return result.files;
    },
    onSelect: (filePath) => {
      addSelectedFile(filePath);
    },
  }}
/>
```

## Context

组件通过 `AgentUIContext` 共享 locale 和配置：

```tsx
import { AgentUIContext, useAgentLocale } from "agent-ui";

function CustomComponent() {
  const ctx = useAgentLocale();
  return <div>{ctx.panel.title}</div>;
}
```

## Hooks

| Hook                | 说明                                        |
| ------------------- | ------------------------------------------- |
| `useMessageTree`    | 消息树管理（增删改、顺序维护）              |
| `useAgentWebSocket` | WebSocket 通信（消息收发、审批、文件 diff） |
| `useModelLoader`    | 模型列表加载/切换                           |

## 开发

```bash
pnpm install
npx tsc --noEmit    # 类型检查
```

## 项目结构

```
agent-ui/src/
├── locale/          # 国际化
│   ├── types.ts     # 接口定义
│   ├── en.ts        # 英文默认值
│   ├── zh.ts        # 内置中文
│   └── index.ts     # Context + 导出
├── modal/           # Modal 组件
│   ├── AgentModal.tsx
│   ├── ToolConfigModal.tsx
│   ├── FilePickerModal.tsx
│   └── types.ts
├── hooks/           # React Hooks
│   ├── useMessageTree.ts
│   ├── useAgentWebSocket.ts
│   └── useModelLoader.ts
├── AgentPanel.tsx        # 主面板
├── ChatInput.tsx         # 输入框
├── MessageBubble.tsx     # 消息气泡
├── MessageList.tsx       # 消息列表
├── ToolCallCard.tsx      # 工具调用卡片
├── ToolTimeline.tsx      # 工具调用时间线
├── SessionHistory.tsx    # 会话历史
├── CommandApproval.tsx   # 命令审批
├── ApprovalStatusBar.tsx # 审批状态栏
├── QuestionnaireForm.tsx # 问卷表单
├── ErrorBoundary.tsx     # 错误边界
├── TokenProgress.tsx     # Token 进度条
├── index.ts              # 统一导出
└── index.d.ts            # 类型声明
```
