## Relay contract tests

Run from the repository root:

```sh
nix develop -c node --test scripts/test/effect-bot.test.mjs
```

These standalone Node tests exercise `scripts/effect-bot.mjs` with mocked HTTP;
they do not change the library's Vitest configuration or require live credentials.

### Helper interface

Export async `relayComment(options)`. Inputs:

- `eventName` and `event`: GitHub event name and parsed JSON, never shell source.
- `githubToken`: workflow credential for permission lookup and reactions.
- `webhookUrl` and `secret`: configured relay endpoint and HMAC secret.
- `fetch`: injected Fetch-compatible function; all HTTP goes through it.
- `isCommand(body)` and `deliveryKey(eventName, event)`: optional injected policies.
  Original contract fixtures use injected policies; follow-up cases omit these
  overrides to exercise production defaults.

Forwarded requests return the webhook response status. Configuration, permission
lookup, and webhook HTTP errors reject the promise. Reaction failure must not
turn an admitted delivery into failure or resend it.

The trimmed payload assertion covers
`action, repo, number, isPullRequest, commentId, commentUrl, body, author`,
plus `path, line` for inline reviews. `action: "created"` is required for
server event filtering. HMAC covers the exact serialized bytes sent.

### Scope and remaining gates

Coverage includes filtering, built-in maintainer roles and lookup failures,
missing config, malicious text preservation, payload/HMAC, PR/review metadata,
stable keys, admission-aware reactions, and independent reaction failure.
Fork and unknown/deleted-head inline reviews are rejected before network access;
fork PR conversation comments remain supported.

**Production-policy tests describe current provisional behavior, not approved
policy:** case-sensitive command at the start, whitespace/end boundary,
repo/event/comment delivery keys, and no custom-role inference. Tim's approval
is still required; an approved policy change should update these fixtures.

The workflow test is a deliberately strict static allowlist of trusted checkout
and execution steps: fixed repository, default-branch ref, sparse helper checkout,
no persisted credentials, pinned external actions, and a literal Node command
with no event-text shell interpolation. Adding/changing a step requires reviewing
and updating the allowlist. This is a regression tripwire, not a YAML execution
engine or proof that GitHub sources the workflow definition from a trusted ref.
Review-comment workflows can themselves come from a merge ref, which remains a
privileged-code review boundary.

Mocks do not prove durable/concurrent server dedupe, fork secret availability,
actual GITHUB_TOKEN lookup permissions, or end-to-end delivery. Posting identity/
token scope, policy approval, provisioning, and live Actions validation of
admission, edit/rerun dedupe, and non-looping replies remain pre-merge gates.
The helper must exist on the trusted default branch for live validation.
