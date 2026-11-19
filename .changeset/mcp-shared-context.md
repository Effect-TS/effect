---
"effect": patch
---

Fix `McpServer` toolkit registration copying and scanning its registration context once per tool, which made memory use and registration time grow with the square of the tool count.
