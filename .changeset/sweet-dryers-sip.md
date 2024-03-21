---
"@effect/printer": minor
---

Removes the `Render` module and consolidates `Doc` rendering methods

This PR removes the `Render` module and consolidates all document rendering methods into a single method.

Before:

```ts
import * as Doc from "@effect/printer/Doc"
import * as Render from "@effect/printer/Render"

const doc = Doc.cat(Doc.text("Hello, "), Doc.text("World!"))

console.log(Render.prettyDefault(doc))
```

After:

```ts
import * as Doc from "@effect/printer/Doc"

const doc = Doc.cat(Doc.text("Hello, "), Doc.text("World!"))

console.log(Doc.render(doc, { style: "pretty" }))
```
