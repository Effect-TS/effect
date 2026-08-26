---
name: package-development
description: Package registration. Use when adding a workspace package, making a private package publishable, renaming a package, or moving a package between families.
---

Treat package work as a registration change, not a directory copy.

## Workflow

1. Inspect the closest package in the same family and classify the target's
   publication status, runtime, test environment, platform support, generated
   barrels, and dependency role. Record which neighboring files apply. This
   step is complete when every file to be added has a relevant precedent.
2. Create or move only the source, test, TypeScript, and manifest files required
   by that precedent. Follow `library-development` for Effect implementation and
   generated `@barrel` sections. Use `dependency-maintenance` to select or
   version external dependencies and update install policy or the lockfile; this
   skill owns manifest structure and package registration. This step is complete
   when pnpm discovers the package by its intended name and its manifest
   references no absent file.
3. For a published package, compare its manifest with a neighboring published
   package in the same family. Keep development `exports` and
   `publishConfig.exports` aligned by key: source targets become their intended
   built targets, while blocked internal and legacy paths remain blocked. Check
   `scripts/copy-ai-docs.mjs` for required `files` entries. This step is complete
   when each public source entrypoint has exactly one published counterpart and
   no internal entrypoint is exposed.
4. Audit every registry below, marking it applicable or not applicable in the
   work report. For a rename or move, search the repository for both old package
   name and old path after updating the registries. This step is complete when
   every applicable registry is updated and remaining old references are
   intentionally retained and explained.
5. If the package uses generated barrels, run the repository codegen and inspect
   the generated diff using `library-development`. This step is complete when
   generated sections match source modules and no generated output was edited
   manually.
6. Run the narrowest package tests and package scripts that cover the wiring,
   then the applicable root checks from `.agents/AGENTS.md`. Use `type-testing`
   for public API type tests. For a published package, run the current root build
   so publication payload generation runs, then use a dry pack to inspect the
   file list. When manifest transformation matters, create the tarball in a
   temporary destination without publishing and inspect its packed
   `package.json`. This step is complete when focused tests, package check/build,
   root check and lint pass as applicable, and the packed surface contains only
   intended files.
7. Invoke `changesets` when the package becomes publishable, a published package
   is renamed, or the central consumer-impact criteria otherwise apply. Actual
   publication belongs to `release-maintenance`. Invoke `ai-docs` only when
   authoring AI documentation. The package task is complete when the registry
   audit is exhaustive, validation passes, the changeset decision is recorded,
   any requested publication is delegated to `release-maintenance`, and the final
   diff contains no unused copied files.

## Registry audit

| Registry                                                                             | Applicable when                                                                                                             | Completion check                                                                                                                      |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm-workspace.yaml`                                                                | The path is not matched by an existing workspace glob, or a move changes the matching glob or dependency policy             | The package is selected by its exact name and uses current workspace dependency policy.                                               |
| `pnpm-lock.yaml`                                                                     | Package path, name, or dependencies changed                                                                                 | The importer exists under the current path, is current, and no stale importer remains.                                                |
| `tsconfig.packages.json`                                                             | The package participates in the root TypeScript build                                                                       | Its project reference uses the current path; private packages are not exempt automatically.                                           |
| `tsconfig.tests.json`                                                                | Tests or type tests import the package by name or need a source alias; also audit exclusions for platform-specific packages | Required root and subpath aliases resolve to current source, and stale aliases are absent.                                            |
| `vitest.config.ts`                                                                   | The package has runtime tests                                                                                               | A project exists at the current path with the required runtime, environment, setup, and inclusion conditions.                         |
| `deno.json`                                                                          | The package should participate in the Deno workspace, or its family/runtime must remain excluded                            | It is covered by the intended workspace glob and not excluded, or the applicable exclusion is recorded.                               |
| `.changeset/config.json`                                                             | The package is published under the repository's fixed release policy, or a rename changes membership                        | The current published name has intended membership and the old name is absent. Private tooling is not added solely because it builds. |
| `README.md`                                                                          | The package is part of the public package catalog                                                                           | Its current name, path, description, and documentation link are present; stale catalog entries are absent.                            |
| `scripts/copy-ai-docs.mjs` and the package `files` list                              | The package is published                                                                                                    | The package path is discovered by the script and all files required by the script are publishable.                                    |
| `.github/workflows/snapshot.yml`                                                     | A published package path or family changes                                                                                  | Snapshot package selection includes the current path; use `release-maintenance` and `ci-maintenance` for any workflow edit.           |
| Path-sensitive scripts, including `copy-ai-docs.mjs`, `codemod.mjs`, and `clean.mjs` | A new family or move changes path matching                                                                                  | Audit their current package globs for the new path; update each applicable glob and explain exclusions.                               |

Use current registry contents and neighboring packages as sources of truth; do
not infer registration from a successful package-local build.
