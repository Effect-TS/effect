import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as Types from "effect/Types"

import type { AuthInvocation } from "../operations/context.ts"
import type { AuthOperationResult } from "../operations/credentials.ts"
import { makeOperation, operationGroup } from "../operations/operation.ts"
import type { makeSessionModule } from "../sessions/module.ts"
import { pendingAuthenticationContext } from "../sessions/pendingAuthentication.ts"
import { makePasskeyCeremony, passkeyNoAmbient, passkeyRateLimiterLayer, readPasskeyCommit } from "./actions.ts"
import type { PasskeyConfigurationError } from "./errors.ts"
import { PasskeyFailure, PasskeyMethodUnsupported, PasskeyRejected, PasskeyUnavailable } from "./errors.ts"
import { PasskeyAuthenticationStarted, PasskeyBegin, PasskeyComplete, PasskeyTarget } from "./models.ts"
import type { PasskeyConfig } from "./passkeyConfig.ts"
import type { PasskeyCredentials } from "./passkeyCredentials.ts"
import type { PasskeyMethodPolicy } from "./policy.ts"
import { snapshotPasskey } from "./snapshot.ts"
const credential = Schema.RedactedFromValue(Schema.NonEmptyString.check(Schema.isMaxLength(16384)))

/** @internal */
export const makePasskeyPending = <
  const Id extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  source: Effect.Effect<PasskeyMethodPolicy, PasskeyConfigurationError, PasskeyConfig>,
  sessions: ReturnType<typeof makeSessionModule<SessionId, Claims>>
) => {
  const ceremony = makePasskeyCeremony(moduleId, source, "pending")
  const BeginInput = Schema.Struct({ ...PasskeyBegin.fields, pendingCredential: credential })
  const CompleteInput = Schema.Struct({ ...PasskeyComplete.fields, pendingCredential: credential })

  const Pending = Context.Service<
    {
      readonly moduleId: Id
      readonly kind: "passkey-pending"
      readonly claims: Types.Invariant<Claims["Type"]>
    },
    {
      readonly begin: (
        invocation: AuthInvocation,
        input: typeof BeginInput.Type
      ) => Effect.Effect<AuthOperationResult<PasskeyAuthenticationStarted>, PasskeyFailure>
      readonly complete: (
        invocation: AuthInvocation,
        input: typeof CompleteInput.Type
      ) => Effect.Effect<
        AuthOperationResult<typeof sessions.CompletionResult.Type>,
        PasskeyFailure
      >
    }
  >(`@effect/auth/PasskeyPending/${moduleId.length}:${moduleId}`)

  const layer = Layer.effect(
    Pending,
    Effect.gen(function*() {
      const runtime = yield* ceremony.make,
        completion = yield* sessions.AuthenticationCompletion

      const services = yield* Effect.context<PasskeyCredentials>()

      const target = Effect.fn("PasskeyPending.target")(function*(token: typeof credential.Type) {
        const pending = yield* completion
          .inspectPending(token)
          .pipe(
            Effect.catchCause((cause) =>
              Effect.failCause(
                Cause.map(cause, (error) =>
                  error._tag === "HookDenied"
                    ? error
                    : error._tag === "SessionUnavailable"
                    ? PasskeyUnavailable.make({})
                    : error._tag === "SessionCapabilityUnsupported"
                    ? PasskeyMethodUnsupported.make({})
                    : PasskeyRejected.make({}))
              )
            )
          )

        const context = yield* pendingAuthenticationContext(pending.record).pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasskeyRejected.make({}))))
        )

        const fixed = yield* snapshotPasskey(PasskeyTarget, {
          ...context,
          moduleId: sessions.moduleId,
          kind: "login-pending",
          commandId: context.flowId
        })

        return { pending, fixed }
      })

      return Pending.of({
        begin: Effect.fn("PasskeyPending.begin")(function*(invocation, input) {
          input = yield* snapshotPasskey(Schema.toType(BeginInput), input)
          yield* passkeyNoAmbient()
          if (invocation._tag !== "Guest") return yield* PasskeyRejected.make({})

          const { fixed } = yield* target(input.pendingCredential),
            captured = yield* runtime
              .exclusions(input.profileId, fixed.revision.subjectId)
              .pipe(Effect.provide(services))

          return yield* runtime.beginAuthentication(
            input,
            { _tag: "Pending", target: fixed },
            captured.credentials
          )
        }),
        complete: Effect.fn("PasskeyPending.complete")(function*(invocation, input) {
          input = yield* snapshotPasskey(Schema.toType(CompleteInput), input)
          yield* passkeyNoAmbient()
          if (invocation._tag !== "Guest") return yield* PasskeyRejected.make({})
          const { pending, fixed } = yield* target(input.pendingCredential)

          const verified = yield* runtime
            .authentication(input, { _tag: "Pending", target: fixed })
            .pipe(
              Effect.provide(services),
              Effect.catchCause(Effect.fnUntraced(function*(cause) {
                if (
                  !cause.reasons.every(
                    (reason) => Cause.isFailReason(reason) && reason.error._tag === "PasskeyRejected"
                  )
                ) {
                  return yield* Effect.failCause(cause)
                }
                yield* readPasskeyCommit(
                  yield* completion
                    .rejectPendingCredential(input.pendingCredential)
                    .pipe(
                      Effect.catchCause((cause) =>
                        Effect.failCause(Cause.map(cause, () => PasskeyUnavailable.make({})))
                      )
                    )
                )

                return yield* PasskeyRejected.make({})
              }))
            )

          const result = yield* readPasskeyCommit(
            yield* completion
              .preparePending({
                pending,
                additional: verified.evidence
              })
              .pipe(
                Effect.catchCause((cause) =>
                  Effect.failCause(
                    Cause.map(cause, (error) =>
                      error._tag === "HookDenied"
                        ? error
                        : error._tag === "SessionUnavailable"
                        ? PasskeyUnavailable.make({})
                        : error._tag === "SessionCapabilityUnsupported"
                        ? PasskeyMethodUnsupported.make({})
                        : PasskeyRejected.make({}))
                  )
                )
              )
          )

          return {
            value: result.value,
            credentialCommands: [...verified.credentialCommands, ...result.credentialCommands]
          }
        })
      })
    })
  ).pipe(Layer.provide(passkeyRateLimiterLayer))

  const Begin = makeOperation(`${moduleId}/passkey/pending/begin`, {
    payload: BeginInput,
    success: PasskeyAuthenticationStarted,
    error: PasskeyFailure,
    exposure: "public",
    access: "any",
    replay: "single-use",
    credentials: true
  })

  const Complete = makeOperation(`${moduleId}/passkey/pending/complete`, {
    payload: CompleteInput,
    success: sessions.CompletionResult,
    error: PasskeyFailure,
    exposure: "public",
    access: "any",
    replay: "single-use",
    credentials: true
  })

  return Object.freeze({
    Pending,
    binding: ceremony.binding,
    layer,
    operations: Object.freeze({ Begin, Complete }),
    group: operationGroup(Begin, Complete),
    handlersLayer: Layer.mergeAll(
      Begin.credentialHandlerLayer((input, invocation) =>
        Effect.flatMap(Pending, (service) => service.begin(invocation, input))
      ),
      Complete.credentialHandlerLayer((input, invocation) =>
        Effect.flatMap(Pending, (service) => service.complete(invocation, input))
      )
    )
  })
}
