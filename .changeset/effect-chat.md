---
"effect": patch
"@effect/chat-slack": patch
"@effect/chat-discord": patch
---

Add unstable `effect/chat` APIs and Slack/Discord adapters for chat bots, with grapheme-safe Markdown streaming, buttons, selects, modals, slash commands, private/deferred command replies, and adapter conformance testing.

Slack webhook and interactivity layers require a `Mac` service. Provide a runtime layer such as `NodeCrypto.layerMac`, or `Mac.layerWebCrypto` with `SecureRandom.layerWebCrypto`.
