# YunChat - AI Chat 应用

> 目前还有狠毒问题待完善，实测 openai接口 及 gemini 正常使用，后续将完善 MCP 等功能的支持

YunChat 是使用 Rust 和 TypeScript 构建的多方 AI 聊天应用，支持各种 AI 服务提供商
像 OpenAI、Anthropic 和 Google。

![软件截图](/document/img.png)

## 功能

- **多提供商支持**：
    - OpenAI（GPT 模型）
    - Anthropic （Claude 模型）
    - Google（双子座型号）

- **可定制的 AI 参数**：
    -温度
    - 最大令牌数
    - 顶部 p
    - 频率损失
    - 存在惩罚

- **流式响应**：AI 响应的实时流式，以获得更好的用户体验

- **持久聊天历史记录**：保存和加载包含所有配置的聊天会话

## 入门

### 先决条件

- Node.js （v16+）
- Rust （最新稳定版）
- Tauri CLI

### 安装

1. 下周release中的安装包进行安装