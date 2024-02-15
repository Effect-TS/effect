---
"effect": patch
---

add Runtime.updateFiberRefs/setFiberRef/deleteFiberRef

This change allows you to update fiber ref values inside a Runtime object.

Example:

```ts
import { Effect, FiberRef, Runtime } from "effect";

const ref = FiberRef.unsafeMake(0);

const updatedRuntime = Runtime.defaultRuntime.pipe(Runtime.setFiberRef(ref, 1));

// returns 1
const result = Runtime.runSync(updatedRuntime)(FiberRef.get(ref));
```
