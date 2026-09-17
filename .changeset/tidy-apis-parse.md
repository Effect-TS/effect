---
"effect": patch
---

Add `HttpApi.ParseOptions` to configure server and client codecs at the API, group, or endpoint level.

`Sse.decodeSchema` and `ChannelSchema.decode` accept parse options, and `Schema.Cause` encodes reasons to their wire fields.

SSE decoding omits absent IDs, including with default options. Use `Schema.optional(Schema.String)` instead of `Schema.UndefinedOr(Schema.String)` for IDs. With `onExcessProperty: "error"`, declare `event` (default: `"message"`) and any `id`, including inherited IDs.

`HttpApiSchema.StreamSse` data-mode types and OpenAPI schemas now make `id` optional.
