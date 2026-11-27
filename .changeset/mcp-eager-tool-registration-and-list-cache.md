---
"effect": patch
---

Speed up `McpServer` toolkit registration and `tools/list` by avoiding redundant schema validation and descriptor construction, and caching projected wire tool descriptors per protocol revision.
