---
"effect": patch
---

Keep long-lived fibers running across requests on Cloudflare Workers. The default scheduler dispatches queued tasks in a microtask there, since timers set by a request that has responded never fire. A fiber whose `AsyncLocalStorage` context belongs to an earlier request now resumes in the current context instead of throwing.
