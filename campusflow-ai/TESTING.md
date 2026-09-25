# 测试与验证

## 自动化命令

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm check
```

当前自动化覆盖：

- 人设名称校验与安全 system prompt。
- 待办创建、编辑、完成和本地任务提取。
- 番茄钟暂停、继续、完成与后台时间戳恢复。
- 真实专注/完成任务统计与分类聚合。
- AsyncStorage 适配器的写入与重新读取。
- Mock AI 的流式回复与任务提取。
- NDJSON 分块解析。
- Node 代理的 `/api/health`、无密钥任务提取和无密钥聊天失败路径。

## 手工验证清单

在 Android Expo Go 或 development build 中验证：

1. 创建、编辑、切换和删除 AI 人设；确认角色之间聊天独立。
2. Mock 聊天发送、停止、复制、删除、重试和转待办。
3. 待办新增、编辑、搜索、筛选、完成和删除。
4. 计时开始、暂停、恢复、提前结束、页面切换及后台后恢复。
5. 用户主动加载示例数据后，统计趋势、热力图和分类更新。
6. 允许/拒绝相册与通知权限，确认 App 显示可理解的反馈。
7. 无网络、错误的代理地址和未配置 API Key 时，确认 App 显示重试路径。

## 当前运行验证

自动测试、类型检查与 ESLint 由本项目脚本执行。网页与真机预览结果会在本次交付记录中说明；通知功能需要 Android development build 验证，Expo Go 对通知能力有限。

## 本次验证结果

已执行并通过：

```text
pnpm typecheck                         通过
pnpm lint                              通过，0 errors / 0 warnings
pnpm test                              3 个测试文件、13 个测试通过
pnpm exec expo export --platform web   通过
pnpm exec expo export --platform android 通过
GET /api/health                        200，Mock-required 状态正确
POST /api/extract-task                 200，正确提取“明天下午三点复习高数一小时”
```

本机未安装 Android SDK、Java 或 adb，因此未执行 Android 模拟器/真机启动。网页预览服务器已通过 Metro 编译和本机 HTTP 响应验证；原生通知、相册和后台行为仍需在 Android development build 或真机上按上面的手工清单完成。

## 浏览器交互验收

另在 390 × 844 手机尺寸的本机浏览器中验证：初始聊天页成功渲染、无页面运行时错误；Mock 模式输入“明天下午三点复习高数一小时”后，等待流式回复、点击用户消息的“转为待办”、保存、进入“生活”页，任务“复习高数”可见。该流程验证了聊天到待办的真实 UI 路径。
