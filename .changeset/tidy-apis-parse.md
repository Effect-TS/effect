---
"effect": patch
---

Add the `HttpApi.ParseOptions` annotation. Annotate an API, group, or endpoint with `SchemaAST.ParseOptions` to configure every server and client codec, including headers, multipart payloads, and SSE streams.

`Sse.decodeSchema` and `ChannelSchema.decode` accept parse options, and `Schema.Cause` encodes reasons to their wire fields.

SSE decoding now omits an absent `id`, even with default parse options. In events-mode schemas, replace `id: Schema.UndefinedOr(Schema.String)` with `id: Schema.optional(Schema.String)` to accept events without an ID. With `onExcessProperty: "error"`, schemas validate the normalized event shape: they must declare `event` (which defaults to `"message"`) and `id` whenever the stream carries IDs, including IDs inherited from earlier events.

`HttpApiSchema.StreamSse` data-mode event types and OpenAPI schemas now mark `id` as optional; generated clients may therefore expose `id?: string` instead of `id: string`.
