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

The behaviour is specified by the tests in `test/` and by
[CONTRACT.md](./CONTRACT.md). The `src/` modules currently hold the contract
only; every member raises `not implemented` until the implementation run
fills it in.
