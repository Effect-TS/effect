---
"effect": patch
---

Add `Html` to `effect/http`. `Html.make` is a template tag that escapes interpolated strings, which makes them safe in element text and in quoted values of ordinary attributes. It does not make URL, event handler, `style` or `srcdoc` attributes, or `script` and `style` elements, safe. `Html.rawUnsafe` marks trusted markup, and `HttpServerResponse.html` now accepts an `Html` value. The `HttpServerResponse.html` template tag still does not escape.
