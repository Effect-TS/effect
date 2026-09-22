---
"effect": patch
---

Add `String.stripMarginRaw`, a margin-aware counterpart to the global `String.raw`

It joins a tagged template using the raw template text, strips the `|` margin from every line that starts inside the template, and drops the whitespace-only lines around the content that come from the opening and closing backticks. Substituted values are inserted verbatim, so a `|` inside a value is never treated as a margin. Passing a plain string returns it unchanged, which makes it easy to build APIs that accept either a string or a tagged template.

```ts
import { String } from "effect"

const name = "world"

String.stripMarginRaw`
  | Hello, ${name}!
  |   Indented line
  |
  | Done.
` // => "Hello, world!\n  Indented line\n\nDone."
```
