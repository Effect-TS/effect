# `@effect/doctest`

`@effect/doctest` extracts TypeScript examples from JSDoc comments and runs each example as an isolated Vitest module.

Configure one Vitest project per package so each project retains its package root. The plugin resolves imports relative to each example's original source file. Use `vitestPlugin` to provide extracted examples and resolve the custom runner through the package export:

```ts
import * as Examples from "@effect/doctest/Examples"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [Examples.vitestPlugin()],
  test: {
    include: ["src/**/*.ts"]
  }
})
```
