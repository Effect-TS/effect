# Example Suggestions: `@effect/docgen/Printer`

- **Package:** `@effect/docgen`
- **Source:** `packages/tools/docgen/src/Printer.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 2 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                       | Line | Kind               | Priority        |
| ----------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/docgen/Printer.printModule`      |  320 | `root-declaration` | **recommended** |
| `@effect/docgen/Printer.prettify`         |  378 | `root-declaration` | **recommended** |
| `@effect/docgen/Printer.printFrontMatter` |  364 | `root-declaration` | **optional**    |

## Recommended

### `@effect/docgen/Printer.printModule`

- **Source:** `packages/tools/docgen/src/Printer.ts:320`
- **Kind / category:** `root-declaration` / `printers`
- **Priority:** **recommended**
- **Current description:** Renders a parsed module as a Markdown documentation page.
- **Signature hint:** `declare function printModule(module: Domain.Module): Effect.Effect<string, never, Configuration.Configuration>`
- **Import guidance:** Start from `import { Printer } from "@effect/docgen"` and use `Printer.printModule`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Printer.printModule`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/docgen/Printer.prettify`

- **Source:** `packages/tools/docgen/src/Printer.ts:378`
- **Kind / category:** `root-declaration` / `printers`
- **Priority:** **recommended**
- **Current description:** Formats generated Markdown with the docgen Prettier settings.
- **Signature hint:** `declare function prettify(s: string): Effect.Effect<string, never, never>`
- **Import guidance:** Start from `import { Printer } from "@effect/docgen"` and use `Printer.prettify`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Printer.prettify`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/docgen/Printer.printFrontMatter`

- **Source:** `packages/tools/docgen/src/Printer.ts:364`
- **Kind / category:** `root-declaration` / `printers`
- **Priority:** **optional**
- **Current description:** Renders the front matter for a generated module page.
- **Signature hint:** `declare function printFrontMatter(module: Domain.Module, nav_order: number): string`
- **Import guidance:** Start from `import { Printer } from "@effect/docgen"` and use `Printer.printFrontMatter`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Renders the front matter for a generated module page. Call `Printer.printFrontMatter` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
