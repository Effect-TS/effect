---
"@effect/platform": minor
---

remove generics from HttpClient tag service

Instead you can now use `HttpClient.With<E, R>` to specify the error and
requirement types.
