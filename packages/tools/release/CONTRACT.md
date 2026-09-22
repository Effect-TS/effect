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
  Making staged versions public is a second pull request, "Publish Packages",
  described under "Publish approval" below.

## Modules

| Module               | Role                                                                                                                                                      | Backed by                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `ReleasePlan`        | Types for pnpm's release plan; parsers for `pnpm version -r --dry-run` text and `pnpm version -r --json`; `effectiveReleases`, `isEmpty`, `prereleaseTag` | pure                                          |
| `Workspace`          | Public/private packages with their manifest versions                                                                                                      | `pnpm -r ls --depth -1 --json`                |
| `Pnpm`               | `dryRunPlan`, `applyVersions`, `stagePublish`                                                                                                             | `ChildProcessSpawner`, stdin detached         |
| `Git`                | `headSha`, `resetBranch`, `commitAll`, `commitPaths`, `showFile`, `pushForce`, `checkout`                                                                 | `git` via `ChildProcessSpawner`               |
| `GitHub`             | `findPullRequest`, `createPullRequest`, `updatePullRequest`                                                                                               | `gh` via `ChildProcessSpawner`, `GH_TOKEN`    |
| `Registry`           | `isPublished`, `listStaged` (read-only)                                                                                                                   | `HttpClient`; `NPM_STAGE_TOKEN` for the queue |
| `Routing`            | `decide`: Version, Stage or Idle                                                                                                                          | pure                                          |
| `VersionPullRequest` | `title`, `body`, `sync`                                                                                                                                   | `Git`, `Pnpm`, `GitHub`                       |
| `Release`            | `plan`, `route`, `run` orchestration                                                                                                                      | all of the above                              |
| `Cli`                | `release plan`, `release route`, `release run --tag <tag> [--expect Version\|Stage] [--dry-run]`, `release readiness`, `release publish`                  | `Release`, `Publication`                      |
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

`release.yml` never publishes or deploys the website. Website deployment
follows publication, which is the publish workflow's job (see "Publish
approval" below); until that workflow lands, merging this change stops
release-time website deployments. The existing `deploy-website` action and
`WEBSITE_DISPATCH_TOKEN` are kept for it.

The `rc` tag is a workflow constant until the fixed group leaves the `rc`
lane.

## Publish approval

Merging "Version Packages (rc)" stages a release. Making it public is a
second pull request, "Publish Packages (rc)", that the readiness workflow
opens only once every staged version has passed the registry's validation.
Merging that PR authorises publication of exactly the staged tarballs it pins.
The tests in `test/ReleaseManifest.test.ts`, `test/Readiness.test.ts`,
`test/PublishPullRequest.test.ts`, `test/StageApproval.test.ts`,
`test/Publication.test.ts`, `test/PublishCli.test.ts` and
`test/PublishWorkflow.test.ts` are the executable contract. The tool, the CLI
and `release-readiness.yml` implement it; `publish.yml` does not exist yet
(see "Credentials and what is still unverified" below), so its two workflow
tests fail until a secure OTP handoff is implemented.

### Modules

| Module               | Role                                                                                              | Backed by                                 |
| -------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `ReleaseManifest`    | `fromStaged`, `encode`, `decode`, `identity`; `MANIFEST_PATH`, `LEDGER_PATH`                      | pure                                      |
| `Readiness`          | `assess`: `Ready` or `NotReady` with blockers; the status vocabulary sets                         | pure                                      |
| `PublishPullRequest` | `title`, `body`, `identityFromBody`, `sync`                                                       | `Git`, `GitHub`, `FileSystem`             |
| `StageApproval`      | `viewStaged`, `approve` (the only registry writes in the tool)                                    | `HttpClient`; `NPM_APPROVE_TOKEN`         |
| `Publication`        | `readiness` and `publish` orchestration                                                           | all of the above, `Registry`, `Workspace` |
| `Cli`                | `release readiness --tag <tag> [--dry-run]`, `release publish --expect-identity <id> [--dry-run]` | `Publication`                             |

