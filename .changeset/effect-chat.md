---
"effect": patch
"@effect/chat-slack": patch
"@effect/chat-discord": patch
"@effect/chat-whatsapp": patch
---

Add unstable `effect/chat` APIs and Slack, Discord and WhatsApp adapters for chat bots, with grapheme-safe Markdown streaming, buttons, selects, modals, slash commands, private/deferred command replies, and adapter conformance testing.

Slack webhook and interactivity layers, and the WhatsApp webhook layer, require a `Mac` service. Provide a runtime layer such as `NodeCrypto.layerMac`, or `Mac.layerWebCrypto` with `SecureRandom.layerWebCrypto`.

`Jwks.makeRemote` accepts a `filter` option that drops raw keys before they are decoded.
