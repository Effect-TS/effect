# Release spike

`@effect/release-spike` is a private, manually invoked harness that probes npm
staged publishing against a disposable package,
`@effect/release-spike-fixture`. It exists to answer the questions that block
the migration from changesets to `pnpm stage` (EFF-1455): what the registry
reports while a staged package is scanned, which credentials can list, stage and
approve, whether a classic OTP works from a non-interactive process, and whether
provenance survives approval.

It is not part of the release process and never touches a real package: the
`stage` command refuses any directory whose manifest is not the fixture.

Run it from the repository root:

```sh
pnpm release-spike --help
```

Every command appends one JSON line to `tmp/release-spike/findings.jsonl`
(inside this package directory, git-ignored; override with
`RELEASE_SPIKE_FINDINGS`). Tokens come from `NPM_TOKEN` and one-time passwords
from `--otp` or the masked prompt. Both are registered for redaction the moment
they are read and scrubbed from everything the harness prints or writes.

The step-by-step procedure, the maintainer setup it needs, and the expected
outcome of each probe are in [RUNBOOK.md](./RUNBOOK.md).
