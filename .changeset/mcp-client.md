---
"effect": patch
---

Add the experimental `McpClient` and `McpClientError` modules, a scoped MCP client for the `2025-11-25` and `2026-07-28` protocols over stdio or Streamable HTTP. It discovers tools, prompts and resources, calls tools with optional schema decoding, and exposes discovered tools to a language model through `McpClient.toolkit`.

MCP schemas now check `_meta`, `structuredContent`, capability records and other JSON-valued fields only one level deep when decoding, and type them as `unknown` or `Readonly<Record<string, unknown>>`. `McpServer` still rejects non-JSON tool results when it serializes 2026-07-28 responses. That guarantee is not extended to earlier protocol revisions; the 2025-11-25 path did not reject them before this change either.
