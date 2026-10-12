---
"effect": patch
---

Add `effect/http` `Html` for pages: `Html.make` is a template tag that escapes every interpolated value, in text and in quoted attribute values, and awaits effect and `Option` interpolations like `Template.make`. `Html.rawUnsafe` marks trusted markup, and `HttpServerResponse.html` accepts an `Html` value. `HttpServerResponse.html` as a tag still does not escape.
