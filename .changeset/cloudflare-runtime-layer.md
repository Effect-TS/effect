---
"@effect/platform-cloudflare": patch
---

Add `CloudflareRuntime.layer` to opt in to Cloudflare scheduling and tracing wherever the Worker supports them.

`CloudflareDurableObjects.setInitializer` now requires its callback to return the context the objects should run with. Return `runtime.context()` for a managed application, or `Context.empty()` to keep the default services.
