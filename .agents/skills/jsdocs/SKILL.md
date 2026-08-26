---
name: jsdocs
description: Public API JSDoc. Use when writing or reviewing Effect API documentation or fixing effect-jsdocs checker diagnostics.
---

## Workflow

1. Inspect the declaration, implementation, nearby tests, call sites, and nearby
   JSDoc before editing.
2. Choose a focused API fix or a module refinement pass.
3. Preserve verified facts and valuable examples while applying the declaration
   contract below.
4. For a module refinement or an API with close alternatives, perform the
   `@see` and `**Gotchas**` audits.
5. Run `pnpm jsdocs --check`, then every applicable check in the root
   `AGENTS.md` validation matrix.

The task is complete when the checker has no diagnostics, changed examples pass
their targeted doctest when applicable, and the root checks pass.

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

Write all prose in practical English. The short description is one
self-contained paragraph. For functions and methods, use present-tense
action-first prose such as `Creates`, `Returns`, `Checks`, `Provides`, or
`Converts`. For technical values, match nearby noun families such as `Schema
for`, `Layer that`, `Service that`, or `Context reference that`. Describe the
public concept rather than implementation mechanics.

Optional sections appear once, with non-empty content, in this order: `**When
to use**`, `**Details**`, `**Gotchas**`. Use exactly one blank line between the
description, sections, examples, and tags. Use prose for one fact and bullets
for two or more parallel facts. Other bold or Markdown headings are not part of
declaration JSDoc.

`**When to use**` states the documented API's positive use case, distinct from
what it does. Begin with `Use to`, `Use when`, `Use as`, or `Use with`. Put
comparisons with sibling APIs in `@see` text. When describing a user's goal,
prefer reader-centered wording such as `Use when you ...` that reads naturally
as an intent. `**Gotchas**` contains concrete edge cases, preconditions,
footguns, surprising behavior, or important failure modes.

`@internal` declarations and default exports are outside public JSDoc authoring.
Checked files do not support exported enums or empty export declarations.

## Categories

Root declarations require exactly one non-empty `@category`. Prefer established
lowercase plural buckets and gerunds for operation families; preserve canonical
casing for acronyms and domain names such as `type IDs`, `DateTime`, `JSON`,
`Base64`, `Undici`, and `Standard Schema`.

Common categories include:

- API shapes: `constructors`, `destructors`, `models`, `schemas`, `guards`,
  `predicates`, `getters`, `accessors`, `instances`, `constants`, `protocols`,
  `prototypes`, `re-exports`, `unsafe`, and `testing`.
- Effect concepts: `services`, `tags`, `layers`, `context`, `resource
  management`, `running`, `errors`, and `error handling`.
- Operations: `combinators`, `filtering`, `mapping`, `sequencing`, `zipping`,
  `combining`, `merging`, `converting`, `transforming`, `folding`, `splitting`,
  and `repetition`.
- Other shared concepts: `utility types`, `encoding`, `decoding`,
  `serialization`, `tracing`, `metrics`, `logging`, `annotations`, `references`,
  `symbols`, `type IDs`, `configuration`, `math`, `comparisons`, and `ordering`.

Keep these boundaries: services are service contracts while tags identify
services; layers provide services; getters retrieve values while accessors read
context; errors are data models while error handling recovers or maps failures;
models represent domain data while utility types are type-level helpers and
contracts; schemas describe data; guards narrow types while predicates return
booleans.

## Examples

Examples are optional. Add one when it demonstrates behavior not evident from
the signature, meaningful public-API composition, a repository-supported use
case, or useful inference or narrowing. Keep a correct high-value example;
replace or remove one that is trivial, misleading, contrived, nondeterministic,
or requires more scaffolding than its insight justifies.

Each example uses `**Example** (Unique title)`, optional prose, and exactly one
non-empty `ts` fence. Titles are unique after trimming and lowercasing. Use a
short use-case phrase such as `Parsing JSON` or `Creating a scoped runtime`,
with canonical API capitalization.

Make examples self-contained TypeScript modules using public imports. Keep them
deterministic, bounded, and independent of networks, external services, timing,
randomness, and machine-specific state. Arrange nontrivial examples as setup,
operation, then observation. Observe the semantic result rather than console or
error formatting, and project only the unstable fields that must be excluded.

Mark runnable fences with `import.meta.vitest`. Prefer direct trailing
assertions such as `operation() // => expected`, dense expected arrays, and
semantic Effect values. Await asynchronous work. Prefer awaited
`Effect.runPromise`; use `Effect.runSync` only when synchronous execution is the
documented contract. The transform does not run Effects or await promises
automatically.

Keep type-level examples marked but do not add tautological runtime assertions.
Leave examples that register Vitest tests or suites as plain `ts` fences because
the collector executes runnable snippets inside tests. Keep intentionally
non-executable examples plain as well. Use `Ref`, `Deferred`, or `Queue` instead
of mutable probes when concurrency, interruption, or races are the contract.

If example research suggests an implementation or type bug, report it instead
of changing runtime code during a documentation-only pass.

## Tags

Declaration tags appear in this order:

1. `@deprecated`
2. `@default`
3. `@see`
4. `@category`
5. `@since`

Apply the scope contract:

- Root declarations require non-empty `@category` and stable-semver `@since`;
  they do not allow `@default`.
- Namespaces and declarations inside namespaces require stable-semver `@since`,
  may use `@category`, and do not allow `@default`.
- Member JSDoc is optional. When present, it may use stable-semver `@since` and
  non-empty `@default`, but not `@category`, and follows the declaration prose
  and layout contract.
- Any declaration may use one non-empty `@deprecated` and repeated non-empty
  `@see` tags.

Use canonical `**Example**` sections rather than `@example` tags or loose code
fences.

## Module JSDoc

Module JSDoc is outside ordinary declaration authoring, but `effect-jsdocs`
validates a top-level module block when present. A first top-level JSDoc block is
treated as module JSDoc unless TypeScript attaches it to a non-import first
declaration. An `@internal` module block is omitted.

The declaration prose template is not imposed on module prose. Module tags are
limited to optional non-empty `@deprecated`, repeated non-empty `@see`, and a
required stable-semver `@since`, in that order. Module code fences must use the
same canonical, uniquely titled `**Example**` sections as declaration examples.
Inline links and module `@see` links are validated when present.

## Links And Refinement

Inline `{@link Symbol}` targets must resolve to TypeScript symbols; use normal
Markdown links for URLs. Prefer code formatting when navigation does not help a
reader understand or choose the API.

Use `@see` only for a semantically useful related public API: a close
alternative, inverse, complementary operation, level variant, or closely
returned, consumed, or configured type. Inspect each target before retaining or
adding it. Write explanatory prose after the link when the relationship is not
obvious. Exclude implementation dependencies, broad concepts, example-only
helpers, private APIs, and names related only lexically.

For a module refinement:

1. Scan local documentation, category conventions, and repeated API families.
2. Preserve the module's accurate voice and examples rather than rewriting
   mechanically.
3. Audit existing and missing `@see` relationships across close alternatives.
4. Inspect implementation and tests for concrete caveats worth a `**Gotchas**`
   section; record when the audit finds none worth documenting.

## Validation

Run structural validation from the repository root:

```sh
pnpm jsdocs --check
```

For runnable example changes, target changed source files:

```sh
pnpm doctest --run <source files>
```

Then run every applicable check from the root `AGENTS.md` validation matrix.
