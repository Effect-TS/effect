# Typed Markdown examples

This prose is not JavaScript and must never execute.
throw new Error("R11_MARKDOWN_PROSE_EXECUTED")

```ts import.meta.vitest name=static-first
import { expect } from "vitest"
import { answer } from "./helper.ts"
const local = answer
expect.assertions(2)
expect(local).toBe(42)
expect(import.meta.url).toContain("/docs/javascript.md")
```

```ts import.meta.vitest name=dynamic-second
import { expect } from "vitest"
const { answer } = await import("./helper.ts")
const local = answer + 1
expect.assertions(2)
expect(local).toBe(43)
expect(import.meta.url).toContain("/docs/javascript.md")
```
