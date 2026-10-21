---
"effect": patch
---

Prevent uncaught errors when unread HTTP responses are garbage-collected in runtimes such as Cloudflare Workers that restrict aborting request I/O outside its request context.
