# `@effect/doctest`

`@effect/doctest` extracts marked TypeScript examples from JSDoc comments and Markdown files, then runs each example as an isolated Vitest module.

Mark runnable fences with `import.meta.vitest`:

````ts
/**
 * ```ts import.meta.vitest name="adds two numbers"
 * import { strictEqual } from "node:assert"
 * strictEqual(1 + 1, 2)
 * ```
 */
export const value = 1
````

The optional `name="..."` metadata labels the test without appearing in the example body. Unnamed examples use the opening fence line, such as `line 12`; Vitest displays the containing file alongside it.

Regular tests can use `include` in the same project. Documentation sources use `includeSource`, which lets Vitest discard files without the marker before collection. The plugin resolves imports relative to each example's original TypeScript or Markdown file:

```ts
import * as Doctest from "@effect/doctest/Plugin"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [Doctest.plugin()],
  test: {
    include: ["test/**/*.test.ts"],
    includeSource: ["src/**/*.ts", "docs/**/*.md"]
  }
})
```

Source files selected by `includeSource` are collected through generated doctest collectors and are not executed. Native in-source tests using `import.meta.vitest` are therefore not supported by this plugin. Regular test files included through `test.include` continue to run normally.
