# Release tool contract

This document, the JSDoc in `src/`, and the tests in `test/` are the
specification handed to the implementation run. Nothing in `src/` is
implemented yet: every member raises `not implemented`, so the suite is red
by construction and turns green as the modules are filled in.

## What the tool replaces

Today `release.yml` runs `changesets/action`, which on every push to `main`
either updates the "Version Packages (rc)" pull request on
`changeset-release/main` or, when that PR has just merged, publishes to npm
directly. The replacement keeps the shape and changes two things:

- versions, changelogs and the consumed-intent ledger come from
  `pnpm version -r` (pnpm's native versioning, which reads the same
  `.changeset/*.md` files);
- merging the version PR leads to `pnpm stage publish`, never `pnpm publish`.
  Making staged versions public is a separate, maintainer-driven step that is
  out of scope here.

## Modules

| Module               | Role                                                                                                                                                      | Backed by                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `ReleasePlan`        | Types for pnpm's release plan; parsers for `pnpm version -r --dry-run` text and `pnpm version -r --json`; `effectiveReleases`, `isEmpty`, `prereleaseTag` | pure                                          |
| `Workspace`          | Public/private packages with their manifest versions                                                                                                      | `pnpm -r ls --depth -1 --json` or manifests   |
| `Pnpm`               | `dryRunPlan`, `applyVersions`, `stagePublish`                                                                                                             | `ChildProcessSpawner`, stdin detached         |
| `Git`                | `headSha`, `resetBranch`, `commitAll`, `pushForce`, `checkout`                                                                                            | `git` via `ChildProcessSpawner`               |
| `GitHub`             | `findPullRequest`, `createPullRequest`, `updatePullRequest`                                                                                               | `gh` via `ChildProcessSpawner`, `GH_TOKEN`    |
| `Registry`           | `isPublished`, `listStaged` (read-only)                                                                                                                   | `HttpClient`; `NPM_STAGE_TOKEN` for the queue |
| `Routing`            | `decide`: Version, Stage or Idle                                                                                                                          | pure                                          |
| `VersionPullRequest` | `title`, `body`, `sync`                                                                                                                                   | `Git`, `Pnpm`, `GitHub`                       |
| `Release`            | `plan`, `route`, `run` orchestration                                                                                                                      | all of the above                              |
| `Cli`                | `release plan`, `release route`, `release run --tag <tag> [--dry-run]`                                                                                    | `Release`                                     |

## Behaviour the tests pin down

**Plan parsing.** The dry-run text is the source of truth (`--json` is
ignored in dry-run mode on pnpm 11.20). A line is
`<name>: <current> → <new> (<bump>, via <cause>[+<cause>...])`; the
no-pending marker is the exact string in `ReleasePlan.NO_PENDING_CHANGES`.
Anything else (for example an unclean-tree error) is a `ReleaseError` that
carries the text.

**No-op releases are not releases.** pnpm lists dependents whose version does
not move (`0.0.0 → 0.0.0`, private tooling pulled in "via dependencies").
`effectiveReleases` drops them; a plan with only such lines is empty and must
not open a version PR.

**Routing.** Pending effective releases always win: `Version`, even if
unpublished versions exist. With an empty plan, public packages whose
manifest version is neither published nor staged are staged; published ones
and ones already staged at that version are reported in `skipped`; private
packages are invisible. A staged item for a public package at a different
version is a stale upload and fails the decision with a `ReleaseError` naming
the package and both versions. Staged items for names outside the workspace
are ignored. Nothing to stage means `Idle`.

**Version PR.** Branch `changeset-release/main` into `main`, title
`Version Packages` or `Version Packages (<prerelease tag>)`, commit message
`Version Packages`. The body starts with `VersionPullRequest.BODY_INTRO`
and lists effective releases as ``- `<name>`: <current> → <new> (<bump>)``
under `## Releases`. `sync` records `HEAD`, resets the branch from `main`,
applies the plan, commits, force-pushes, then updates the open PR or creates
one; it returns `NoChanges` and skips push and GitHub when the commit is
empty; it always checks the original SHA back out, also on failure.

**Run.** `Version` calls `VersionPullRequest.sync` and never
`Pnpm.stagePublish`. `Stage` calls `Pnpm.stagePublish` with the requested tag
and exactly the `toStage` names, and never touches git or GitHub. `--dry-run`
reaches only the staging call. `--tag` is required.

## Workflow integration (implementation run, not this one)

`release.yml` keeps its filename (npm trusted-publisher configuration is keyed
to it) and its trigger (push to `main`, no cancel-in-progress). Its single job
becomes:

1. checkout with the PAT currently in `CHANGESET_GITHUB_TOKEN` (so checks run
   on the version branch), `./.github/actions/setup`;
2. `pnpm release route`, exported as a step output;
3. on `Version`: `pnpm release run --tag rc` (only git and GitHub are
   touched);
4. on `Stage`: the existing build steps (`set-strip-internal`, `codemod`,
   `build`), then `pnpm release run --tag rc` with `id-token: write` for
   trusted publishing;
5. no website deploy here; it moves to the approval step.

The `rc` tag is a workflow constant until the fixed group leaves the `rc`
lane.

## Prerequisites the implementation run must also land

- `versioning` in `pnpm-workspace.yaml`: `fixed` (the group from
  `.changeset/config.json`), `ignore` (every private package, or pnpm bumps
  them "via dependencies"), `lanes` (every fixed-group member on `rc`),
  `changelog.storage: repository`.
- Removal of `.changeset/config.json`, `.changeset/pre.json`, the
  `@changesets/*` devDependencies and patch, and the `changeset-*` scripts;
  a decision on `.changeset/pre/` (delete, or migrate into the ledger).
- The changesets skill and AGENTS.md wording (`pnpm change` instead of
  `pnpm changeset`).
- A stage-only granular token as `NPM_STAGE_TOKEN` for `Registry.listStaged`,
  pending the P1 probe in the release-spike runbook. Until that probe runs,
  the implementation may treat a missing token as "nothing staged" and log it;
  the routing tests do not depend on how the queue is read.

## Out of scope

The approval gate (all staged versions ready, then approve) and the
approval path itself wait on the live spike findings and on the maintainer
decision recorded in EFF-1455. `Registry.listStaged` is defined here only
because routing needs to skip versions already awaiting approval.
