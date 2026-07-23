# API Diff Tool Plan

## Goal

Build a repository-owned tool that compares the consumer-visible TypeScript APIs of the v3 and main branches. It will produce a high-recall migration inventory for generating migration guides and documentation.

The first version will report structural API changes and review confidence. It will not claim perfect semantic-version compatibility.

## Success Criteria

- Compare all public modules discovered in both revisions.
- Consume production `.d.ts` files with internal declarations stripped.
- Handle package consolidation, relocated modules, wildcard exports, barrels, and re-exports.
- Detect additions, removals, moves, renames, and structural signature changes.
- Represent overloads, generics, interfaces, classes, namespaces, and merged declarations.
- Produce deterministic, versioned JSON and readable Markdown.
- Record exact Git SHAs used for both snapshots.
- Never silently omit an unsupported public declaration.

## Architecture

Create a private workspace package at `packages/tools/api-diff`.

Use the TypeScript compiler API directly. Do not introduce `ts-morph`.

The tool will have four logical stages:

1. Prepare branch artifacts.
2. Extract canonical API snapshots.
3. Match and diff the independently discovered snapshots.
4. Generate JSON and Markdown reports.

## Command

Add a root command with an interface similar to:

```sh
pnpm api-diff \
  --base-ref origin/v3 \
  --head-ref origin/main \
  --output tmp/api-diff
```

The refs must be explicit. The report will include their resolved commit SHAs.

Outputs:

```text
tmp/api-diff/base.snapshot.json
tmp/api-diff/head.snapshot.json
tmp/api-diff/diff.json
tmp/api-diff/report.md
```

## Branch Preparation

Reuse the temporary worktree lifecycle from `packages/effect/typeperf/compare.mjs`.

For each ref:

- Resolve the ref to a commit before starting.
- Create a detached temporary worktree.
- Run `pnpm install --frozen-lockfile`.
- Build using that branch's native build pipeline.
- Ensure `stripInternal: true`.
- Locate the package artifacts and built package manifests.
- Cache successful snapshots by commit SHA.
- Remove temporary worktrees even when extraction fails.

For main, follow the existing CI behavior for enabling `stripInternal` inside the disposable worktree. V3 already uses production build configurations with internal stripping.

## Public Entrypoints

Discover packages by `package.json.name`, never by repository directory.

Read the consumer-visible package metadata:

- V3: packed package manifests such as `dist/package.json`.
- Main: `publishConfig.exports` and emitted `dist` declarations.
- Exclude private packages.
- Expand wildcard exports to concrete declaration entrypoints.
- Respect explicit `null` exclusions.
- Exclude internal entrypoints.
- Include both direct module and barrel import routes.

The comparison scope is every consumer-visible entrypoint discovered in each revision.

## Independent Discovery

Discover the complete public module set separately in each revision. The diff
must not depend on a pre-existing migration inventory: removed modules and APIs,
new v4 modules and APIs, and likely replacements are outputs of the comparison.

## Canonical API Snapshot

Represent each public export as a serializable API entity.

Identity fields:

- Package name.
- Direct import path.
- Nested export path.
- Value or type bucket.
- Declaration kind.
- Import routes and barrel aliases.

Declaration fields:

- Type parameters and constraints.
- Function parameters.
- Optional and rest modifiers.
- Return type.
- Complete overload set.
- Heritage clauses.
- Properties and methods.
- Static and instance members.
- Call, construct, and index signatures.
- Accessibility, `readonly`, and optional modifiers.
- Namespace members.
- Enum members.
- Documentation metadata.
- Source location.

Merged value/type declarations must be represented as separate facets connected to the same exported name.

## Type AST

Serialize TypeScript type nodes into a canonical recursive model instead of relying only on `typeToString()`.

The type model should cover:

- Primitive and literal types.
- Type references and arguments.
- Unions and intersections.
- Arrays and tuples.
- Function and constructor types.
- Object and mapped types.
- Conditional and indexed-access types.
- `keyof`, type queries, and import types.
- Template literal types.
- Infer and type-operator nodes.
- Type predicates.

Normalization rules:

- Resolve aliases with `TypeChecker.getAliasedSymbol()`.
- Resolve public references to canonical API IDs.
- Preserve unresolved external package references explicitly.
- Alpha-normalize generic parameter identities while retaining display names.
- Sort union and intersection members by structural fingerprint.
- Sort object and interface members where order is not semantic.
- Preserve tuple, parameter, and overload ordering.
- Store parameter names as metadata but exclude simple renames from semantic fingerprints.
- Strip source positions, comments, declaration maps, and formatting.

Unsupported public syntax must produce a diagnostic and fail snapshot generation.

