# 架构说明

## 运行边界

CampusFlow AI 由 Expo Router 客户端与可选 Node AI 代理组成。客户端默认使用 Mock AI，因此没有 API Key 时也可以完整演示人设、聊天、待办、专注和统计。真实模式只把请求发到 `EXPO_PUBLIC_API_BASE_URL` 指向的代理；密钥仅存于 `server/.env`。

## 分层

- `app/`：Expo Router 路由和底部标签页。
- `src/screens/`：聊天、生活、统计、我的和人设管理页面。
- `src/components/`：可复用的原创界面组件与待办编辑器。
- `src/state/`：`AppProvider`，连接 UI、持久化、通知和计时恢复。
- `src/core/`：纯 TypeScript 领域模型、输入校验、任务解析、番茄钟状态机、统计和数据迁移；不依赖 React Native。
- `src/ai/`：统一 `AIProvider` 接口，含流式 Mock provider 和服务端代理 provider。
- `src/services/`：相册、JSON 导出、通知等按需设备权限。
- `server/`：Node HTTP 代理，提供健康检查、NDJSON 流式聊天、任务提取。

## 数据流

`Screen → AppProvider → DataStore → AsyncStorage`

`DataStore` 使用串行写入队列，避免较慢的写入覆盖新状态。持久数据有 `schemaVersion`，载入时通过 `migrateData` 校验；损坏数据不会被自动覆盖。

## 计时恢复

计时器不依赖持续运行的 JavaScript。它持久化开始时间、已累计秒数和暂停状态；恢复时由当前时间减去开始时间得出进度。App 回到前台和状态刷新时都会检查是否完成并保存一条 `FocusSession`。

## AI 代理

客户端向 `/api/chat` 发送人设和最近消息，代理生成安全系统提示并转发给 OpenAI Chat Completions 兼容端点。返回内容为 NDJSON，客户端逐段显示。代理限制请求大小、消息数量、超时和简单速率，并且不记录聊天正文。

`/api/extract-task` 在无密钥时使用保守的本地提取规则；有密钥时要求模型返回经服务端校验的 JSON。日期或时间不明确时必须保留为空。
