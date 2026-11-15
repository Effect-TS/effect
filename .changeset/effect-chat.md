---
"effect": patch
"@effect/chat-slack": patch
"@effect/chat-discord": patch
---

Add unstable `effect/chat` APIs and Slack/Discord adapters for chat bots, with grapheme-safe Markdown streaming, buttons, selects, modals, slash commands, private/deferred command replies, and adapter conformance testing.

### Migrating from earlier PR snapshots

- Handle `CommandInvoked` in interaction handlers and exhaustive matches, and `Respond`/`Defer` results from `handle`. `ModalSubmitted.messageId` is optional for command-opened modals.
- Implement `followUp` in custom adapters. Adapters without commands must fail it with `Unsupported` naming `commands`; unsupported actions must fail with `Unsupported` naming `buttons` or `selects`. These conformance rules run against every adapter. `ChatTest` includes `commands` and `ephemeral` by default.
- Supply `replyTo.isSelf` wherever `replyTo.authorId` is set; `ChatMessage.repliesToSelf` reads it. `ChatMarkdownError.remainingFence` identifies the fence around unposted text.
- Command replies are private by default and never notify mentions. Private-answer IDs identify interactions, not addressable messages. Use one `Chat.followUp` per deferral: repeats create another message on Slack, overwrite on Discord, and fail in `ChatTest`.
- Configure Slack commands with the `commands` scope and `layerInteractivity` Request URL. Register Discord commands yourself using `DiscordChat.commandRequests`; the adapter does not register them.
