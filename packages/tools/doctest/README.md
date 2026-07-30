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

Add inline or standalone `// >` comments to assert the complete console output of a snippet:

````ts
/**
 * ```ts import.meta.vitest
 * console.log("Hello") // > Hello
 * console.log({ value: 1 })
 * // > { value: 1 }
 * ```
 */
export const value = 1
````

Each `// >` comment represents one line of expected output. When a snippet contains at least one marker, its markers are joined with newlines and compared with output from the Node.js console methods in call order. This includes methods such as `console.log`, `console.dir`, `console.table`, `console.warn`, and `console.error`. Calls through Effect's `Console` service are also captured when it uses the default console service.

Use an angle-bracketed label such as `// > <system time zone>` to match exactly one output line whose value depends on the environment while keeping the surrounding lines exact. The label documents why that line is not asserted exactly.

````ts
/**
 * ```ts import.meta.vitest
 * console.log("Zone:") // > Zone:
 * console.log(Intl.DateTimeFormat().resolvedOptions().timeZone) // > <system time zone>
 * ```
 */
export const value = 1
````

Avoid asserting output from methods such as `console.trace`, `console.timeLog`, and `console.timeEnd`, whose output can depend on stack traces or timing.

Inline markers are convenient for single-line output. Move a marker to the next line when keeping it inline would make the source line longer than 120 characters. Use standalone markers for multiline output or when grouping the complete expected output improves readability. Ordinary comments without `// >` are ignored. Snippets without markers continue to run without asserting their console output. Prefer deterministic output; reserve angle-bracketed wildcard labels for unavoidable environment-dependent lines rather than using them to hide unstable examples. Await asynchronous work so all output occurs before the snippet module finishes evaluating.

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
