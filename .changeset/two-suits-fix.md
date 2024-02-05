---
"@effect/platform": minor
---

use Context for collecting tranferables

This changes the platform Transferable module to use Effect context to collect
tranferables when using schemas with workers etc.

You can now use a tranferable data type anywhere in your schema without having
to wrap the outermost schema:

```ts
import { Transferable } from "@effect/platform";
import { Schema } from "@effect/schema";

const structWithTransferable = Schema.struct({
  data: Transferable.Uint8Array,
});
```
