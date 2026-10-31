---
"effect": patch
---

Fix `McpServer` failing `resources/list`, `resources/templates/list` and `prompts/list` with an internal error on the 2026-07-28 protocol when a resource, template or prompt was registered as a plain object through `addResource`, `addResourceTemplate` or `addPrompt`. The listings now encode them by their fields, as the older protocol revisions do.
