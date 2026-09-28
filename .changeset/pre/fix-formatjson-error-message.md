---
"effect": patch
---

Fix `Formatter.formatJson` to include `name` and `message` and preserve enumerable properties when stringifying `Error` instances without `toJSON`.

```ts
import { Formatter } from "effect"

Formatter.formatJson(new Error("boom")) // now `{"name":"Error","message":"boom"}`, previously `{}`
```
