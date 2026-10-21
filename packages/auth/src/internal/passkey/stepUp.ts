import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as Types from "effect/Types"

import type { AuthInvocation } from "../operations/context.ts"
import type { AuthOperationResult } from "../operations/credentials.ts"
import { makeOperation, operationGroup } from "../operations/operation.ts"
import type { makeSessionModule } from "../sessions/module.ts"
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
export const makePasskeyStepUp = <
  const Id extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  source: Effect.Effect<PasskeyMethodPolicy, PasskeyConfigurationError, PasskeyConfig>,
  sessions: ReturnType<typeof makeSessionModule<SessionId, Claims>>
) => {
  const ceremony = makePasskeyCeremony(moduleId, source, "step-up")
  const BeginInput = Schema.Struct({ ...PasskeyBegin.fields, stepUpCredential: credential })

  const CompleteInput = Schema.Struct({
    ...PasskeyComplete.fields,
    stepUpCredential: credential,
    sourceCredential: credential
  })

  const StepUp = Context.Service<
    {
      readonly moduleId: Id
      readonly kind: "passkey-step-up"
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
      ) => Effect.Effect<AuthOperationResult<typeof sessions.Session.Type>, PasskeyFailure>
    }
  >(`@effect/auth/PasskeyStepUp/${moduleId.length}:${moduleId}`)

  const layer = Layer.effect(
    StepUp,
    Effect.gen(function*() {
      const runtime = yield* ceremony.make,
        stepUp = yield* sessions.SessionStepUp,
        strategy = yield* sessions.SessionStrategy

      const services = yield* Effect.context<PasskeyCredentials>()

      const target = Effect.fn("PasskeyStepUp.target")(function*(
        invocation: AuthInvocation,
        token: typeof credential.Type
      ) {
        if (invocation._tag !== "Authenticated") return yield* PasskeyRejected.make({})

        const pending = yield* stepUp
          .inspect(token)
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

        const context = pending.intent

        if (context.revision.subjectId !== invocation.subjectId) {
          return yield* PasskeyRejected.make({})
        }

        const fixed = yield* snapshotPasskey(PasskeyTarget, {
          flowId: context.flowId,
          bindingDigest: context.bindingDigest,
          revision: context.revision,
          expiresAtMillis: DateTime.toEpochMillis(context.expiresAt),
          moduleId: sessions.moduleId,
          kind: "session-step-up",
          commandId: context.flowId
        })

        return { pending, fixed }
      })

      return StepUp.of({
        begin: Effect.fn("PasskeyStepUp.begin")(function*(invocation, input) {
          input = yield* snapshotPasskey(Schema.toType(BeginInput), input)
          yield* passkeyNoAmbient()

          const { fixed } = yield* target(invocation, input.stepUpCredential),
            captured = yield* runtime
              .exclusions(input.profileId, fixed.revision.subjectId)
              .pipe(Effect.provide(services))

          return yield* runtime.beginAuthentication(
            input,
            { _tag: "StepUp", target: fixed },
            captured.credentials
          )
        }),
        complete: Effect.fn("PasskeyStepUp.complete")(function*(invocation, input) {
          input = yield* snapshotPasskey(Schema.toType(CompleteInput), input)
          yield* passkeyNoAmbient()
          const { pending, fixed } = yield* target(invocation, input.stepUpCredential)

          const source = yield* sessions.inspectInvocation(invocation, input.sourceCredential).pipe(
            Effect.provideService(sessions.SessionStrategy, strategy),
            Effect.catchCause((cause) =>
              Effect.failCause(
                Cause.map(cause, (error) =>
                  error._tag === "HookDenied"
                    ? error
                    : error._tag === "SessionUnavailable"
                    ? PasskeyUnavailable.make({})
                    : PasskeyRejected.make({}))
              )
            )
          )

          const verified = yield* runtime
            .authentication(input, { _tag: "StepUp", target: fixed })
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
                  yield* stepUp
                    .rejectCredential(input.stepUpCredential)
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
            yield* stepUp
              .prepareComplete({
                source,
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

  const Begin = makeOperation(`${moduleId}/passkey/step-up/begin`, {
    payload: BeginInput,
    success: PasskeyAuthenticationStarted,
    error: PasskeyFailure,
    exposure: "public",
    access: "authenticated",
    replay: "single-use",
    credentials: true
  })

  const Complete = makeOperation(`${moduleId}/passkey/step-up/complete`, {
    payload: CompleteInput,
    success: sessions.Session,
    error: PasskeyFailure,
    exposure: "public",
    access: "authenticated",
    replay: "single-use",
    credentials: true
  })

  return Object.freeze({
    StepUp,
    binding: ceremony.binding,
    layer,
    operations: Object.freeze({ Begin, Complete }),
    group: operationGroup(Begin, Complete),
    handlersLayer: Layer.mergeAll(
      Begin.credentialHandlerLayer((input, invocation) =>
        Effect.flatMap(StepUp, (service) => service.begin(invocation, input))
      ),
      Complete.credentialHandlerLayer((input, invocation) =>
        Effect.flatMap(StepUp, (service) => service.complete(invocation, input))
      )
    )
  })
}
