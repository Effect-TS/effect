---
"effect": patch
"@effect/chat-slack": patch
"@effect/chat-discord": patch
"@effect/chat-whatsapp": patch
"@effect/chat-telegram": patch
"@effect/chat-teams": patch
---

Add unstable `effect/chat` APIs and Slack, Discord, WhatsApp, Telegram and Microsoft Teams adapters for chat bots, with grapheme-safe Markdown streaming, buttons, selects, modals, slash commands, private/deferred command replies, and adapter conformance testing.

Slack webhook and interactivity layers, and the WhatsApp webhook layer, require a `Mac` service. Provide a runtime layer such as `NodeCrypto.layerMac`, or `Mac.layerWebCrypto` with `SecureRandom.layerWebCrypto`.

The Microsoft Teams adapter has not been tested against a live tenant yet, and its buttons, dialogs, commands, `startThread` and `download` stay off unless enabled through its `unverified` option.

`Jwks.makeRemote` accepts a `filter` option that drops raw keys before they are decoded.
