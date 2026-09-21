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

## Publish approval (EFF-1460; contract only until the implementation run)

Merging "Version Packages (rc)" stages a release. Making it public is a
second pull request, "Publish Packages (rc)", that the readiness workflow
opens only once every staged version has passed the registry's validation.
Merging that PR authorises publication of exactly the staged tarballs it pins.
The tests in `test/ReleaseManifest.test.ts`, `test/Readiness.test.ts`,
`test/PublishPullRequest.test.ts`, `test/StageApproval.test.ts`,
`test/Publication.test.ts`, `test/PublishCli.test.ts` and
`test/PublishWorkflow.test.ts` are the executable contract; the modules they
import exist as stubs in `src/` and fail with `not implemented` until the
implementation run fills them in.

### Modules

| Module               | Role                                                                                              | Backed by                                 |
| -------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `ReleaseManifest`    | `fromStaged`, `encode`, `decode`, `identity`; `MANIFEST_PATH`, `LEDGER_PATH`                      | pure                                      |
| `Readiness`          | `assess`: `Ready` or `NotReady` with blockers; the status vocabulary sets                         | pure                                      |
| `PublishPullRequest` | `title`, `body`, `identityFromBody`, `sync`                                                       | `Git`, `GitHub`, `FileSystem`             |
| `StageApproval`      | `viewStaged`, `approve` (the only registry writes in the tool)                                    | `HttpClient`; `NPM_APPROVE_TOKEN`         |
| `Publication`        | `readiness` and `publish` orchestration                                                           | all of the above, `Registry`, `Workspace` |
| `Cli`                | `release readiness --tag <tag> [--dry-run]`, `release publish --expect-identity <id> [--dry-run]` | `Publication`                             |

`Git` gains `lastCommitTouching(path)`; nothing else in the existing modules
changes.

### The manifest

`.release/manifest.json` (`ReleaseManifest.MANIFEST_PATH`) pins the release:
`schema`, the dist-`tag`, `sourceSha` (the last first-parent commit that
touched `.changeset/ledger.yaml`, which is the "Version Packages" merge the
tarballs were built from; the website deploys this revision) and `packages`,
one `{ name, version, stageId }` per public package, sorted by name. `encode`
is canonical and byte-stable; `identity` is the first 16 hex characters of
the SHA-256 of that encoding. The identity appears in the publish PR body as
`<!-- release-manifest: <identity> -->`, and a maintainer passes it to
`release publish --expect-identity`. `decode` rejects unknown schemas, missing
fields and unsorted package lists, so a hand-edited manifest cannot slip
through.

### Readiness

`Readiness.assess` classifies every manifest package against the queue and
the registry: `public` (already served), `approvable` (the pinned stage id
exists at the pinned name and version with a status in
`APPROVABLE_STATUSES`), `pending` (`validating`), `missing` (no item with the
pinned id, or the id now belongs to something else; the detail names a newer
id when the version was re-staged), `blocked` (`blocked`, `rejected`,
`deleted`) or `unknown` (no status, or a word outside every set). A release
is `Ready` only when every package is `public` or `approvable`; anything else
fails closed. The status words are the contract's assumption, taken from the
npm CLI fixtures and pnpm's renderer; the live probe may amend the sets.

### The readiness workflow

`release-readiness.yml` runs on a schedule (and on demand) and calls
`release readiness --tag rc`, which:

1. lists the workspace, the queue and the published state; the release set is
   every public package whose manifest version is not published. Empty →
   `Idle`;
2. if the manifest already on `main` still pins items in the queue, that
   release is authorised and unfinished → `InProgress`, no new PR;
3. any release-set package with no upload at its version → `Incomplete`;
4. otherwise builds the manifest (`fromStaged` fails on a stale upload at
   another version, exactly like `Routing`), assesses readiness and calls
   `PublishPullRequest.sync`.

