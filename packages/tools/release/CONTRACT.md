# Release tool contract

This document, the JSDoc in `src/`, and the tests in `test/` specify
`@effect/release`. The tests are the executable part of the contract; the
implementation in `src/` satisfies them.

## What the tool replaces

Until this tool landed, `release.yml` ran `changesets/action`, which on every
push to `main` either updated the "Version Packages (rc)" pull request on
`changeset-release/main` or, when that PR had just merged, published to npm
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
| `Workspace`          | Public/private packages with their manifest versions                                                                                                      | `pnpm -r ls --depth -1 --json`                |
| `Pnpm`               | `dryRunPlan`, `applyVersions`, `stagePublish`                                                                                                             | `ChildProcessSpawner`, stdin detached         |
| `Git`                | `headSha`, `resetBranch`, `commitAll`, `pushForce`, `checkout`                                                                                            | `git` via `ChildProcessSpawner`               |
| `GitHub`             | `findPullRequest`, `createPullRequest`, `updatePullRequest`                                                                                               | `gh` via `ChildProcessSpawner`, `GH_TOKEN`    |
| `Registry`           | `isPublished`, `listStaged` (read-only)                                                                                                                   | `HttpClient`; `NPM_STAGE_TOKEN` for the queue |
| `Routing`            | `decide`: Version, Stage or Idle                                                                                                                          | pure                                          |
| `VersionPullRequest` | `title`, `body`, `sync`                                                                                                                                   | `Git`, `Pnpm`, `GitHub`                       |
| `Release`            | `plan`, `route`, `run` orchestration                                                                                                                      | all of the above                              |
| `Cli`                | `release plan`, `release route`, `release run --tag <tag> [--expect Version\|Stage] [--dry-run]`                                                          | `Release`                                     |
| `Process`            | Detached-stdin command runner and workspace-root discovery shared by the layers                                                                           | `ChildProcessSpawner`, `FileSystem`, `Path`   |

Every command-backed layer anchors its commands at the directory holding
`pnpm-workspace.yaml`, found by walking up from the current directory, because
`pnpm release` runs from the package directory.

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
not open a version PR. With `versioning.ignore` covering every private
package this no longer happens on this repository, but the guard stays.

**Routing.** Pending effective releases always win: `Version`, even if
unpublished versions exist (the registry is not even consulted then). With an
empty plan, public packages whose manifest version is neither published nor
staged are staged; published ones and ones already staged at that version are
reported in `skipped`; private packages are invisible. A staged item for a
public package at a different version is a stale upload and fails the decision
with a `ReleaseError` naming the package and both versions. Staged items for
names outside the workspace are ignored. Nothing to stage means `Idle`.

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
and exactly the `toStage` names, and never touches git or GitHub. `--expect`
recomputes the route and fails before mutation when it differs from the route
selected by the workflow. On the Version route, `--dry-run` prints the proposed
pull request title and body without touching git or GitHub; on Stage it passes
`--dry-run` to pnpm. `--tag` is required.

## Workflow integration

`.github/workflows/release.yml` keeps its filename (npm trusted-publisher
configuration is keyed to it) and its trigger (push to `main`, no
cancel-in-progress). It splits work into three jobs:

1. `route` has read-only contents permission. Only its `Decide route` step
   receives `NPM_STAGE_TOKEN`, which lets the route account for versions
   already in the stage queue. It exports the result of
   `pnpm --silent release route`.
2. `version` has contents and pull-request write permission, but no OIDC
   permission. Checkout and installation are credential-free. Only the final
   step receives `CHANGESET_GITHUB_TOKEN`; it runs `gh auth setup-git` and
   `release run --expect Version` so the PAT is available only while git and
   GitHub operations run.
3. `stage` has read-only contents and `id-token: write`, but no PAT. It runs
   `set-strip-internal`, `codemod`, `build`, then `release run --expect
   Stage` with `NPM_STAGE_TOKEN`.

Every checkout uses `persist-credentials: false`. GitHub Actions sets CI, so
pnpm's install is frozen by default and lockfile drift fails before either
mutating route runs.

There is no website deployment. It previously followed publication, so merging
this change stops release-time website deployments until the approval flow and
its website dispatch are designed. The existing `deploy-website` workflow and
`WEBSITE_DISPATCH_TOKEN` remain available for that follow-up (EFF-1455).

The `rc` tag is a workflow constant until the fixed group leaves the `rc`
lane.

## Release tracks and the 4.0 GA handoff

This migration applies only to `main`. The `v3` branch keeps its existing
changesets workflow and must not run `@effect/release`; the tool's base and
release branches are intentionally fixed to `main` and
`changeset-release/main`.

Until 4.0 GA, `main` stages releases under the `rc` dist-tag and `v3` owns
`latest`. The GA change must move the `main` fixed group off its `rc` lane and
change the workflow tag to `latest`, while changing `v3` publishing from
`latest` to its chosen maintenance tag in the same coordinated handoff. Both
changes must land before either track publishes again, or a later v3 patch
could move `latest` back to 3.x.

## Before the first Stage run

These npm-side prerequisites do not block merging the migration. Complete this
setup before the first Stage run. Missing trusted-publisher or access
configuration makes that run fail after its build:

- every published package's trusted-publisher configuration must permit
  `pnpm stage publish` from `.github/workflows/release.yml`;
- every package's npm publishing-access setting must permit that staged upload;
- `NPM_STAGE_TOKEN` must be configured as a stage-only granular token that can
  read the stage queue. The workflow exposes it only to the route decision and
  Stage execution steps. This keeps a fully staged release on the `Idle` route
  while it awaits approval, and lets a partial staging retry skip versions
  already uploaded.

Without `NPM_STAGE_TOKEN`, the queue is treated as empty with a warning. A
clean first run can still proceed. Once any current versions are staged, the
route will incorrectly select `Stage` because it cannot see them. If the Stage
execution step has the token, its `--expect Stage` guard recomputes the route
and fails before mutation when everything is already staged. If the token is
absent there too, a partial retry reaches pnpm and fails when pnpm rejects a
duplicate staged version.

## Migration landed with the implementation

- `versioning` in `pnpm-workspace.yaml`: `fixed` (the former changesets fixed
  group), `ignore` (every private package), `lanes` (every fixed-group member
  on `rc`), `changelog.storage: repository`. `pnpm version -r --dry-run` on
  this repository now lists exactly the 31 published packages at the next rc.
- `.changeset/config.json`, `.changeset/pre.json`, the `@changesets/*`
  devDependencies and patch, and the `changeset-*` scripts are gone.
  `.changeset/pre/` (the intents consumed by earlier rc releases) is kept as
  history; pnpm reads only the top-level `.changeset/*.md` files.
- The changesets skill, package registration checklist and `AGENTS.md`
  describe `pnpm change` / `versioning` instead of the changesets config.

## Out of scope

The approval gate (all staged versions ready, then approve), the approval
path itself, and the website deployment that follows publication wait on the
live spike findings and on the maintainer decision recorded in EFF-1455.
`Registry.listStaged` is defined here only because routing needs to skip
versions already awaiting approval.
