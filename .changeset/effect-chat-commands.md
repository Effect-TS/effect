---
"effect": patch
---

Add slash commands and private replies to `effect/chat`. `ChatInteraction.command` defines a command with at most one text argument, which arrives as `CommandInvoked` and goes to `Handler.command`. A command handler answers with `respond`, `defer` or a modal's `open`, and `respond` and `defer` are private by default. `Chat.followUp` sends the answer a `Defer` promised, within `limits.followUpAge`. `ChatTest` gains `command`, a `submit` and `interact` that take a command, the hook's optional `command` and the `command/*` rules. On a command's private answer, a click's `messageId` names where the click came from and no message `edit`, `delete` or `fetchMessage` can reach. Send one `followUp` per `Defer`: a second posts another message on Slack, replaces the first on Discord and fails in `ChatTest`.

Breaking for code written against the unreleased `effect/chat` APIs:

- `ModalSubmitted.messageId` is optional, since a modal a command opened has no message. The typed submit's `messageId` is `string | undefined`, and `checkInteraction` no longer requires it.
- `Handler` needs a `command`, and `refused` can be given a `CommandInvoked`.
- `Interaction` gains `CommandInvoked`, and `handle` can give `Respond` and `Defer`.
- `Capability` gains `commands` and `ephemeral`, and `ChatTest`'s default capabilities include both.
- `Ops`, `ChatAdapter` and the `Chat` service gain `followUp`. A third-party adapter stops compiling until it has one: one without commands fails `Unsupported` naming `commands`.

The conformance rule `unsupported/commands` runs against every adapter, without a new capability. A third-party adapter whose `followUp` does anything but fail `Unsupported` naming `commands` will start failing it.
