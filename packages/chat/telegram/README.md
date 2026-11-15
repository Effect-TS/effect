# @effect/chat-telegram

A [Telegram](https://telegram.org) adapter for `effect/chat`, over the Bot API. It includes a webhook endpoint, a long-polling loop, a pure update normaliser, and the address helpers.

This package is private, and it is not released. Nothing in it has run against Telegram yet, the default capabilities included: rich posts and edits, the escaping, link previews and notifications are as unverified as files, buttons and commands. It stays private until the base live checks below pass (1, 2, 3, 4, 5, 7, 10, 11, 15, 16 and 17). Passing unit tests do not lift that. Releasing it then means removing `private`, adding the package to the release setup, and adding its changeset.

## Setup

Create a bot with [@BotFather](https://t.me/BotFather) and keep its token. Pick one transport: a webhook, or polling for a long-running process. Telegram allows only one at a time.

```ts
import * as TelegramChat from "@effect/chat-telegram/TelegramChat"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"

const token = Redacted.make("<bot token>")
const secretToken = Redacted.make("<32 to 256 characters of A-Za-z0-9_->")

const Webhook = TelegramChat.layerWebhook({ path: "/telegram", secretToken }).pipe(
  Layer.provideMerge(TelegramChat.layer({ token }))
)

const Polling = TelegramChat.layerPolling().pipe(
  Layer.provideMerge(TelegramChat.layer({ token }))
)
```

`TelegramChat.layer` needs `HttpClient` and the chat `Registry`. `TelegramChat.layerWebhook` also needs `HttpRouter` and a `ChatHandler`, and `TelegramChat.layerPolling` a `ChatHandler`. Clicks and commands go to `ChatInteraction.Handler` when one is in context.

Register the webhook once with `TelegramChat.setWebhook({ url, secretToken })`, which sets exactly the `allowed_updates` the adapter reads. The adapter never calls it, or `deleteWebhook`, on its own. Polling fails to start with `InvalidRequest` and detail `conflict` while a webhook is set.

`environment: "test"` uses Telegram's [test environment](https://core.telegram.org/bots/features#dedicated-test-environment). `apiUrl` points at a local Bot API server.

## Capabilities

By default the descriptor advertises `edit`, `delete`, `replyTo`, `download`, `getThread` and `getUser`, alongside `post`. Posts and edits are rich messages (`sendRichMessage`). `getUser` needs `in`, the chat to look the user up in.

These capabilities are implemented but stay off until their live checks pass, on top of the base checks. Turn them on with the `unverified` option, at your own risk:

| Option     | Turns on   | Live checks, besides the base ones |
| ---------- | ---------- | ---------------------------------- |
| `files`    | `files`    | 6                                  |
| `buttons`  | `buttons`  | 8                                  |
| `commands` | `commands` | 9                                  |

An edit of a message posted with files may drop its media. Live check 6 decides whether that is so.

Not supported in this version: `ephemeral`, `fetchMessage`, `history`, `opener`, `startThread`, selects, modals, native streams, reactions (outbound and as events), and typing. A private answer to a command is refused through `ChatInteraction.Handler.refused` with `Unsupported`, and is never posted in public. A `message_reaction` update goes to `onUnhandled`.

Updates from business connections, a channel's direct messages and guest mode are never dispatched: they go to `onUnhandled`. A business chat's button is answered so the client stops waiting.

## Security

- The bot token is in the URL path of every Bot API call. The adapter turns off the HTTP client's own spans for these calls, writes its own span with the path as `/bot<redacted>/{method}`, never follows a redirect, and keeps the token out of every error.
- The webhook needs the `X-Telegram-Bot-Api-Secret-Token` header, compared in constant time, before it reads the body. Server spans record no headers by default. An app that records them (`HttpMiddleware.TracerHeaderFilter`) must add `TelegramChat.secretHeader` to `Headers.CurrentRedactedNames`, keeping the names already there, in the layer it serves. `Layer.provide` on the webhook alone does not reach the server span, `Layer.provideMerge` does:

  ```ts
  import * as Effect from "effect/Effect"
  import * as Headers from "effect/http/Headers"

  const RedactSecret = Layer.effect(
    Headers.CurrentRedactedNames,
    Effect.gen(function*() {
      return [...yield* Headers.CurrentRedactedNames, TelegramChat.secretHeader]
    })
  )

  const App = Webhook.pipe(Layer.provideMerge(RedactSecret))
  ```
- Consumer Markdown is escaped so that it reaches no raw HTML, image, math, spoiler, or link outside `http`, `https` and `mailto`. A `tg://user` link stays only for users listed in `withPostOptions({ notify: { users } })`.
- A click is dispatched only when its `data` matches a button in Telegram's own copy of the message. That shows the bot put the button there, not that it is still current or that this user may press it.

## Redelivery

Telegram sends an update again until it gets a 200, clicks and commands included. Polling sees it again until the offset moves past it. The webhook answers 503 when the `ChatHandler` fails `NotAccepted` or passes `deadline` (10 seconds), and Telegram retries. Polling retries an update up to `maxAttempts` times, then logs it and moves on.

Clicks and commands are different. Their handlers have a deadline of their own, and when it passes the update counts as answered: the webhook answers 200 and polling moves its offset. Telegram does not send it again.

- A click handler has `clickDeadline` (2.5 seconds). Then the click is answered so the button stops spinning, and the handler keeps running, detached. If it fails or the process dies after that, nothing repeats the click.
- A command handler has `commandDeadline` (10 seconds). Then it is interrupted. If it had not committed, the command is lost.
- A handler that fails, rather than passing its deadline, is answered and refused through `ChatInteraction.Handler.refused`, not redelivered.

A handler whose work must not be lost or done twice keys it with `TelegramChat.deliveryKey(event.raw, { botId })`. The adapter keeps no store, so this is the consumer's to do:

1. In one transaction, insert the key under a unique constraint, together with a work item that a worker picks up, also after a crash.
2. Return only after the commit: success from the `ChatHandler`, `Ack` for a click, `Defer` for a command. The worker does the work, and for a command sends the `followUp`.
3. When the insert hits the constraint, the work is already safe: answer the same way at once. A repeated command answers `Defer`, never `Ack`, which would turn it into `MessageCreated`.

A crash before the commit leaves nothing, and the repeat does the work. A concurrent repeat waits on the constraint for the first transaction. This holds only while the transaction commits within the deadline above: for clicks and commands a late commit is not repeated. External side effects, such as a payment, still need their own idempotency key (the delivery key works). Nothing here gives exactly-once effects.

## Live checks

None of these have run yet. Most run in the test environment, with a test bot, two test users and a forum supergroup where the bot is an admin. Check 17 repeats the ones that matter on production.

1. Rich messages render on current clients, and what older ones show.
2. The rich-Markdown dialect and its escapes, matching the escaping above.
3. The limits: what 32,768 counts, what a block is, nesting and table columns.
4. Link previews on rich posts and edits, and whether they can be turned off.
5. Whether a plain `@user`, a `tg://user` link and a `text_mention` notify.
6. Rich-message media over multipart `attach://`, and edits of a message with media.
7. Webhook and polling redelivery after a 503 or a dropped connection.
8. Callback queries: the server's copy of `reply_markup`, forged `data`, delayed clicks.
9. Ephemeral commands, with an author and a bystander.
10. The error responses behind the error mapping.
11. Forum topics and the General topic.
12. Reaction updates.
13. Edit pacing and `retry_after`.
14. `getChatMember` as a non-admin.
15. Whether a plain `@bot` mention reaches a bot in privacy mode.
16. Inbound rich messages.
17. A production smoke check of 1, 4, 5, 9, 13 and 15.

## Links

- [Website](https://effect.website): documentation, guides, and news.
- [Discord](https://discord.gg/effect-ts): ask questions, share what you're building, and talk to the core team.
- [Issues](https://github.com/Effect-TS/effect/issues): bug reports and feature requests.
