---
"effect": patch
---

Fix `Formatter.formatJson` to include the message when stringifying plain `Error` values, matching the output of `Logger.formatStructured`.

```ts
import { Formatter } from "effect"

Formatter.formatJson(new Error("boom")) // now `"Error: boom"`, previously `{}`
```
