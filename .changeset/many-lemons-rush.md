---
"effect": patch
---

Duration: fix `format` output when the input is zero.

Before

```ts
import { Duration } from "effect"

console.log(Duration.format(Duration.zero))
// Output: ""
```

After

```ts
import { Duration } from "effect"

console.log(Duration.format(Duration.zero))
// Output: "0"
```
