---
name: dependency-maintenance
description: Dependency maintenance. Use when adding or upgrading a package dependency, coordinating workspace dependency versions, or changing pnpm, JavaScript runtimes, TypeScript compatibility, test/build tools, native install policy, patched dependencies, or test container images.
---

Treat an upgrade as a synchronization task, not a lockfile refresh. Derive exact
commands and compatibility points from the repository at execution time; do not
carry version assumptions between runs.

## Discover

1. Read the root and affected package scripts, `pnpm-workspace.yaml`, relevant
   setup actions and workflows, and the test project configuration before
   choosing commands.
2. Search for the dependency name, current version or range, runtime input,
   image name, peer range, engine constraint, and compatibility claim across the
   repository before editing. Include manifests, the lockfile, patches,
   workflows, setup actions, READMEs, config files, and test call sites.
3. Classify the work into the package-local or coordinated branch below. Record
   every synchronization point and whether its value is a development version,
   tested version, peer range, engine minimum, or advertised minimum.

Discovery is complete when every match is classified as an update candidate or
an intentionally different constraint and the affected validation matrix is
selected.

## Manifest role

Before adding or moving an entry, inspect the nearest package with the same
integration shape and justify one role:

| Role                                     | Use when                                                                                                    | Check                                                                                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `dependencies`                           | Published runtime code requires its own installed copy                                                      | A packed consumer receives it without adding an undeclared package.                                                              |
| `peerDependencies`                       | Consumers must provide a compatible shared package or the public contract integrates with their copy        | The range states supported consumer versions; add a separate development entry when local build or tests need an installed copy. |
| `devDependencies`                        | Only repository build, test, type, benchmark, or code-generation work needs it                              | Published runtime code and declarations do not require consumers to install it.                                                  |
| `optionalDependencies`                   | A runtime feature handles the package being absent and installation failure must not block the base package | Focused tests cover both present and absent behavior.                                                                            |
| Optional peer via `peerDependenciesMeta` | A consumer-provided integration is genuinely optional                                                       | The peer range remains in `peerDependencies`, and code does not require the integration unless selected.                         |

Role selection is complete when every changed manifest entry has one justified
role and peer compatibility ranges remain independent from versions used for
repository validation.

## Package-local branch

Use this branch for one dependency in one workspace package when runtime,
compiler, package-manager, image, patch, and shared-tooling policy are unchanged.

1. Update only the owning manifest, preserving whether the dependency is a
   runtime, development, optional, or peer dependency. If a peer and development
   dependency coexist, choose each range independently: the peer expresses
   consumer compatibility; the development entry selects what this repository
   tests.
2. If the dependency requires a native-artifact or install-script policy
   decision, switch to the coordinated branch.
3. Use the affected package scripts and test project names to select focused checks. Invoke
   `runtime-testing` for runtime tests and `type-testing` for inference,
   assignability, or public-type coverage.

This branch is complete when the owning manifest and focused tests/checks agree,
and no repository search result requires coordinated treatment.

## Coordinated branch

Use this branch whenever multiple packages or compatibility surfaces move
together. Select every applicable row; derive each command from the cited
current source.

| Change                                     | Synchronize                                                                                                                                          | Validation source                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Shared dependency or test/build tool       | All owning manifests, peer/development range pairs, configs, and generated artifacts owned by that tool                                              | Root and package scripts; affected Vitest projects                                     |
| pnpm                                       | Update root `packageManager`; audit workspace settings, setup and cache assumptions, workflows, and regenerated lockfile format for required changes | Current install, lint, check, build, and focused test scripts                          |
| Node, Deno, or Bun                         | Setup action inputs, workflow jobs, package engines, runtime package metadata, compatibility docs, and runtime-specific config                       | Commands and project selection in the current runtime workflow jobs and test config    |
| TypeScript support or development compiler | Root compiler/tooling dependencies, `test-types` target, CI type target, published tool peer ranges, compatibility docs, and relevant typetests      | Invoke `type-testing`; invoke `type-performance` when measured compiler paths can move |
| Native package or install policy           | Owning manifests and `pnpm-workspace.yaml#allowBuilds`                                                                                               | Fresh install output plus the owning package's focused build and tests                 |
| Patched dependency                         | Manifest/range, `pnpm-workspace.yaml#patchedDependencies`, patch file, and lockfile patch hash                                                       | Fresh install and focused behavior that required the patch                             |
| Container image or Testcontainers package  | Workflow pre-pulls, image call sites, owning manifests, and affected integration project names                                                       | Current integration workflow and Vitest project configuration                          |

Before editing any workflow or composite action, invoke `ci-maintenance` and let
it own those edits. Return here afterward to finish the dependency
synchronization and affected-matrix review. Invoke
`runtime-performance` or `type-performance` when the upgraded component lies on
a measured path; use those skills' comparison protocols rather than inventing a
benchmark here.

For a patched dependency, test the new release without the patch when feasible.
Remove the patch registration and file if the patch is obsolete; otherwise
refresh it using the current pnpm patch workflow and verify the original patched
behavior. Completion requires evidence that the retained patch still applies
and remains necessary.

## Install and review

Run root `pnpm install` after all selected synchronization points are edited.
Inspect its warnings and the semantic `pnpm-lock.yaml` diff:

- requested specifiers and resolved versions;
- added, removed, or unexpectedly duplicated transitive packages;
- peer resolution changes and warnings;
- integrity and patch-hash changes;
- lifecycle scripts and `allowBuilds` effects.

Explain any unrelated pre-existing lockfile changes and remove only unrelated
churn introduced by this task. A clean install exit alone does not complete this
review.

## Validate and finish

Run the narrowest commands that reproduce every selected matrix row, taking the
exact commands from current package scripts and workflow jobs. Invoke
`runtime-testing` and `type-testing` for their respective test conventions, and
the performance skills only for measured paths. Invoke `changesets` after
implementation and focused validation when the consumer-impact criteria in
`.agents/AGENTS.md` apply.

Inspect the final diff and repeat the repository search. The task is complete
when every discovered synchronization point is updated or explicitly retained,
peer and minimum-version differences are intentional, the lockfile has no
unexplained churn, and every selected validation row passes or is reported as
not runnable.
