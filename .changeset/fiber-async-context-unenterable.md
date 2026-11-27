---
"effect": patch
---

Resume a fiber without its captured async context when the runtime refuses to enter it, as Cloudflare Workers does for a context captured during a request that has since finished. Previously the fiber's resumption threw "Cannot call this AsyncLocalStorage bound function outside of the request in which it was created", breaking long-lived fibers such as `OtlpExporter`'s.
