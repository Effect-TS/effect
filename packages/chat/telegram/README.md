# @effect/chat-telegram

A [Telegram](https://telegram.org) adapter for `effect/chat`, over the Bot API. It includes a webhook endpoint, a long-polling loop, a pure update normaliser, and the address helpers.

This package is private. Nothing in it has run against Telegram yet, and it stays private until the live checks below pass.

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

These capabilities are implemented but stay off until their live checks pass. Turn them on with the `unverified` option, at your own risk:

| Option     | Turns on   | Live checks |
| ---------- | ---------- | ----------- |
| `files`    | `files`    | 6           |
| `buttons`  | `buttons`  | 7, 8        |
| `commands` | `commands` | 7, 9, 10    |

An edit of a message posted with files may drop its media. Live check 6 decides whether that is so.

Not supported in this version: `ephemeral`, `fetchMessage`, `history`, `opener`, `startThread`, selects, modals, native streams, reactions (outbound and as events), and typing. A private answer to a command is refused through `ChatInteraction.Handler.refused` with `Unsupported`, and is never posted in public. A `message_reaction` update goes to `onUnhandled`.

Updates from business connections, a channel's direct messages and guest mode are never dispatched: they go to `onUnhandled`. A business chat's button is answered so the client stops waiting.

## Security

- The bot token is in the URL path of every Bot API call. The adapter turns off the HTTP client's own spans for these calls, writes its own span with the path as `/bot<redacted>/{method}`, never follows a redirect, and keeps the token out of every error.
- The webhook needs the `X-Telegram-Bot-Api-Secret-Token` header, compared in constant time, before it reads the body. An app that records server request headers must add `TelegramChat.secretHeader` to `Headers.CurrentRedactedNames`.
- Consumer Markdown is escaped so that it reaches no raw HTML, image, math, spoiler, or link outside `http`, `https` and `mailto`. A `tg://user` link stays only for users listed in `withPostOptions({ notify: { users } })`.
- A click is dispatched only when its `data` matches a button in Telegram's own copy of the message. That shows the bot put the button there, not that it is still current or that this user may press it.

## Redelivery

Telegram sends an update again until it gets a 200, clicks and commands included. The webhook answers 503 when the `ChatHandler` fails `NotAccepted` or passes its deadline, and Telegram retries. Polling retries an update up to `maxAttempts` times, then logs it and moves on.

A handler whose work must not run twice keys it with `TelegramChat.deliveryKey(event.raw, { botId })`:

1. Record the key and do the work in one transaction.
2. Reply only after the commit.
3. When the key is already there, answer a repeated click with `Ack` and a repeated command with `Defer`, so a command is never handled twice and never falls through to `MessageCreated`.

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
