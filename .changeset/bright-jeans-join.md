---
"effect": patch
---

Expose version control via ModuleVersion.

This enables low level framework authors to run their own effect version which won't conflict with any other effect versions running on the same process.

Imagine cases where for example a function runtime is built on effect, we don't want lifecycle of the runtime to clash with lifecycle of user-land provided code.

To manually control the module version one can use:

```ts
import * as ModuleVersion from "effect/ModuleVersion";

ModuleVersion.setCurrentVersion(
  `my-effect-runtime-${ModuleVersion.getCurrentVersion()}`
);
```

Note that this code performs side effects and should be executed before any module is imported ideally via an init script.

The resulting order of execution has to be:

```ts
import * as ModuleVersion from "effect/ModuleVersion";

ModuleVersion.setCurrentVersion(
  `my-effect-runtime-${ModuleVersion.getCurrentVersion()}`
);

import { Effect } from "effect";

// rest of code
```
