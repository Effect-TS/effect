import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { type Client, Clients, ConfigurationError, HttpsReturnUrl } from "./models.ts"

/** Apple application-identifier prefix and bundle identifier, as signed into the app. */
export const AppleAppId = Schema.String.check(
  Schema.isMaxLength(256),
  Schema.isPattern(/^[A-Z0-9]{10}\.[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/)
)

/** Optional AASA contribution for one app and callback origin. Pass only that
 * app's client registrations. The application owns the complete association
 * document, rule ordering, size limit, hosting and signed entitlements.
 * This builds deployment configuration; it does not verify an installed app. */
export const appleAssociation = Effect.fnUntraced(function*(options: {
  readonly appId: string
  readonly clients: ReadonlyArray<Client>
  readonly origin: string
}) {
  const appId = yield* Schema.decodeEffect(AppleAppId)(options.appId).pipe(
    Effect.mapError(() => ConfigurationError.make({}))
  )

  const clients = yield* Schema.decodeEffect(Clients)(options.clients).pipe(
    Effect.mapError(() => ConfigurationError.make({}))
  )

  const origin = yield* Schema.decodeEffect(
    Schema.String.check(
      Schema.makeFilter((text) => {
        try {
          const url = new URL(text)

          return url.origin === text && Schema.is(HttpsReturnUrl)(url.href)
        } catch {
          return false
        }
      })
    )
  )(options.origin).pipe(Effect.mapError(() => ConfigurationError.make({})))

  const callbackPaths = new Set<string>()

  for (const client of clients) {
    const url = new URL(client.returnUrl)

    if (url.origin === origin) callbackPaths.add(url.pathname)
  }
  if (callbackPaths.size === 0) return yield* ConfigurationError.make({})

  return { appId, callbackPaths: [...callbackPaths] }
})
