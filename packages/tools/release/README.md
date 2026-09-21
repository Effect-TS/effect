# Release

`@effect/release` is the private tool that replaces the changesets GitHub
action for this repository. On every push to `main` it either creates or
updates the version pull request (using `pnpm version -r`, which bumps
manifests, writes changelogs and records the ledger) or, once that pull
request has merged, stages the new versions on npm with `pnpm stage publish`.
It never publishes directly; staged versions become public only when a
maintainer approves them.

```sh
pnpm release plan            # the release plan pnpm derives from .changeset/*.md
pnpm release route           # Version, Stage or Idle, and why
pnpm release run --tag rc    # act on the route (what the workflow calls)
```

`plan` and `route` are read-only (`route` queries the registry for published
versions and, when `NPM_STAGE_TOKEN` is set, the stage queue). `run` pushes a
branch and opens or updates a pull request on the Version route, and uploads
staged versions on the Stage route; it is meant for `.github/workflows/release.yml`.

The behaviour is specified by the tests in `test/` and by
[CONTRACT.md](./CONTRACT.md).
