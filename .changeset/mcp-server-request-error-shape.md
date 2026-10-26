---
"effect": patch
---

Fix `McpServer` method-not-found, invalid-params and invalid-request errors including an internal `_tag` field. Strict MCP clients such as `McpClient` rejected these responses and the stdio transport stopped serving later requests.
