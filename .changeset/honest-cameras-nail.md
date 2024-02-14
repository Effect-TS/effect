---
"effect": patch
---

Fix Cause.pretty when toString is invalid

```ts
import { Cause } from "effect";

console.log(Cause.pretty(Cause.fail([{ toString: "" }])));
```

The code above used to throw now it prints:

```bash
Error: [{"toString":""}]
```
