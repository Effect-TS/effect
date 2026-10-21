/**
 * iOS browser login and device-only credential storage through Expo.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as BrowserLogin from "@effect/auth/BrowserLogin"
import { OperationHttpError } from "@effect/auth/OperationHttp"
import type { NativeCredentials } from "@effect/auth/OperationHttpClient"
import type { CredentialSlot } from "@effect/auth/Operations"
import { markAuthFailureReported, reportAuthFailure } from "@effect/auth/Persistence"
import * as Cause from "effect/Cause"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Semaphore from "effect/Semaphore"
import * as SecureStore from "expo-secure-store"
import * as WebBrowser from "expo-web-browser"
import { Platform } from "react-native"

type Vault = BrowserLogin.Vault["Service"]

const failure = (reason: BrowserLogin.PlatformError["reason"]) => BrowserLogin.PlatformError.make({ reason })

const environment = Effect.sync(
  () => Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 16
).pipe(
  Effect.flatMap((supported) => (supported ? Effect.void : Effect.fail(failure("unavailable"))))
)

const browserBoundary = <A, R>(effect: Effect.Effect<A, BrowserLogin.PlatformError, R>) =>
  Effect.uninterruptibleMask((restore) =>
    restore(effect).pipe(
      Effect.catchCause((cause) => {
        const defects = cause.reasons.filter(Cause.isDieReason)

        if (defects.length === 0) return Effect.failCause(cause)

        return reportAuthFailure("browser-login", Cause.fromReasons(defects)).pipe(
          Effect.andThen(
            Effect.failCause(
              markAuthFailureReported(
                Cause.fromReasons(
                  cause.reasons.map((reason) =>
                    Cause.isDieReason(reason)
                      ? Cause.makeFailReason(failure("unavailable"))
                      : reason
                  )
                )
              )
            )
          )
        )
      })
    )
  )

const storageBoundary =
  <Failure>(project: () => Failure) => <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, Failure, R> =>
    Effect.uninterruptibleMask((restore) =>
      restore(effect).pipe(
        Effect.catchCause((cause) => {
          if (Cause.hasInterruptsOnly(cause)) {
            return Effect.failCause(
              Cause.fromReasons<never>(cause.reasons.filter(Cause.isInterruptReason))
            )
          }

          return reportAuthFailure("browser-login", cause).pipe(
            Effect.andThen(
              Effect.failCause(
                markAuthFailureReported(
                  Cause.fromReasons(
                    cause.reasons.map((reason) =>
                      Cause.isInterruptReason(reason) ? reason : Cause.makeFailReason(project())
                    )
                  )
                )
              )
            )
          )
        })
      )
    )

const openInput = Schema.Struct({
  url: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(4096),
    Schema.makeFilter((text) => {
      try {
        const url = new URL(text)

        return (
          url.href === text &&
          url.protocol === "https:" &&
          !url.username &&
          !url.password &&
          !url.hash
        )
      } catch {
        return false
      }
    })
  ),
  returnUrl: Schema.Union([
    BrowserLogin.HttpsReturnUrl,
    BrowserLogin.ReturnUrl.check(Schema.makeFilter((text) => !text.startsWith("https:")))
  ]),
  ephemeral: Schema.Boolean
})

const browserResult = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("success"),
    url: Schema.String.check(Schema.isMaxLength(8192))
  }),
  Schema.Struct({ type: Schema.Literals(["cancel", "dismiss"]) })
])

interface Lease {
  started: boolean
  settled: boolean
  listening: boolean
}

// The bridge owns a single native resolver. All Layers in this installed module
// share admission; applications must not call the peer independently.
let activeBrowser: Lease | undefined

const settle = (lease: Lease) => {
  lease.settled = true
  if (activeBrowser === lease) activeBrowser = undefined
}

const acquireBrowser = Effect.sync(() => {
  if (activeBrowser !== undefined) return undefined
  const lease: Lease = { started: false, settled: false, listening: true }

  activeBrowser = lease

  return lease
}).pipe(
  Effect.flatMap((lease) => lease === undefined ? Effect.fail(failure("busy")) : Effect.succeed(lease))
)

const releaseBrowser = (lease: Lease) =>
  Effect.sync(() => {
    lease.listening = false
    if (!lease.started) settle(lease)
    if (lease.settled) return
    // A failed dismissal is observable, but only native settlement releases admission.
    WebBrowser.dismissAuthSession()
  })

const prompt = (lease: Lease, input: typeof openInput.Type) =>
  Effect.callback<unknown, BrowserLogin.PlatformError>((resume, signal) => {
    lease.started = true
    try {
      // SDK 54 binds HTTPS callbacks directly; SDK 57 requires this opt-in.
      const options = {
        preferEphemeralSession: input.ephemeral,
        preferUniversalLinks: true
      }

      void WebBrowser.openAuthSessionAsync(input.url, input.returnUrl, options).then(
        (value: unknown) => {
          settle(lease)
          if (lease.listening && !signal.aborted) resume(Effect.succeed(value))
        },
        (error) => {
          settle(lease)
          if (lease.listening && !signal.aborted) resume(Effect.die(error))
        }
      )
    } catch (error) {
      settle(lease)
      resume(Effect.die(error))
    }
  })

/**
 * iOS ASWebAuthenticationSession; HTTPS callbacks require iOS 17.4+ and
 * associated web credentials domains. Each open owns its Scope and dismissal;
 * interruption retains the shared busy guard until the native promise settles.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layerBrowser = Layer.succeed(
  BrowserLogin.Browser,
  BrowserLogin.Browser.of({
    open: Effect.fnUntraced(function*(input) {
      yield* environment

      const request = yield* Schema.decodeEffect(openInput)(input).pipe(
        Effect.mapError(() => failure("callback"))
      )

      if (request.returnUrl.startsWith("https:")) {
        // Reject before invoking Expo's fallback to callbackURLScheme on older iOS.
        const supported = yield* Effect.sync(() => {
          const [major = 0, minor = 0] = String(Platform.Version).split(".").map(Number)

          return major > 17 || (major === 17 && minor >= 4)
        })

        if (!supported) return yield* failure("unavailable")
      }

      return yield* Effect.scoped(
        Effect.gen(function*() {
          const lease = yield* Effect.acquireRelease(acquireBrowser, releaseBrowser)

          const result = yield* Schema.decodeUnknownEffect(browserResult)(
            yield* prompt(lease, request)
          ).pipe(Effect.mapError(() => failure("callback")))

          if (result.type !== "success") return yield* failure("cancelled")

          // Bind the full target even when the OS matches only the custom scheme;
          // core owns state/code validation and the exchange decision.
          return yield* Schema.decodeEffect(
            Schema.String.check(
              Schema.makeFilter((text) => {
                try {
                  const url = new URL(text)

                  if (url.href !== text || url.username || url.password || url.hash) return false
                  url.search = ""

                  return url.href === request.returnUrl
                } catch {
                  return false
                }
              })
            )
          )(result.url).pipe(Effect.mapError(() => failure("callback")))
        })
      )
    }, browserBoundary)
  })
)

const vaultRecord = BrowserLogin.VaultRecord
const slots = vaultRecord.fields.credentials.key.literals

const vaultJson = Schema.fromJsonString(vaultRecord)

const vaultKey = "yielded-auth.browser-login"
const storedValue = Schema.NullOr(Schema.String.check(Schema.isMaxLength(1048576)))

/**
 * Use a fresh, dedicated SecureStore service per app, server environment and client ID.
 * Build this Layer once per authentication lifetime; no other process or Layer
 * may write this service. Keep its name stable across restarts; SecureStore has
 * no cross-process compare-and-set contract.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layerVault = (options: { readonly service: string }) =>
  Layer.effect(
    BrowserLogin.Vault,
    Effect.gen(function*() {
      yield* environment

      const service = yield* Schema.decodeEffect(
        Schema.NonEmptyString.check(Schema.isMaxLength(256))
      )(options.service).pipe(Effect.mapError(() => failure("storage")))

      const storageOptions = {
        keychainService: service,
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        // Biometric changes must not invalidate the exchange fence.
        requireAuthentication: false
      } satisfies SecureStore.SecureStoreOptions

      const gate = yield* Semaphore.make(1)

      const readRecord = Effect.gen(function*() {
        const result = yield* Effect.promise(() => SecureStore.getItemAsync(vaultKey, storageOptions)).pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(storedValue))
        )

        if (result === null) return { credentials: {} } satisfies typeof vaultRecord.Type

        return yield* Schema.decodeEffect(vaultJson)(result, {
          onExcessProperty: "error"
        })
      })

      const writeRecord = Effect.fnUntraced(function*(record: typeof vaultRecord.Type) {
        const encoded = yield* Schema.encodeEffect(vaultJson)(record)

        // SecureStore updates existing iOS items with SecItemUpdate. Always replace
        // the whole record, including clears; never delete the item before writing.
        yield* Effect.promise(() => SecureStore.setItemAsync(vaultKey, encoded, storageOptions))
      })

      // SecureStore promises are not cancellable. Admitted operations must settle
      // before releasing this gate or acknowledging an Exchanging checkpoint.
      const locked = <A, E>(work: Effect.Effect<A, E>) => gate.withPermits(1)(Effect.uninterruptible(work))

      const read: NativeCredentials["read"] = locked(
        Effect.gen(function*() {
          const record = yield* readRecord
          const now = DateTime.toEpochMillis(yield* DateTime.now)
          const credentials: Partial<Record<CredentialSlot, Redacted.Redacted<string>>> = {}

          for (const slot of slots) {
            const value = record.credentials[slot]

            if (value !== undefined && value.expiresAtMillis > now) {
              credentials[slot] = value.credential
            }
          }

          return credentials
        })
      ).pipe(storageBoundary(() => OperationHttpError.make({ reason: "credentials" })))

      const accept: NativeCredentials["accept"] = Effect.fnUntraced(
        function*(commands: Parameters<NativeCredentials["accept"]>[0]) {
          const record = yield* readRecord
          const credentials = { ...record.credentials }

          for (const command of commands) {
            if (command._tag === "Clear") delete credentials[command.slot]
            else {
              credentials[command.slot] = {
                credential: command.credential,
                expiresAtMillis: command.expiresAtMillis
              }
            }
          }
          yield* writeRecord({ ...record, credentials })
        },
        locked,
        storageBoundary(() => OperationHttpError.make({ reason: "credentials" }))
      )

      return BrowserLogin.Vault.of({
        read,
        accept,
        loadAttempt: locked(readRecord.pipe(Effect.map((record) => record.attempt))).pipe(
          storageBoundary(() => failure("storage"))
        ),
        saveAttempt: Effect.fnUntraced(
          function*(attempt: Parameters<Vault["saveAttempt"]>[0]) {
            const record = yield* readRecord

            yield* writeRecord(
              attempt === undefined
                ? { credentials: record.credentials }
                : { ...record, attempt }
            )
          },
          locked,
          storageBoundary(() => failure("storage"))
        )
      })
    }).pipe(browserBoundary)
  )
