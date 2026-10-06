---
"effect": patch
---

Stop `HttpClient` retaining responses whose body is never read on runtimes without `FinalizationRegistry`, such as Hermes.
