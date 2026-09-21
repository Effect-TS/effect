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
| `Cli`                | `release plan`, `release route`, `release run --tag <tag> [--dry-run]`                                                                                    | `Release`                                     |
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
and exactly the `toStage` names, and never touches git or GitHub. `--dry-run`
reaches only the staging call. `--tag` is required.

## Workflow integration

`.github/workflows/release.yml` keeps its filename (npm trusted-publisher
configuration is keyed to it) and its trigger (push to `main`, no
cancel-in-progress). Its single job:

1. checks out with the PAT in `CHANGESET_GITHUB_TOKEN` (so checks run on the
   version branch), runs `./.github/actions/setup`, sets the bot git identity;
2. runs `pnpm --silent release route` and exports `_tag` as a step output;
3. on `Version`: `pnpm --silent release run --tag rc` with `GH_TOKEN` (only
   git and GitHub are touched);
4. on `Stage`: `set-strip-internal`, `codemod`, `build`, then
   `pnpm --silent release run --tag rc`; the job's `id-token: write` lets pnpm
   use trusted publishing;
5. no website deployment: it followed publication before and now belongs
   with the approval step, which is pending a decision (EFF-1455).

The `rc` tag is a workflow constant until the fixed group leaves the `rc`
lane. `NPM_STAGE_TOKEN` (a stage-only granular token) is optional: without it
the stage queue is treated as empty with a warning, so the only loss is the
"already staged" skip.

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