`sync` never touches git while the release is not ready: with an open PR it
rewrites the title to `Publish Packages (rc) [not ready]` and lists the
blockers in the body (`Marked`); without one it does nothing (`Skipped`).
When ready, an open PR that already carries this identity is left alone
(`NoChanges`), so repeated runs are no-ops; otherwise the branch
`publish-release/main` is reset from `main`, the manifest committed as
"Publish Packages", force-pushed, and the PR created or updated. The step
holds `NPM_STAGE_TOKEN` (queue reads) and `CHANGESET_GITHUB_TOKEN` (branch
push and PR) and nothing else; the job has no `id-token` permission and runs
no build.

### Publication

`publish.yml` is `workflow_dispatch` only, runs only on `main`, has
`contents: read`, no build, version or stage steps, and takes two inputs: the
identity from the merged PR and a one-time password. `release publish
--expect-identity <id>` reads the OTP from `NPM_OTP` (never a flag, so it is
not on argv) and:

1. decodes the manifest at `MANIFEST_PATH` on the checkout; its identity must
   equal the expected one, otherwise it fails before any registry call. This
   is what ties the merge to one exact manifest: neither the current queue
   nor an unmerged branch is ever consulted for what to publish;
2. rechecks the whole release with `Readiness.assess`; any blocker fails the
   run before anything is approved;
3. approves each `approvable` package in manifest order with
   `StageApproval.approve` (`POST /-/stage/<id>/approve`, `npm-otp` header),
   one registry operation each. There is no batch or transactional approve,
   so publication is not atomic: the first failure stops the loop and the
   error names what was approved and what remains;
4. polls `Registry.isPublished` for every approved package every
   `CONFIRM_INTERVAL` until all are served or `CONFIRM_TIMEOUT` elapses, and
   only then returns `Published` with `websiteRevision = sourceSha`.

Packages already public are verified, never re-approved, so re-dispatching
the workflow with the same identity and a fresh OTP finishes a partially
published release. When everything is already public it returns
`AlreadyPublished` with the same website revision, so a failed website
dispatch is retried by re-dispatching the workflow. The workflow writes
`published=true` and `revision=<sourceSha>` to its outputs; the website step
runs only on `published == 'true'` with channel `v4` and that revision.

### Credentials and what is still unverified

Verified against pnpm 11.20's bundled `stage/approve.js`, the npm docs
(`npm-stage`, about-access-tokens, trusted-publishers) and the September 2026
GitHub changelog:

- approve is `POST /-/stage/<id>/approve` with `Authorization: Bearer`,
  `npm-auth-type: web`, `npm-command: stage` and `npm-otp`; a 401 carrying
  `authUrl`/`doneUrl` or a `www-authenticate` header mentioning OTP is the
  proof-of-presence challenge;
- OIDC trust tokens can only `stage publish`; `list`, `view`, `approve` and
  `reject` "require interactive authentication and cannot use OIDC tokens";
- stage-only granular tokens cannot approve; approval needs "a maintainer with
  2FA enabled", via the CLI with `--otp` or npmjs.com. There is no unattended
  CI approval, which is why merging the publish PR authorises publication and
  a maintainer still supplies the OTP at dispatch time.

Not verifiable without the live probe (EFF-1455 P1, P3, P5): whether
`NPM_STAGE_TOKEN` can read `GET /-/stage`; the exact status vocabulary; and
whether a granular publish token from a 2FA account plus one TOTP approves
non-interactively, and whether the registry accepts the same TOTP across 31
consecutive approvals inside its 30-second window. If P5 fails, `release
publish` runs unchanged from a maintainer's terminal against a checkout of
`main` (`NPM_APPROVE_TOKEN` and `NPM_OTP` in the environment), and
`publish.yml` becomes the website-dispatch step only. `NPM_STAGE_TOKEN` and
`NPM_APPROVE_TOKEN` are not configured on the repository yet (only
`CHANGESET_GITHUB_TOKEN` and `WEBSITE_DISPATCH_TOKEN` exist).

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

The approval gate, the approval path and the website deployment are
specified above (EFF-1460) and implemented separately; until that lands,
`Registry.listStaged` is used only so that routing skips versions already
awaiting approval.
