---
"effect": patch
---

Add a `mapError` option to `HttpApiClient.make`, `makeWith`, `group` and `endpoint`. It replaces the typed errors of every client method, and of the streams they return, with one error type. The mapper receives the group and endpoint identifiers, and `transformResponse` now receives them as a second argument too.
