---
"effect": patch
---

Add the experimental `McpClient` and `McpClientError` modules, a scoped MCP client for the `2025-11-25` and `2026-07-28` protocols over stdio or Streamable HTTP. It discovers tools, prompts and resources, calls tools with optional schema decoding, and exposes discovered tools to a language model through `McpClient.toolkit`.
