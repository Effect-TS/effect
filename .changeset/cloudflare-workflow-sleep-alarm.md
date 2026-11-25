---
"@effect/platform-cloudflare": patch
---

Reconcile the Cloudflare workflow Durable Object alarm after suspension and completion so durable sleeps are not woken early by an expired resume guard.
