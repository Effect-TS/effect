---
"effect": patch
---

Add the `HttpApi.ParseOptions` annotation. Annotate an API, group, or endpoint with `SchemaAST.ParseOptions` to configure every server and client codec, including headers, multipart payloads, and SSE streams.

`Sse.decodeSchema` and `ChannelSchema.decode` accept parse options, `Sse.transformEvent` omits an absent `id`, and `Schema.Cause` encodes reasons to their wire fields, so `onExcessProperty: "error"` rejects only user data.
