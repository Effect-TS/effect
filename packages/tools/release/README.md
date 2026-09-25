# Release

`@effect/release` is the private tool that replaces the changesets GitHub
action for this repository. On every push to `main` it either creates or
updates the version pull request (using `pnpm version -r`, which bumps
manifests, writes changelogs and records the ledger) or, once that pull
request has merged, stages the new versions on npm with `pnpm stage publish`.
It never publishes directly; staged versions become public only when a
maintainer approves them.

```sh
pnpm release plan                                # the release plan pnpm derives from .changeset/*.md
pnpm release route                               # Version, Stage or Idle, and why
pnpm release run --tag rc                        # act on the route (what release.yml calls)
pnpm release readiness --tag rc [--dry-run]      # open "Publish Packages (rc)" once every upload validated
pnpm release publish --expect-identity <id>      # approve the staged versions the merged manifest pins
```

`plan` and `route` are read-only (`route` queries the registry for published
versions and, when `NPM_STAGE_TOKEN` is set, the stage queue). `run` pushes a
branch and opens or updates a pull request on the Version route, and uploads
staged versions on the Stage route; it is meant for `.github/workflows/release.yml`.
`readiness` is what `.github/workflows/release-readiness.yml` calls on a
schedule: it commits the release manifest (`.release/manifest.json`) on
`publish-release/main` and opens or refreshes the publish pull request, or
reports why the release is not ready. It requires `NPM_STAGE_TOKEN` so a
missing queue credential cannot look like a missing release. `publish`
rechecks the whole release against the manifest read from `origin/main`,
approves only the pinned staged uploads, waits until every version is served,
and prints the revision the website should deploy. It needs
`NPM_APPROVE_TOKEN` and a one-time password
in `NPM_OTP`; approval cannot run unattended, see `CONTRACT.md`.

The behaviour is specified by the tests in `test/` and by
[CONTRACT.md](./CONTRACT.md).
