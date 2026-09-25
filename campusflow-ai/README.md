# CampusFlow AI

面向大学生的 AI 生活与学习执行助手：**自定义 AI 人设 → 聊天 → 可编辑待办 → 专注执行 → 真实统计**。

项目用 React Native / Expo 开发，默认简体中文，采用原创的柔和卡片界面。目标是让学习和生活计划从对话走向行动；也适合作为产品与移动端工程作品集。无需账号或 API Key 即可进入 Mock 演示。

版权所有：© 2026 Celia · 保留所有权利。

> 实际验证结果见 [TESTING.md](./TESTING.md)。编译和浏览器预览不能替代安卓真机验收；仓库不包含已签名 APK，不声称已完成真实供应商调用验证。

## 核心功能

- 人设创建、编辑、切换、删除、示例角色、JSON 导入导出；可直接粘贴 Word、TXT、备忘录或 AI 模拟器人设文档，全文不限字数保存，缺项弹窗补齐，并可授权互动自动补全。
- 每个人设独立聊天；逐步显示回复；消息操作、重发和重新生成；Mock / 真实 API 模式。
- 从聊天提取任务，在保存前修改标题、分类、日期、时间和预计时长；不确定的时间保持空值。
- 待办增删改查、完成/恢复、筛选搜索、按需申请本地提醒；可选择人设，以该角色名义在设定时间显示本地消息提醒和测试消息。
- 默认 25 分钟专注、5 分钟休息、自定义时间、秒表、暂停/继续/提前结束和状态恢复。
- 基于本地真实记录的趋势、热力图、分类占比和两周比较；示例数据需要主动加载。
- 纯色、渐变和自选图片背景；数据导出、全部删除与隐私说明。

## 技术栈与结构

Expo SDK 55（`~55.0.31`）、React Native、React、Expo Router、TypeScript strict、AsyncStorage、Expo Notifications、Expo Image Picker、开源图标、Node.js HTTP 代理、兼容 OpenAI 的接口、Vitest 和 ESLint。精确依赖以 `package.json` 与 `pnpm-lock.yaml` 为准。

```text
campusflow-ai/
├─ app/                 Expo Router 页面与导航
├─ assets/              本地视觉资源
├─ src/
│  ├─ components/       可复用界面
│  ├─ core/             类型、校验、存储、计时和统计
│  ├─ ai/               Mock 与代理 AI Provider
│  └─ services/         系统能力（通知、图片、导出）
├─ server/              AI 代理与独立环境变量
├─ tests/               自动化测试
├─ docs/                手工验收清单
├─ .env.example         公开的客户端代理地址
└─ eas.json             preview APK / production AAB
```

## Windows 安装与启动

