---
"effect": patch
---

Allow spans without an Effect parent to inherit the active OpenTelemetry parent by default. Explicit `root: true` continues to start a new trace.
