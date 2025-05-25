---
"@effect/rpc": patch
---

Pass through `FromClientEncoded` request.headers to `client.post` in `makeProtocolHttp`'s `send` function.
