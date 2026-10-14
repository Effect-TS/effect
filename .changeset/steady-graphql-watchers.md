---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
"@effect/graphql-generator": patch
---

Add filesystem watcher installation notifications and wait for all GraphQL watch subscriptions, including nested directories, before generating. This prevents edits during startup from being missed.
