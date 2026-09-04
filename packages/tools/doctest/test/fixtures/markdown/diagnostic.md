# Diagnostic location controls

Only the two marked modules below should execute.

```ts import.meta.vitest name=javascript-diagnostic
import { expect } from "vitest"
const local = 41
expect.assertions(1)
expect(local).toBe(42)
```

```ts import.meta.vitest name=typescript-diagnostic
import { expect } from "vitest"
const local: number = 41
expect.assertions(1)
expect(local).toBe(42)
```
