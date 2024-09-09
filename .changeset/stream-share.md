---
"effect": minor
---

add `Stream.share` api

The `Stream.share` api is a ref counted variant of the broadcast apis.

It allows you to share a stream between multiple consumers, and will close the
upstream when the last consumer ends.
