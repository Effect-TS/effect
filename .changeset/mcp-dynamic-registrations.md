---
"effect": minor
---

Add `McpServer` registration removal and upfront feature declarations so clients can observe tools, resources and prompts that change at runtime.

Hand-written `McpServer` service implementations and mocks must implement `removeTool`, `removeResource`, `removeResourceTemplate` and `removePrompt`, each returning `Effect<boolean>`; standard server layers need no changes.
