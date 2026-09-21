# Release spike runbook

This runbook drives the `@effect/release-spike` harness through the probes that
settle the open questions in EFF-1455 before any production release workflow is
changed. Everything here acts on `@effect/release-spike-fixture`, a disposable
package, and on short-lived credentials scoped to it.

## Ground rules

- Nothing in this runbook touches a real Effect package, the `Release` workflow,
  or org-level npm settings. If a step would, stop.
- Every fixture version is throwaway. Use `0.0.0-spike.N` and tag `spike`.
- Secrets never go into files, shell history you keep, issue comments, or
  workflow inputs. The harness reads the token from `NPM_TOKEN`, the OTP from a
  masked prompt, and scrubs both from its output and its findings log.
- The findings log (`tmp/release-spike/findings.jsonl` inside the package
  directory) contains registry responses, timings and pnpm output only. Read it
  once before attaching it to the issue anyway.

## What we are trying to learn

| #  | Question                                                                                                                                 | Probe  |
| -- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Q1 | What `status` values does a staged item go through, and how long does the scan take?                                                     | P3, P4 |
| Q2 | Can a token that CI could hold (stage-only granular token) call `GET /-/stage`? Can OIDC?                                                | P1, P4 |
| Q3 | Does the registry refuse re-staging an already staged version, and how?                                                                  | P2     |
| Q4 | Does `stage approve --otp` work from a non-interactive process with a granular token, and is one OTP accepted for consecutive approvals? | P5     |
| Q5 | Does provenance generated at staging survive approval? Is an `approver` recorded?                                                        | P6     |
| Q6 | Which package publishing-access setting still allows tokens to stage?                                                                    | P2     |

## Maintainer setup (one time)

Do this from a maintainer machine with an npm account that has 2FA. About
thirty minutes.

1. **Create the fixture on npm.** Staging and trusted-publisher configuration
   both require the package to exist. From the repository root:

   ```sh
   cd packages/tools/release-spike/fixture
   pnpm publish --tag spike --no-git-checks
   cd -
   ```

   This publishes `@effect/release-spike-fixture@0.0.0` (2FA prompt). It is the
   only direct publish in this runbook.

2. **Package settings on npmjs.com** (`@effect/release-spike-fixture`,
   Settings):
   - Publishing access: pick "Require two-factor authentication and disallow
     tokens", the setting intended for production packages. P2 tells us
     whether stage-only tokens still work under it; if not, note it and retry
     P2 once with "Require two-factor authentication or an automation or
     granular access token with bypass".
   - Trusted publisher: add a GitHub Actions publisher with organization
     `Effect-TS`, repository `effect`, workflow filename `release-spike.yml`,
     environment empty. Leave direct `npm publish` disabled (stage-only is the
     default).

3. **Granular access tokens** (npmjs.com, Access Tokens, Generate New Token,
   Granular). Both scoped to `@effect/release-spike-fixture` only, no 2FA
   bypass, seven-day expiry:
   - `spike-stage`: Read and write (stage only). Used for P1 to P4.
   - `spike-approve`: Read and write (publish and stage). Used for P5 and P7.

   Load a token into the shell without echoing it, and drop it when done:

   ```sh
   read -rs NPM_TOKEN && export NPM_TOKEN
   # ... probes ...
   unset NPM_TOKEN
   ```

4. **Authenticator.** The approving maintainer needs TOTP-based 2FA. A
   security-key-only account cannot supply `--otp`; if that is your setup,
   record it as a finding (it means CI approval with a token is impossible for
   that account) and do P5 on npmjs.com instead.

5. **GitHub.** P4 dispatches `.github/workflows/release-spike.yml`. GitHub only
   offers `workflow_dispatch` for workflows that exist on the default branch, so
   the PR that adds the harness must be merged before P4. The workflow defaults
   to a dry run and only stages the fixture, so merging it is safe.

## Probes

Run every command from the repository root. Each one appends to the findings
log; `pnpm release-spike report` summarises it at any point.

### P0. Sanity, no credentials

```sh
pnpm release-spike list --anonymous
pnpm release-spike stage --dry-run --set-version 0.0.0-spike.0
git checkout -- packages/tools/release-spike/fixture/package.json
```

Expected: `GET /-/stage -> 401`, and a dry-run pack that exits 0 without
uploading. Both were verified while building the harness.

### P1. Can a stage-only token list staged items? (Q2)

With `spike-stage` in `NPM_TOKEN`:

