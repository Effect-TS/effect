---
"effect": patch
---

Enforce `MaxBodySize` on buffered body reads (`arrayBuffer`, `text`, `json`, `urlParamsBody`) of web `HttpServerRequest`s, as used by Bun, Deno and `toWebHandler`. Bodies over the limit fail with a `BodyTooLarge` `RequestParseError`, which responds with 413.
