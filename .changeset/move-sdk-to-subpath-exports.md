---
"@effect/opentelemetry": minor
---

Make @opentelemetry/sdk-trace-node and @opentelemetry/sdk-trace-web required peer dependencies instead of optional. This fixes module resolution errors when importing from the main entry point.
