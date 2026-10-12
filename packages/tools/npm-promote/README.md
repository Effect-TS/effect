# npm promote

`@effect/npm-promote` moves the `latest` dist-tag to a release that
`changeset publish` put under `staging`. It waits until npm's abbreviated
metadata lists the target version of every public workspace package, so fresh
installs never resolve an `@effect/*` version that needs an `effect` the
registry does not serve yet.

Preview what it would do from the repository root:

```sh
node packages/tools/npm-promote/src/bin.ts --dry-run
```

Each run:

1. Lists the non-private workspace packages and their versions at the
   checked-out revision.
2. Fetches each package's abbreviated metadata from `registry.npmjs.org`. If any
   target version is missing, nothing is promoted.
3. Runs `npm dist-tag add <name>@<version> latest`, `effect` first, for every
   package whose `latest` is lower than the target. A higher `latest` is never
   moved back, so a run that failed halfway is finished by the next one.
4. Closes the tracking issue if one is open.

When the version bump commit is older than `--overdue-after-hours` (12 by
default) and the release is still not visible, the tool checks each pending
version's own registry document and opens or updates a single tracking issue.
It lists versions missing from npm (404), versions published but not visible
yet, and versions whose check failed. Prerelease versions are never promoted.

`--dry-run` reads the registry and prints the plan. It never moves dist-tags or
touches GitHub issues.

## Workflow

`.github/workflows/npm-promote.yml` runs every 10 minutes and after each
`Release` run on `main`. It deploys the website after a promotion moved at
least one `latest` tag. Setting the `NPM_PROMOTE_PAUSED` repository variable to
`true` skips the job, which keeps a bad release on `staging`.

The job runs in the `npm-promote` environment, which holds `NPM_PROMOTE_TOKEN`:
a granular npm token with write access to `effect` and `@effect/*` on a bot
account. npm caps these tokens at about 90 days, so they need rotating.
