---
"effect": patch
---

Fix `McpServer` failing `resources/list` and `resources/templates/list` on `v2026_07_28` with an internal error when a resource or resource template is registered with an optional field set to `undefined`, such as `description: undefined`.
