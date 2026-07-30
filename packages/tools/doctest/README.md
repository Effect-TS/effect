# `@effect/doctest`

`@effect/doctest` extracts marked TypeScript examples from JSDoc comments and Markdown files, then runs each example as an isolated Vitest module.

Mark runnable fences with `import.meta.vitest`:

````ts
/**
 * ```ts import.meta.vitest name="adds two numbers"
 * console.log(1 + 1)
 * // > 2
 * ```
 */
export const value = 1
````

The optional `name="..."` metadata labels the test without appearing in the example body. Unnamed examples use the opening fence line, such as `line 12`; Vitest displays the containing file alongside it.

## Expected console output

Add standalone `// >` comments to assert the complete console output of a snippet:

````ts
/**
 * ```ts import.meta.vitest
 * console.log("Hello")
 * console.log({ value: 1 })
 * // > Hello
 * // > { value: 1 }
 * ```
 */
export const value = 1
````

Each `// >` comment represents one line of expected output. When a snippet contains at least one marker, its markers are joined with newlines and compared with output from the Node.js console methods in call order. This includes methods such as `console.log`, `console.dir`, `console.table`, `console.warn`, and `console.error`. Calls through Effect's `Console` service are also captured when it uses the default console service.

Avoid asserting output from methods such as `console.trace`, `console.timeLog`, and `console.timeEnd`, whose output can depend on stack traces or timing.

Markers must occupy their own lines so ordinary explanatory and inline comments are ignored. Snippets without markers continue to run without asserting their console output. Await asynchronous work so all output occurs before the snippet module finishes evaluating.

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

The plugin configures `@effect/doctest/Runner` when no test runner is specified. If `test.runner` is already configured, the plugin leaves it unchanged; that runner is then responsible for integrating doctest collection when required.
