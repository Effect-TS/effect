## Relay contract tests (tests-only handoff)

Run from the repository root:

```sh
nix develop -c node --test scripts/test/effect-bot.test.mjs
```

The tests intentionally fail until a later run adds `scripts/effect-bot.mjs`.
No production helper, workflow, secrets, or autopilot are supplied here. These
standalone Node tests do not change the library's Vitest configuration.

### Proposed helper interface

Export async `relayComment(options)` from that module. Inputs:

- `eventName` and `event`: GitHub event name and parsed JSON, never shell source.
- `githubToken`: workflow credential for permission lookup and reactions.
- `webhookUrl` and `secret`: configured relay endpoint and HMAC secret.
- `fetch`: injected Fetch-compatible function; all HTTP goes through it.
- `isCommand(body)` and `deliveryKey(eventName, event)`: injected policy functions.
  Fixtures deliberately do not implement production command syntax or key composition.

Return an object with `status` matching the webhook response for forwarded
requests. Local ignored/rejected results are deliberately not prescribed.
Configuration, permission lookup, and webhook HTTP errors reject the promise.
Reaction failure must not turn an admitted delivery into failure or resend it.

The proposed trimmed JSON schema is demonstrated by the exact payload assertion:
`action, repo, number, isPullRequest, commentId, commentUrl, body, author`,
plus `path, line` for inline review comments. Property names are a local helper
interface proposal, not a pre-existing Multica schema; `action: "created"` is
required for the server's event filtering. Sign the serialized bytes sent.

### Scope and remaining gates

Coverage: command/event filtering, settled built-in maintainer roles and lookup
failure, missing config, malicious text preservation, payload/HMAC headers,
PR/review context, forwarding a stable injected key, admission-aware reactions,
and independent reaction failure. All HTTP is mocked; no live credentials needed.

Fork-review support, command boundaries/case, custom-role policy, and delivery-key
composition remain provisional for Tim's approval. Review fixtures are same-repo
only and say nothing about fork secret availability. The key test proves forwarding,
not durable or concurrent server deduplication. Malicious-text tests prove data
preservation, not that an as-yet unwritten workflow avoids shell interpolation.

Posting identity/token scope remains a pre-merge gate. A future workflow review
and live Actions smoke test must verify actual GITHUB_TOKEN permission lookup,
secret availability, rerun/edit behavior, and replies that cannot retrigger the
command. This relay helper does not post agent replies.