安装 [Node.js 24 LTS](https://nodejs.org/en/download) 和 [pnpm 11](https://pnpm.io/installation)。已有可用 npm 时可用 
pm install --global pnpm@11` 安装 pnpm。然后在 PowerShell 执行：

```powershell
Set-Location 'C:\Users\Administrator\Documents\Codex\2026-09-18\files-pasted-by-the-user-ui\outputs\campusflow-ai'
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm start
```

`pnpm start` 启动 Expo Metro 并显示二维码；浏览器预览运行 `pnpm web`。首次安装需要网络，安装完成后的 Mock 不需要 AI 服务端。若 PowerShell 阻止 `pnpm.ps1`，用 `pnpm.cmd` 执行相同命令。本次开发宿主的 npm 不可用，开发使用已安装的 pnpm；全新 Windows 安装与设备扫码需按测试清单补验。

## 安卓手机预览

1. 在安卓手机安装 [兼容 SDK 55 的 Expo Go](https://expo.dev/go?device=true&platform=android&sdkVersion=55)，不要仅根据应用商店版本判断兼容性。[官方环境说明](https://docs.expo.dev/get-started/set-up-your-environment/)
2. 电脑、手机接入可互访的同一 Wi-Fi，在项目目录运行 `pnpm exec expo start --lan`。
3. 用 Expo Go 扫码，默认进入 Mock 模式。若超时，检查校园网设备隔离及 Windows 防火墙对 Node.js 专用网络的授权，Metro 常用端口为 8081。
4. 真实 AI 还需要手机访问你部署的 HTTPS 代理。手机上的 `localhost` 是手机自身；默认本地代理仅供电脑开发预览使用。

模拟器需先完成 [Android Studio 配置](https://docs.expo.dev/workflow/android-studio-emulator/)，启动虚拟设备后运行 `pnpm android`。本次环境没有 Java、adb 或 Android SDK，未完成安卓模拟器或真机验收。

## Mock 使用路径

无需环境变量和密钥。在“我的”管理人设，切换后发送“明天下午三点复习高数一小时”。对原消息选择“转为待办”，确认明日、15:00、60 分钟、学习分类后保存。到“生活”查看任务，关联专注并开始、暂停、继续、提前结束；统计会读取实际保存的记录。

首次使用的用户统计为空；主动选择“加载示例数据”才产生带标识的演示记录。Mock 是本地规则演示器，不具备通用大模型推理能力，复杂时间表达需要手动确认。

## 配置真实 API

客户端只配置代理 URL，**AI API Key 只放服务端**。

```powershell
Copy-Item -LiteralPath '.env.example' -Destination '.env'
Copy-Item -LiteralPath 'server\.env.example' -Destination 'server\.env'
```

编辑 `server/.env`，不要提交 Git：

```dotenv
PORT=8787
OPENAI_API_KEY=填写你自己的服务端密钥
OPENAI_BASE_URL=https://api.openai.com
OPENAI_MODEL=gpt-4o-mini
```

模型名仅为示例，使用供应商和账号支持的模型。兼容接口应支持 Chat Completions 流式响应和任务 JSON 输出。根目录 `.env` 写你部署的 HTTPS 代理地址：

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://your-proxy.example.com
```

电脑浏览器可用 `http://localhost:8787`。Android 模拟器、真机与共享 APK 使用部署后的 HTTPS URL；不要把服务器密钥暴露给局域网中不受信任的设备。

在两个位于项目根目录的 PowerShell 终端分别执行：

```powershell
# 终端一：保持代理运行
pnpm server
```

```powershell
# 终端二：启动并扫码
pnpm exec expo start --lan --clear
```

`Invoke-RestMethod 'http://localhost:8787/api/health'` 可检查代理；`providerConfigured: true` 只表示存在配置，不代表供应商认证和额度验证通过。在“我的”切换真实 AI 模式并阅读数据发送说明，然后发送消息。修改公开变量后完整重新加载 App；独立 APK 需要重新构建。

[Expo 公开变量](https://docs.expo.dev/guides/environment-variables/)会进入客户端，不得把密钥放到任何 `EXPO_PUBLIC_` 变量、`app.json`、人设或聊天中。没有密钥时真实接口报配置错误，可切回 Mock。

## 数据与隐私

人设、聊天、任务、专注与设置默认保存在本机 AsyncStorage，未实现数据库级加密。Mock 不向 AI 服务商发送内容；真实聊天通过代理发送当前角色文本设定、手动记忆与会话上下文，任务提取发送所选文字及当前日期参考。

权限仅用于主动选择图片和开启提醒。不读取通讯录、定位或健康数据。人设消息提醒是设备本地定时通知，不会在后台实时调用 AI。JSON 导出包含明文文字与图片引用；本地图片引用不保证可跨设备使用。删除本地数据无法撤回供应商或外部导出副本。详见 [PRIVACY.md](./PRIVACY.md)。

## 测试命令

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm check
pnpm exec expo export --platform android
pnpm export:web
```

Android export 只验证 JavaScript 与资源可打包，**不生成 APK，也不代表安卓原生运行通过**。测试范围和实际结果见 [TESTING.md](./TESTING.md)。

## 安卓 APK 构建

`eas.json` 的 `preview` 配置生成 APK。Windows 可发起 EAS 云构建，需要开发者自己的 Expo 账号、网络和可用构建额度，不要求本地 Android 编译环境。[官方 APK 流程](https://docs.expo.dev/build-reference/apk/)

```powershell
pnpm dlx eas-cli@latest login
pnpm dlx eas-cli@latest build:configure
pnpm dlx eas-cli@latest build --platform android --profile preview
```

首次按 CLI 提示关联自己的 Expo 项目和 Android 签名凭据，保留 `preview.android.buildType: "apk"`。构建完成从 EAS 详情页下载 APK，允许相应来源安装后打开；独立 APK 无需 Metro。

Mock 无需服务器。真实 API 的共享 APK 应在 EAS 的 `preview` 环境设置公开变量 `EXPO_PUBLIC_API_BASE_URL` 为部署后的 HTTPS 代理地址，密钥仍只在代理服务器。根目录 `.env` 被 Git 忽略，不应依赖本机文件自动上传云构建。[EAS 环境变量](https://docs.expo.dev/eas/environment-variables/usage/)

`production` 输出商店用途的 AAB。当前未执行 EAS 签名云构建，不提供虚构的 APK 下载地址。

## 已知限制与 V2

V1 代理面向个人开发，无账户鉴权与多租户隔离；公开部署需 HTTPS、认证、配额和运行监控。通知受系统权限、省电策略影响。计时使用墙钟恢复，手动调整系统时间会影响结果。Web 不能验证原生通知、分享、相册和后台表现。JSON 备份尚不等于完整跨设备恢复。

图片/语音聊天、多模型、Apple 提醒事项、Health Connect、HealthKit、睡眠/步数/活动数据、个人动态/书架/唱片架/相册、好友点赞、角色主题市集、云同步、多设备登录、中英文切换与深色模式均为后续规划，详见 [ROADMAP.md](./ROADMAP.md)。

更多文档：[需求](./PRD.md) · [架构](./ARCHITECTURE.md) · [隐私](./PRIVACY.md) · [测试](./TESTING.md)。