`Git` also provides `lastCommitTouching(path)`, `showFile(ref, path)` and
`commitPaths(message, paths)`. The CLI requires both `Release` and
`Publication` statically, and `bin.ts` provides them.

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
2. reads the manifest from `origin/main`. Approvable or pending uploads are
   an authorised unfinished release → `InProgress`, no new PR. A pinned
   upload that has left the queue is also `InProgress` while that version is
   still the workspace version. `Stalled` is only a blocked, rejected,
   deleted or unknown upload that is still current, including when a missing
   item sits beside one; the blockers are reported and no PR is opened.
   Rejecting a still-current upload does not recover the release. The pinned
   id is gone, so the package is missing while that version is still current,
   and readiness holds as `InProgress`. Re-staging the same version gets a
   new id, which cannot enter the merged manifest. The recovery that works
   is a version bump that clears those versions from the workspace. Once every
   remaining version has left the workspace, and nothing left is approvable or
   pending,
   readiness continues with the next release. Merging the next publish PR
   replaces the old manifest. A still-listed upload at an older version is
   still a stale-version failure;
3. any release-set package with no upload at its version → `Incomplete`;
4. otherwise builds the manifest (`fromStaged` fails on a stale upload at
   another version, exactly like `Routing`), assesses readiness and calls
   `PublishPullRequest.sync`.

`sync` never touches git while the release is not ready: with an open PR it
rewrites the title to `Publish Packages (rc) [not ready]` and lists the
blockers in the body (`Marked`); without one it does nothing (`Skipped`).
When ready, an open PR that already carries this identity is left alone
(`NoChanges`), so repeated runs are no-ops; otherwise the branch
`publish-release/main` is reset from `main`, only the manifest is committed
as "Publish Packages", the branch is force-pushed, and the PR is created or
updated. Closing the PR does not reject a release; a later readiness run can
create it again while the staged items remain ready. The step
holds `NPM_STAGE_TOKEN` (queue reads) and `CHANGESET_GITHUB_TOKEN` (branch
push and PR) and nothing else; the job has no `id-token` permission and runs
no build.

### Publication

`release publish --expect-identity <id>` is the publication step. The tests
specify `publish.yml` as `workflow_dispatch` only, running only on `main`,
with `contents: read`, no build, version or stage steps, and two inputs: the
identity from the merged PR and a one-time password. **That workflow is not
implemented**: it hands a TOTP to Actions through a dispatch input, which is
visible in the run's metadata, and a merge-triggered workflow has no place for
a maintainer-supplied OTP. A secure approval path is still needed. The command
itself is complete and runs the same way from a maintainer's terminal against
a checkout of `main`. It reads the OTP from `NPM_OTP` (never a flag, so it is
not on argv) and:

1. reads and decodes `MANIFEST_PATH` from `origin/main`; its identity must
   equal the expected one, otherwise it fails before any registry call. This
   ties approval to one merged manifest even when the command runs from
   another checkout;
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

Packages already public are verified, never re-approved, so running the
command again with the same identity and a fresh OTP finishes a partially
published release. If a pinned item has left the queue, `viewStaged` is
consulted. An approvable status is approved with the rest of the release. A
pending or blocked status fails at once and names that state. Any other
status, including one the contract does not classify, keeps the existing
wait: the command checks that the exact staged item still exists and waits
for the version to become public before approving anything else. After that
wait the queue is listed again. A fresh listing wins for any id it contains,
and an item in that listing that blocked during the wait fails the release
with nothing approved. An upload that was approvable only because the listing
missed it is viewed again. It is kept for approval only when that view is
still approvable and the fresh listing does not contain it. If the version
became public during the wait, it is skipped and not approved. Pending,
blocked, unknown, or a 404 fails the release at once with nothing approved.
It never infers approval from a missing queue entry. When everything is
already public it returns
`AlreadyPublished` with the same website revision, so a failed website dispatch
is retried by running it again. The specified workflow writes
`published=true` and `revision=<sourceSha>` to its outputs and runs the
website step only on `published == 'true'` with channel `v4` and that
revision; until it exists, the website is dispatched by hand with the
`websiteRevision` the command prints.

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

Both readiness and publication require `NPM_STAGE_TOKEN`; they fail before
registry or GitHub calls when it is absent rather than treating the release as
missing. Not verifiable without live registry probes: whether
`NPM_STAGE_TOKEN` can read `GET /-/stage`; the exact status vocabulary; and
whether a granular publish token from a 2FA account plus one TOTP approves
non-interactively, and whether the registry accepts the same TOTP across 31
consecutive approvals inside its 30-second window. If non-interactive approval
fails, `release publish` runs unchanged from a maintainer's terminal against a
checkout of `main` (`NPM_APPROVE_TOKEN` and `NPM_OTP` in the environment), and
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

A merge-triggered approval workflow and automatic website deployment remain
out of scope until there is a secure way to supply npm's required one-time
password. `Registry.listStaged` also lets routing skip versions already
awaiting approval.