## Export Resolution

For every public entrypoint:

- Load its source file into a TypeScript `Program`.
- Obtain the module symbol.
- Enumerate exports with `getExportsOfModule()`.
- Resolve re-export aliases.
- Locate the exported symbol's declaration nodes.
- Associate direct and barrel routes with the same entity.
- Avoid recursively reporting barrel namespaces as duplicate declarations.

Snapshot extraction should use one pinned TypeScript compiler version to parse both branches' emitted declarations. This reduces printer and normalization drift while retaining each branch's native declaration emission.

## Matching

Apply matching in this order:

1. Exact API identity.
2. Exact structural fingerprints across public modules.
3. Name and structural similarity as a suggested match.
4. Remaining base exports become removals.
5. Remaining head exports become additions.

Suggested matches must include a confidence score and require review.

## Diff Classification

Report these change categories:

- Package added or removed.
- Module added, removed, moved, split, or consolidated.
- API added, removed, moved, or renamed.
- Export bucket changed.
- Declaration kind changed.
- Overload added, removed, or reordered.
- Parameter added, removed, reordered, or changed.
- Optionality or rest status changed.
- Return type changed.
- Generic parameter or constraint changed.
- Property or method added, removed, or changed.
- Heritage clause changed.
- Union or intersection member changed.
- Documentation, deprecation, or stability metadata changed.
- Unsupported or inconclusive comparison.

Each change record will contain:

- Stable change ID.
- Classification.
- Confidence.
- Base and head API IDs.
- Before and after display signatures.
- Structured AST delta.
- Source locations.
- Review notes.

Do not classify changes as semver-breaking in the first version. Use labels such as `structural-change` and `review-required`.

## Reporting

The JSON report is the canonical output.

The Markdown report should include:

- Compared refs and SHAs.
- Summary counts.
- Changes grouped by domain and module.
- Renames and moves first.
- Removals and additions next.
- Signature changes with before/after declarations.
- Suggested matches in a separate review section.
- Stable and unstable API sections.

Documentation-only changes should not obscure structural API changes.

## Prototype

Before implementing the complete extractor, test the design against:

- `effect/Effect`
- `effect/Schema`
- `effect/Stream`
- `@effect/platform/HttpClient` to `effect/unstable/http/HttpClient`
- One SQL module moved into `effect/unstable/sql`

The prototype must verify that the canonical model handles:

- Large overload sets.
- Deep generic and conditional types.
- Namespace exports.
- Package consolidation.
- Cross-module type references.
- Re-exported declarations.

Evaluate API Extractor and `@api-extractor-tools/change-detector` only as secondary validation during this prototype. Do not make either the source of truth.

## Tests

Add synthetic declaration fixtures covering:

- Function overload changes.
- Generic constraint changes.
- Interfaces and inheritance.
- Classes with static and instance members.
- Type aliases and recursive types.
- Namespaces and declaration merging.
- Value/type name collisions.
- Re-exports and aliases.
- Wildcard package exports.
- Internal export exclusions.
- Union normalization.
- Parameter reordering.
- Unsupported syntax diagnostics.

Add deterministic snapshot tests for the canonical JSON model.

Add integration tests for the representative real modules without committing complete branch reports as test fixtures.

## Implementation Phases

1. Implement and evaluate the representative-module prototype.
2. Define the versioned snapshot schema.
3. Implement package and entrypoint discovery.
4. Implement semantic export extraction and canonical type AST serialization.
5. Implement exact identity matching.
6. Implement structural fingerprints and suggested matching.
7. Implement AST diff classification.
8. Implement JSON and Markdown reporters.
9. Add ref/worktree/build orchestration and snapshot caching.
10. Run the complete v3-to-main comparison and tune false positives.
11. Generate an initial migration inventory for manual review.

## Validation

Run:

```sh
pnpm lint-fix
pnpm test packages/tools/api-diff/test
pnpm check
pnpm api-diff \
  --base-ref origin/v3 \
  --head-ref origin/main \
  --output tmp/api-diff
```

Verify:

- Both refs resolve to the expected SHAs.
- No public declaration is silently skipped.
- A repeated cached run produces identical snapshots and reports.
- Temporary worktrees are removed.
- The report separates exact matches from suggestions.
- Representative report entries agree with the existing migration guides.

## Future Work

After the migration inventory is trusted:

- Add optional assignability checks using generated TypeScript programs.
- Introduce read-only and write-only compatibility policies.
- Compare later main releases for CI API review.
- Publish report artifacts on pull requests.
- Validate changesets against detected public API changes.
- Generate migration guide tables directly from reviewed diff records.

These are explicitly outside the first implementation.
