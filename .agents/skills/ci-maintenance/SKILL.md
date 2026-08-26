---
name: ci-maintenance
description: GitHub Actions maintenance. Use when authoring or reviewing workflows or composite actions, changing events, permissions, action references, artifacts, setup, or concurrency.
---

Audit the trust boundary before editing. This skill owns GitHub Actions event
semantics, workflow security, permissions, action pinning, setup reuse,
untrusted inputs, timeouts, and concurrency. When root routing also selects
`release-maintenance`, that skill owns release-stage artifact identity,
transformation, and publication correctness; this skill still owns artifact
trust-boundary validation. Use `dependency-maintenance` for non-Action upgrades
and `bundle-analysis` for local bundle measurement.

## Workflow

1. Inspect every affected workflow, composite action, and caller. Use these as
   repository pointers, not universally safe templates:
   - `.github/actions/setup/action.yaml` for standard environment setup.
   - `.github/workflows/check.yml` for ordinary checks, matrices, timeouts, and
     cancelable concurrency.
   - `.github/workflows/snapshot.yml` and
     `.github/workflows/release-queue.yml` for fork approval gates.
   - `.github/workflows/release.yml` for publication permissions, checkout
     credentials, and non-cancelable concurrency.
   - `.github/workflows/bundle-comment.yml` for validating cross-run artifacts
     before a privileged comment.

   This step is complete when all affected jobs and action callers are listed.

2. For each affected job, identify the trigger and activity, actor and fork
   status, workflow-definition revision, checked-out revision, token
   permissions, secrets and other credentials, and every externally controlled
   input. Include artifacts, caches, outputs, PR fields, refs, dispatch inputs,
   generated files, and called actions. State the resulting trust boundary in
   one concrete paragraph. This step is complete when every input and credential
   has a named trust level and consumer.

3. Consult current GitHub documentation whenever event, token, secret,
   permission, checkout, artifact, reusable-workflow, or environment semantics
   affect the design. Start with [workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows),
   [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax),
   and the [secure use reference](https://docs.github.com/en/actions/reference/security/secure-use).
   Repository examples establish local convention; GitHub documentation
   establishes current platform behavior. This step is complete when the audit
   cites the current documentation used for each platform-sensitive decision.

4. Implement the smallest change that preserves the boundary:
   - Keep workflow-level `permissions: {}` and grant only required job-level
     capabilities. Account for every write permission and credential.
   - Reuse `.github/actions/setup` unless the job needs a demonstrably different
     environment. Choose runtime matrices intentionally and give every
     executable job a realistic timeout.
   - Pin external actions and reusable workflows to full commit SHAs, retain a
     same-line readable version comment, and verify the SHA belongs to the
     intended upstream release.
   - Analyze event choice and checkout together. Privileged jobs must not run
     untrusted repository code with secrets or write credentials. Make checkout
     revision and credential persistence intentional.
   - Pass untrusted expressions to scripts through environment variables and
     quote their shell expansions. Validate cross-run data for expected source,
     identity, type, shape, and bounded size before using it in commands,
     outputs, APIs, or comments.
   - Derive concurrency from interruption safety. Cancel replaceable checks and
     previews; preserve publication and irreversible operations until they
     finish.

   This step is complete when each rule is satisfied or a concrete exception is
   recorded with its compensating control.

5. Run the narrowest available YAML or Actions syntax check and the applicable
   repository formatting or lint check. Inspect the full diff and report what
   can only be exercised on GitHub-hosted runners. This step is complete when
   local checks pass and the diff contains only intended behavior.

## Completion audit

Report each item as `pass`, `fail`, or `not applicable`, with file and job
evidence. A `fail` blocks completion.

- Event semantics and checked-out revision align.
- Untrusted code and data cannot reach privileged credentials.
- Workflow permissions default to empty; job permissions are minimal and every
  write is justified.
- External action references are full-SHA pinned with release comments.
- Script inputs use validated, quoted boundaries rather than direct untrusted
  expression interpolation.
- Cross-run artifacts and outputs have source, identity, type, shape, and size
  validation.
- Forks cross the intended approval boundary before privileged work.
- Setup reuse, runtime matrix, and timeout choices are intentional.
- Concurrency matches interruption safety.
- Checkout revision and credential persistence are intentional.
- Local validation passed; GitHub-only verification is identified.

The audit is complete only when every affected job and composite-action caller
is covered, every checklist item has evidence, and no failures remain.
