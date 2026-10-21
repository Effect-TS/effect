import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Semaphore from "effect/Semaphore"

import { Client as Transport, type NativeCredentials } from "../httpOperation/client.ts"
import type { makeContract } from "./contract.ts"
import { makeSecrets } from "./crypto.ts"
import type { Attempt } from "./models.ts"
import { ClientId, HostedUrl, Indeterminate, PlatformError, Random, ReturnUrl } from "./models.ts"

/** Implemented by a platform adapter. Closing the Effect closes its browser/listeners. */
export class Browser extends Context.Service<
  Browser,
  {
    readonly open: (input: {
      readonly url: string
      readonly returnUrl: string
      readonly ephemeral: boolean
    }) => Effect.Effect<string, PlatformError>
  }
>()("@effect/auth/BrowserLogin/Browser") {}

/** One host-owned secure store, shared by every credential-bearing transport. */
export class Vault extends Context.Service<
  Vault,
  NativeCredentials & {
    readonly loadAttempt: Effect.Effect<Attempt | undefined, PlatformError>
    readonly saveAttempt: (attempt: Attempt | undefined) => Effect.Effect<void, PlatformError>
  }
>()("@effect/auth/BrowserLogin/Vault") {}

/** Validate the entire callback, not just a matching scheme or a code parameter. */
export const callback = Effect.fnUntraced(function*(attempt: Attempt, input: string) {
  const decoded = yield* Schema.decodeEffect(Schema.String.check(Schema.isMaxLength(2304)))(
    input
  ).pipe(Effect.mapError(() => PlatformError.make({ reason: "callback" })))

  const url = yield* Effect.try({
    try: () => new URL(decoded),
    catch: () => PlatformError.make({ reason: "callback" })
  })

  const code = yield* Schema.decodeUnknownEffect(Random)(url.searchParams.get("code")).pipe(
    Effect.mapError(() => PlatformError.make({ reason: "callback" }))
  )

  const params = [...url.searchParams.keys()]

  if (
    url.hash ||
    params.length !== 2 ||
    !params.includes("code") ||
    !params.includes("state") ||
    url.searchParams.get("state") !== attempt.state ||
    url.href.slice(0, url.href.indexOf("?")) !== attempt.returnUrl
  ) {
    return yield* PlatformError.make({ reason: "callback" })
  }

  return code
})

/** The caller supplies the existing native OperationHttpClient and platform
 * Layers. Keep this instance in the host; only its public session result reaches UI.
 * No operation retries an exchange or clears an uncertain attempt automatically.
 */
export const makeClient = Effect.fnUntraced(function*<
  const Id extends string,
  S extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  contract: ReturnType<typeof makeContract<Id, S>>,
  options: {
    readonly clientId: string
    readonly returnUrl: string
    readonly hostedUrl: string
    readonly ephemeral?: boolean
  }
) {
  const config = yield* Schema.decodeEffect(
    Schema.Struct({ clientId: ClientId, returnUrl: ReturnUrl, hostedUrl: HostedUrl })
  )(options).pipe(Effect.mapError(() => PlatformError.make({ reason: "unavailable" })))

  const browser = yield* Browser
  const vault = yield* Vault
  const transport = yield* Transport
  const secrets = yield* makeSecrets
  const gate = yield* Semaphore.make(1)

  const binding = (attempt: Attempt) => ({
    attemptId: attempt.attemptId,
    clientId: attempt.clientId,
    verifier: Redacted.value(attempt.verifier)
  })

  const load = Effect.gen(function*() {
    const attempt = yield* vault.loadAttempt

    if (
      attempt !== undefined &&
      (attempt.clientId !== config.clientId || attempt.returnUrl !== config.returnUrl)
    ) {
      return yield* PlatformError.make({ reason: "storage" })
    }

    return attempt
  })

  const finish = Effect.fnUntraced(function*(url: string) {
    const attempt = yield* load

    if (attempt === undefined) return yield* PlatformError.make({ reason: "callback" })
    if (attempt.phase === "Exchanging") return yield* Indeterminate.make({})
    if (attempt.expiresAtMillis <= DateTime.toEpochMillis(yield* DateTime.now)) {
      return yield* PlatformError.make({ reason: "expired" })
    }
    const code = yield* callback(attempt, url)

    // Persist the fence even if transport, OS custody or process termination loses the result.
    return yield* Effect.uninterruptible(
      Effect.gen(function*() {
        yield* vault.saveAttempt({ ...attempt, phase: "Exchanging" })

        const session = yield* transport.call(
          contract.routes.exchange,
          { ...binding(attempt), code },
          { replaceSubject: true }
        )

        yield* vault.saveAttempt(undefined)

        return session
      })
    )
  })

  const resume = Effect.fnUntraced(function*() {
    const attempt = yield* load

    if (attempt === undefined) return yield* PlatformError.make({ reason: "callback" })
    if (attempt.phase === "Exchanging") return yield* Indeterminate.make({})
    if (attempt.expiresAtMillis <= DateTime.toEpochMillis(yield* DateTime.now)) {
      return yield* PlatformError.make({ reason: "expired" })
    }
    const url = new URL(config.hostedUrl)

    url.searchParams.set("attempt", attempt.attemptId)

    return yield* finish(
      yield* browser.open({
        url: url.href,
        returnUrl: config.returnUrl,
        ephemeral: options.ephemeral ?? false
      })
    )
  })

  return {
    signIn: gate.withPermits(1)(
      Effect.gen(function*() {
        if ((yield* load) !== undefined) return yield* PlatformError.make({ reason: "busy" })
        const verifier = yield* secrets.random
        const state = yield* secrets.random

        const started = yield* transport.call(contract.routes.initiate, {
          clientId: config.clientId,
          returnUrl: config.returnUrl,
          state,
          challenge: yield* secrets.digest(verifier)
        })

        yield* vault.saveAttempt({
          ...started,
          clientId: config.clientId,
          returnUrl: config.returnUrl,
          state,
          verifier: Redacted.make(verifier),
          phase: "Waiting"
        })

        return yield* resume()
      })
    ),
    resume: gate.withPermits(1)(resume()),
    finish: (url: string) => gate.withPermits(1)(finish(url)),
    status: Effect.gen(function*() {
      const attempt = yield* load

      return attempt === undefined
        ? undefined
        : yield* transport.call(contract.routes.status, binding(attempt))
    }),
    cancel: gate.withPermits(1)(
      Effect.gen(function*() {
        const attempt = yield* load

        if (attempt === undefined) return
        if (attempt.phase === "Exchanging") return yield* Indeterminate.make({})
        if (attempt.expiresAtMillis > DateTime.toEpochMillis(yield* DateTime.now)) {
          yield* transport.call(contract.routes.cancel, binding(attempt))
        }
        yield* vault.saveAttempt(undefined)
      })
    ),
    /** After independently restoring/revoking the possible native session,
     * the host may explicitly retire its uncertain attempt. Never auto-retry. */
    acknowledge: gate.withPermits(1)(vault.saveAttempt(undefined))
  }
})
