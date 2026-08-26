---
name: jsdocs
description: Public API JSDoc. Use when writing or reviewing Effect API documentation or fixing effect-jsdocs checker diagnostics.
---

## Workflow

1. Inspect the declaration, implementation, nearby JSDoc, tests, and call sites.
2. Choose a focused API fix or module refinement. Preserve verified facts and
   valuable examples while applying the contract below.
3. For module refinement or APIs with close alternatives, audit `@see` links
   and concrete `**Gotchas**`.
4. Run `pnpm jsdocs --check` and the applicable root `AGENTS.md` validation.

Complete the task only when the checker passes and every changed runnable
example passes its targeted doctest.

## Declaration shape

Use a multiline JSDoc block for a public declaration:

````ts
/**
 * Short description as one paragraph.
 *
 * **When to use**
 *
 * Optional practical usage guidance.
 *
 * **Details**
 *
 * Optional details for complex behavior.
 *
 * **Gotchas**
 *
 * Optional concrete caveats.
 *
 * **Example** (Parsing JSON)
 *
 * ```ts import.meta.vitest
 * operation() // => expected
 * ```
 *
 * @category constructors
 * @since 1.0.0
 */
````

Write practical English about the public concept, not its implementation. Make
the description one self-contained paragraph. Start functions and methods with
a present-tense action such as `Creates`, `Returns`, or `Converts`; match nearby
noun families for values, such as `Schema for`, `Layer that`, or `Service that`.

Optional non-empty sections appear once in this order: `**When to use**`,
`**Details**`, `**Gotchas**`. Separate descriptions, sections, examples, and
tags with exactly one blank line. Use prose for one fact and bullets for parallel
facts. Do not add other headings.

`**When to use**` states a positive use case distinct from the description and
begins with `Use to`, `Use when`, `Use as`, or `Use with`. Put sibling
comparisons in `@see`. Reserve `**Gotchas**` for concrete preconditions, edge
cases, surprising behavior, and important failure modes.

`@internal` declarations and default exports are outside public JSDoc authoring.
Checked files do not support exported enums or empty export declarations.

## Categories

Root declarations require one non-empty `@category`. Reuse nearby categories;
prefer lowercase plurals and gerunds while preserving canonical domain casing.

Common categories include:

- Shapes: `constructors`, `destructors`, `models`, `schemas`, `guards`,
  `predicates`, `getters`, `accessors`, `instances`, `constants`, `protocols`,
  `prototypes`, `re-exports`, `unsafe`, `testing`.
- Effect: `services`, `tags`, `layers`, `context`, `resource management`,
  `running`, `errors`, `error handling`.
- Operations: `combinators`, `filtering`, `mapping`, `sequencing`, `zipping`,
  `combining`, `merging`, `converting`, `transforming`, `folding`, `splitting`,
  `repetition`.
- Shared: `utility types`, `encoding`, `decoding`, `serialization`, `tracing`,
  `metrics`, `logging`, `annotations`, `references`, `symbols`, `type IDs`,
  `configuration`, `math`, `comparisons`, `ordering`.

Keep these boundaries: services are contracts, tags identify services, and
layers provide them; getters retrieve values while accessors read context;
errors model failures while error handling recovers or maps them; models are
domain data while utility types are type-level contracts; guards narrow while
predicates return booleans.

## Examples

Examples are optional. Keep or add one only for behavior not evident from the
signature, meaningful composition, or useful inference or narrowing. Replace or
remove examples that are trivial, misleading, contrived, or scaffolding-heavy.

Use `**Example** (Unique use-case title)`, optional prose, and exactly one
non-empty `ts` fence. Titles must remain unique after trimming and lowercasing.

Follow the root example rules. Additionally, use public imports and arrange
nontrivial examples as setup, operation, then semantic observation. Mark
runnable fences with `import.meta.vitest`; the transform does not run Effects or
await promises automatically. Prefer awaited `Effect.runPromise`; use
`Effect.runSync` only when synchronous execution is the documented contract.

Keep type-level examples marked without tautological runtime assertions. Leave
examples that register tests and intentionally non-executable examples as plain
`ts` fences. Use `Ref`, `Deferred`, or `Queue` rather than mutable probes for
concurrency, interruption, or races.

If example research suggests an implementation or type bug, report it instead
of changing runtime code during a documentation-only pass.

## Tags

Declaration tags appear in this order:

1. `@deprecated`
2. `@default`
3. `@see`
4. `@category`
5. `@since`

Scope rules:

- Roots require `@category` and stable-semver `@since`; no `@default`.
- Namespaces and their declarations require stable-semver `@since`, permit
  `@category`, and reject `@default`.
- Member JSDoc is optional; when present it permits stable-semver `@since` and
  non-empty `@default`, rejects `@category`, and follows the prose contract.
- Any declaration permits one non-empty `@deprecated` and repeated non-empty
  `@see` tags.

Use canonical `**Example**` sections rather than `@example` tags or loose code
fences.

## Module JSDoc

When present, the first top-level JSDoc is the module block unless TypeScript
attaches it to a non-import first declaration. An `@internal` module is omitted.

Module prose does not use the declaration template. Its tags are optional
non-empty `@deprecated`, repeated non-empty `@see`, then required stable-semver
`@since`. Its examples and links follow the same contracts as declarations.

## Links And Refinement

Inline `{@link Symbol}` targets must resolve to TypeScript symbols; use normal
Markdown links for URLs. Prefer code formatting when navigation does not help a
reader understand or choose the API.

Use `@see` only for a verified related public API: a close alternative, inverse,
complement, level variant, or closely returned, consumed, or configured type.
Explain non-obvious relationships. Exclude implementation dependencies, broad
concepts, example-only helpers, private APIs, and merely lexical matches.

For a module refinement:

1. Scan local documentation, categories, and repeated API families.
2. Preserve accurate voice and examples rather than rewriting mechanically.
3. Audit existing and missing `@see` links across close alternatives.
4. Inspect implementation and tests for concrete gotchas; record when none are
   worth documenting.
