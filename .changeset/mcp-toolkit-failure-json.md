---
"effect": patch
---

Encode declared `McpServer` tool failures with their JSON codec, so values such as `bigint`, `Map` and `Option` no longer cause an internal error or lossy output
