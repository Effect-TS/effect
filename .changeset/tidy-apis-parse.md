---
"effect": patch
---

Add the `HttpApi.ParseOptions` annotation to configure schema decoding and encoding on HTTP APIs, groups, and endpoints for both servers and clients.

Header codecs validate the complete HTTP header record, so `onExcessProperty: "error"` rejects undeclared headers, including `content-type`. Apply API annotations before passing the API to `HttpApiBuilder.group` or `HttpApiBuilder.endpoint`; annotating only the API passed to `HttpApiBuilder.layer` does not update existing routes.

Forward parse options through `Sse.decodeSchema` and `ChannelSchema.decode`. Normalize SSE events and encoded Cause reasons to their declared wire fields so strict validation applies to user data without rejecting framework metadata.
