---
"effect": patch
---

Restrict `McpServer` request span target suffixes and attributes to registered tools, prompts, and static resources so unresolved or template-matched caller input is not recorded in telemetry.
