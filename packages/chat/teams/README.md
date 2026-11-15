# @effect/chat-teams

A [Microsoft Teams](https://www.microsoft.com/microsoft-teams) adapter for `effect/chat`, over the Bot Framework Connector. It includes the messaging endpoint, a pure activity normaliser, and the address helpers.

This package is private. Nothing in it has run against a real tenant yet, and it stays private until the live checks below pass.

## Setup

One layer serves one Entra tenant through a single-tenant Azure Bot registration:

1. Register an app in Entra ID and create a client secret, or use a certificate or managed identity through a credentials provider.
2. Create an Azure Bot resource of type single-tenant with that app id, turn on the Microsoft Teams channel, and point its messaging endpoint at the route given to `TeamsChat.layerWebhook`.
3. Install the bot's app package in the tenant.

```ts
import * as TeamsChat from "@effect/chat-teams/TeamsChat"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"

const Teams = TeamsChat.layerWebhook({ path: "/api/messages" }).pipe(
  Layer.provideMerge(TeamsChat.layer({
    appId: "<app id>",
    tenantId: "<tenant id>",
    credentials: Redacted.make("<client secret>")
  }))
)
```

`TeamsChat.layer` needs `HttpClient`, the chat `Registry`, `Mac` and `Digest`. `TeamsChat.layerWebhook` needs `HttpRouter`, a `ChatHandler`, `HttpClient` and `Signature`. The adapter never calls `crypto.subtle` itself. Importing Bot Framework's public keys goes through `Jwk.importPublic`, which needs a `WebCrypto` reference whatever backend provides `Signature`.

The cloud's endpoints and host allowlists come from `TeamsChat.publicCloud` or a `Cloud` of your own. They are configuration and are never read from an activity.

## Capabilities

By default the descriptor advertises `edit`, `delete`, `getThread` and `getUser`, alongside `post`. `getUser` needs `in`, the thread whose roster to read.

These capabilities are implemented but stay off until their live checks pass. Turn them on with the `unverified` option, at your own risk:

| Option        | Turns on                                    | Also needs        |
| ------------- | ------------------------------------------- | ----------------- |
| `buttons`     | `buttons` (buttons and link buttons)        | `interactionKeys` |
| `modals`      | `modals`, `modalErrors` (dialogs)           | `buttons`         |
| `commands`    | `commands`, `ephemeral` (targeted messages) |                   |
| `startThread` | `startThread`                               |                   |
| `download`    | `download`                                  |                   |

A dialog opens only from a button whose id is listed in `modalButtons`. Any other `OpenModal` is refused as `Unsupported`.

Not supported in this version: `fetchMessage`, `history` and `opener` (they need Microsoft Graph), `replyTo`, files, native streams and selects.

## Security

- Inbound requests need a Bot Framework token: RS256, with a key endorsed for `msteams`, the cloud's issuer, the app id as audience, and a `serviceurl` claim equal to the activity's `serviceUrl`. The channel must be `msteams` and the tenant the configured one. Anything else is answered 403.
- Button and dialog tokens are signed (HS256) and bound to the app, the tenant and the conversation. They are not encrypted: anyone who sees a card can read a button's id and value.
- Button tokens have no replay protection. A click can be sent again for as long as the conversation exists. Dialog tokens also bind the user and expire after an hour.
- A command's private answer goes as a targeted message to the user who sent the command. If that fails, the answer is not posted in public.

## Live checks

None of these have run yet. They need a Microsoft 365 developer tenant, an Azure Bot resource and a public tunnel to the endpoint.

- Base: posting, editing and deleting in a channel, a group chat and a personal chat; inbound messages and reactions; user ids; the message size budget (`messageLength` is 44,288 units, derived from a provisional 50,000-unit activity size).
- `startThread`: replies addressed with `;messageid=`.
- `buttons`: `Action.Execute` and its `Action.Submit` fallback reach the endpoint, with the signed token intact.
- `modals` and `modalErrors`: `task/fetch` and `task/submit`, and a dialog kept open with field errors.
- `commands` and `ephemeral`: targeted messages in and out.
- `download`: Connector-hosted and pre-authorised file URLs.

## Links

- [Website](https://effect.website): documentation, guides, and news.
- [Discord](https://discord.gg/effect-ts): ask questions, share what you're building, and talk to the core team.
- [Issues](https://github.com/Effect-TS/effect/issues): bug reports and feature requests.
