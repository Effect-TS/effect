---
"effect": patch
---

Add per-slot parse options annotations to `HttpApi`: `ParamsParseOptions`, `QueryParseOptions`, `HeadersParseOptions`, `PayloadParseOptions`, `SuccessParseOptions` and `ErrorParseOptions`. Each one replaces `HttpApi.ParseOptions` for its codecs on the server, the client and `urlBuilder`, and falls back to `ParseOptions` when unset. For example, `.annotate(HttpApi.HeadersParseOptions, {})` keeps header codecs on Schema defaults while `ParseOptions` stays strict, so undeclared transport headers such as `content-type` no longer reject requests or `WithHeaders` responses.
