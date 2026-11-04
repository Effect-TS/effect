---
"effect": patch
"@effect/platform-browser": patch
---

`HttpClient.withScope` now owns every request sent while the scoped client executes, instead of tracking the request value. Redirect hops and requests rewritten by middleware stay attached to the scope whichever order `withScope` and `followRedirects` are applied in, and concurrent executions of one request or response effect keep separate owners. Interrupting a scoped request before its response arrives now aborts it. The browser `XMLHttpRequest` client now fails with a `TransportError` instead of sending a request whose signal is already aborted, such as one dispatched after its `withScope` scope has closed.
