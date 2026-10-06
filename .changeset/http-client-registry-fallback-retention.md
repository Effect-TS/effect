---
"effect": patch
---

Fix `HttpClient` retaining unread responses on runtimes without `FinalizationRegistry`, such as Hermes.
