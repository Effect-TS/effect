import { Buffer } from "node:buffer"

import * as BrowserLogin from "@effect/auth/BrowserLogin"
import { OperationHttpError } from "@effect/auth/OperationHttp"
import type { NativeCredentials } from "@effect/auth/OperationHttpClient"
import type { CredentialSlot } from "@effect/auth/Operations"
import { markAuthFailureReported, reportAuthFailure } from "@effect/auth/Persistence"
import * as Cause from "effect/Cause"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Semaphore from "effect/Semaphore"
import { app, safeStorage } from "electron"

type Vault = BrowserLogin.Vault["Service"]

const recordSchema = BrowserLogin.VaultRecord
const slots = recordSchema.fields.credentials.key.literals

const recordJson = Schema.fromJsonString(recordSchema)
const failure = () => BrowserLogin.PlatformError.make({ reason: "storage" })

// Only exported vault operations project errors, after all file finalizers settle.
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

/**
 * One writer per private application/environment path, protected by the host's
 * single-instance lock. Never reset an unreadable store: it may contain the
 * Exchanging fence. Writes fsync ciphertext, close, rename on the same filesystem,
 * then sync the parent on POSIX (the replaced file on Windows).
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layerVault = (options: { readonly path: string }) =>
  Layer.effect(
    BrowserLogin.Vault,
    Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      const checkEncryption = Effect.sync(
        () =>
          process.type === "browser" &&
          app.isReady() &&
          app.hasSingleInstanceLock() &&
          safeStorage.isEncryptionAvailable() &&
          (process.platform !== "linux" ||
            ["gnome_libsecret", "kwallet", "kwallet5", "kwallet6"].includes(
              safeStorage.getSelectedStorageBackend()
            ))
      ).pipe(Effect.flatMap((available) => (available ? Effect.void : Effect.fail(failure()))))

      yield* checkEncryption

      const destination = yield* Schema.decodeEffect(
        Schema.NonEmptyString.check(Schema.makeFilter((value) => path.isAbsolute(value)))
      )(options.path)

      const directory = path.dirname(destination)

      yield* fs.makeDirectory(directory, { recursive: true, mode: 0o700 })
      const gate = yield* Semaphore.make(1)

      const readRecord = Effect.gen(function*() {
        yield* checkEncryption

        const stat = yield* fs
          .stat(destination)
          .pipe(
            Effect.catchCause((cause) =>
              cause.reasons.every(
                  (reason) => Cause.isFailReason(reason) && reason.error.reason._tag === "NotFound"
                )
                ? Effect.void
                : Effect.failCause(cause)
            )
          )

        if (stat === undefined) return { credentials: {} } satisfies typeof recordSchema.Type
        if (stat.type !== "File" || stat.size > 1048576) return yield* failure()
        const bytes = yield* fs.readFile(destination)

        const json = yield* Effect.sync(() => safeStorage.decryptString(Buffer.from(bytes)))

        return yield* Schema.decodeEffect(recordJson)(json, { onExcessProperty: "error" })
      })

      const writeRecord = Effect.fnUntraced(function*(record: typeof recordSchema.Type) {
        yield* checkEncryption
        const json = yield* Schema.encodeEffect(recordJson)(record)

        const bytes = yield* Effect.sync(() => safeStorage.encryptString(json))

        yield* Effect.scoped(
          Effect.gen(function*() {
            const temporary = yield* fs.makeTempFileScoped({ directory, prefix: ".auth-" })

            yield* fs.chmod(temporary, 0o600)
            yield* Effect.scoped(
              Effect.gen(function*() {
                const file = yield* fs.open(temporary, { flag: "w", mode: 0o600 })

                yield* file.writeAll(bytes)
                yield* file.sync
              })
            )
            yield* fs.rename(temporary, destination)

            const committed = yield* fs.open(
              process.platform === "win32" ? destination : directory,
              { flag: process.platform === "win32" ? "r+" : "r" }
            )

            yield* committed.sync
          })
        )
      })

      const locked = <A, E>(effect: Effect.Effect<A, E>) => gate.withPermits(1)(Effect.uninterruptible(effect))

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
          storageBoundary(failure)
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
          storageBoundary(failure)
        )
      })
    }).pipe(storageBoundary(failure))
  )