```sh
pnpm release-spike list --package @effect/release-spike-fixture
```

Expected: HTTP 200 and an empty list. A 401 or 403 means a stage-only token
cannot drive the CI gate; repeat once with `spike-approve` to see whether any
granular token can, and record both.

### P2. Stage from a non-TTY with a token, twice (Q3, Q6)

Still with `spike-stage`:

```sh
pnpm release-spike stage --set-version 0.0.0-spike.1 --tag spike --repeat 2
git checkout -- packages/tools/release-spike/fixture/package.json
```

Expected: attempt 1 exits 0 and prints a stage id; attempt 2 fails. The
findings entry for attempt 2 holds the exact error the registry returns for a
duplicate staged version, which the future stage job must recognise and skip.
If attempt 1 is refused with a policy error, revisit step 2 of the setup.

Keep the stage id; call it `ID1`.

### P3. Watch the scan (Q1)

```sh
pnpm release-spike watch ID1
pnpm release-spike view ID1
```

Expected: the status starts at `validating` and leaves it within roughly five
to fifteen minutes. The findings entry records every transition with timing,
the final status word (we expect `staged`), and every field name the registry
returns beyond the ones the harness models. Those exact strings are what the
production gate will be written against.

### P4. Stage through trusted publishing with provenance (Q1, Q2, Q5)

After the harness PR is merged, dispatch "Release spike (manual)" on GitHub
with:

- version `0.0.0-spike.2`
- tag `spike`
- dry-run **off**
- probe-list on

Expected: the stage step exits 0 and prints a stage id (`ID2`); the probe-list
step fails, which confirms an OIDC-only job cannot query the stage queue. Download
the `release-spike-findings-*` artifact. Then locally:

```sh
pnpm release-spike watch ID2
```

### P5. Approve two items from a non-TTY with one OTP (Q4)

Load `spike-approve` into `NPM_TOKEN`. Have the authenticator ready, then:

```sh
pnpm release-spike approve ID1 ID2
```

The harness asks for the OTP once (masked), runs `pnpm stage approve` for each
id with stdin detached, and records exit code, duration and the scrubbed
stderr per id. Read the result as follows:

- both succeed: a token plus a fresh OTP can approve from CI, and one OTP is
  reusable across a short batch;
- first succeeds, second fails on OTP: OTP reuse is refused, so a CI batch of
  32 approvals would need a new code per package and cannot be non-interactive;
- first fails with a web-authentication challenge or 401: token-backed
  approval is not possible at all; approval stays local or on npmjs.com.

If P5 fails, approve `ID2` on npmjs.com so P6 still has a provenance-carrying
version to inspect.

### P6. Provenance and approver after approval (Q5)

```sh
pnpm release-spike attestations @effect/release-spike-fixture 0.0.0-spike.2
pnpm release-spike attestations @effect/release-spike-fixture 0.0.0-spike.1
```

Expected for `spike.2` (staged by OIDC with `--provenance`): `distAttestations`
present, a `https://slsa.dev/provenance/v1` predicate type, and an `approver`
inside `npmUser`. `spike.1` was staged with a token and should have no
provenance; it is the control.

### P7. Reject requires 2FA (optional)

```sh
pnpm release-spike stage --set-version 0.0.0-spike.3 --tag spike
git checkout -- packages/tools/release-spike/fixture/package.json
pnpm release-spike reject ID3
```

Confirms the cleanup path the future stage job will document, and whether
`reject` accepts the same OTP handling as `approve`.

### P8. Cleanup

1. `pnpm release-spike list --package @effect/release-spike-fixture` and reject
   anything still staged.
2. Deprecate the fixture versions so nobody installs them by accident:
   `npm deprecate @effect/release-spike-fixture@"*" "throwaway release spike"`.
3. Delete both granular tokens on npmjs.com and `unset NPM_TOKEN`.
4. Leave the trusted publisher in place if a second round is likely; otherwise
   remove it.
5. `git checkout -- packages/tools/release-spike/fixture/package.json`.

## Reporting back

Run `pnpm release-spike report`, skim `tmp/release-spike/findings.jsonl` for
anything that should not be shared, then attach it to EFF-1455 with a short
answer to Q1 through Q6. The production design in that issue is written so
that each answer maps to one decision: the gate's status vocabulary (Q1), which
token the gate job needs (Q2), the skip rule in the stage job (Q3), whether the
approval workflow gets an OTP input at all (Q4), and whether `--provenance`
stays on the staging command (Q5).
