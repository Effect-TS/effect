import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as Types from "effect/Types"

import { make as makePasskeyContract } from "../../PasskeyContract.ts"
import type { SubjectId } from "../../Schema.ts"
import { makeAuthStrategy } from "../auth/authStrategy.ts"
import { defaultLayer, hooksLayer } from "../auth/defaults.ts"
import type { AuthInvocation } from "../operations/context.ts"
import type { AuthOperationResult } from "../operations/credentials.ts"
import { operationGroup } from "../operations/operation.ts"
import { CleanupLimit, type CleanupResult } from "../persistence/cleanup.ts"
import type { makeSessionModule } from "../sessions/module.ts"
import {
  capturePasskeyPolicy,
  makePasskeyActions,
  makePasskeyCeremony,
  passkeyNoAmbient,
  passkeyRateLimiterLayer,
  readPasskeyCommit
} from "./actions.ts"
import type { PasskeyFailure } from "./errors.ts"
import { PasskeyMethodUnsupported, PasskeyRejected, PasskeyUnavailable } from "./errors.ts"
import { makePasskeyManagement } from "./management.ts"
import { type PasskeyAuthenticationStarted, PasskeyBegin, PasskeyComplete, type PasskeyCredential } from "./models.ts"
import { PasskeyConfig } from "./passkeyConfig.ts"
import type { PasskeyCredentials } from "./passkeyCredentials.ts"
import { PasskeyPersistence } from "./passkeyPersistence.ts"
import { makePasskeyPending } from "./pending.ts"
import type { PasskeyManagementPolicy, PasskeyMethodPolicy } from "./policy.ts"
import { makePasskeyRegistration } from "./registration.ts"
import { snapshotPasskey } from "./snapshot.ts"
import { makePasskeyStepUp } from "./stepUp.ts"

export interface PasskeyConfiguration {
  readonly policy?: Partial<Omit<PasskeyMethodPolicy, "profiles">>
}

/** Behavior is captured by the descriptor; host profiles are supplied by the application Layer. */
export const capturePasskeyConfiguration = (options: PasskeyConfiguration) => {
  const configured = options.policy

  const policy = {
    lifetimeMillis: configured?.lifetimeMillis ?? 300_000,
    admission: configured?.admission === undefined
      ? {
        global: { limit: 1000, windowMillis: 60_000 },
        subject: { limit: 10, windowMillis: 60_000 },
        target: { limit: 10, windowMillis: 60_000 }
      }
      : {
        global: { ...configured.admission.global },
        subject: { ...configured.admission.subject },
        target: { ...configured.admission.target }
      }
  }

  return Effect.gen(function*() {
    const config = yield* PasskeyConfig

    return yield* capturePasskeyPolicy({ ...policy, profiles: config.profiles })
  })
}

export const makePasskeyMethod = <
  const Id extends string,
  const SessionId extends string,
  Claims extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  options: {
    readonly sessions: ReturnType<typeof makeSessionModule<SessionId, Claims>>
  } & PasskeyConfiguration,
  configuredSource?: ReturnType<typeof capturePasskeyConfiguration>
) => {
  const sessions = options.sessions
  const source = configuredSource ?? capturePasskeyConfiguration(options)
  const ceremony = makePasskeyCeremony(moduleId, source, "sign-in")

  /** Supply application session claims for the verified passkey's subject. */
  const SessionClaims = Context.Service<
    {
      readonly moduleId: Id
      readonly kind: "passkey-claims"
      readonly claims: Types.Invariant<Claims["Type"]>
    },
    {
      readonly resolve: (input: {
        readonly subjectId: SubjectId
        readonly credential: PasskeyCredential
      }) => Effect.Effect<Claims["Type"], PasskeyUnavailable>
    }
  >(`@effect/auth/ClaimsForPasskey/${moduleId.length}:${moduleId}`)

  const Passkeys = Context.Service<
    {
      readonly moduleId: Id
      readonly kind: "passkeys"
      readonly claims: Types.Invariant<Claims["Type"]>
    },
    {
      readonly begin: (
        invocation: AuthInvocation,
        input: PasskeyBegin
      ) => Effect.Effect<AuthOperationResult<PasskeyAuthenticationStarted>, PasskeyFailure>
      readonly complete: (
        invocation: AuthInvocation,
        input: PasskeyComplete
      ) => Effect.Effect<
        AuthOperationResult<typeof sessions.CompletionResult.Type>,
        PasskeyFailure
      >
      readonly cleanup: (
        invocation: AuthInvocation,
        limit: CleanupLimit
      ) => Effect.Effect<CleanupResult, PasskeyFailure>
    }
  >(`@effect/auth/Passkeys/${moduleId.length}:${moduleId}`)

  const layer = Layer.effect(
    Passkeys,
    Effect.gen(function*() {
      const runtime = yield* ceremony.make,
        claims = yield* SessionClaims,
        completion = yield* sessions.AuthenticationCompletion,
        persistence = yield* PasskeyPersistence

      const services = yield* Effect.context<
        PasskeyCredentials | Claims["EncodingServices"] | Claims["DecodingServices"]
      >()

      const claimsCodec = Schema.toCodecJson(Schema.toType(sessions.claims))

      return Passkeys.of({
        begin: Effect.fn("Passkeys.begin")(function*(invocation, input) {
          input = yield* snapshotPasskey(Schema.toType(PasskeyBegin), input)
          yield* passkeyNoAmbient()
          if (invocation._tag !== "Guest") return yield* PasskeyRejected.make({})

          return yield* runtime.beginAuthentication(input, { _tag: "SignIn" })
        }),
        complete: Effect.fn("Passkeys.complete")(function*(invocation, input) {
          input = yield* snapshotPasskey(Schema.toType(PasskeyComplete), input)
          yield* passkeyNoAmbient()
          if (invocation._tag !== "Guest") return yield* PasskeyRejected.make({})

          const verified = yield* runtime
            .authentication(input, { _tag: "SignIn" })
            .pipe(Effect.provide(services))

          const resolved = yield* claims.resolve({
            subjectId: verified.credential.revision.subjectId,
            credential: verified.credential
          })

          const encoded = yield* Schema.encodeEffect(claimsCodec)(resolved).pipe(
            Effect.provide(services),
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasskeyUnavailable.make({}))))
          )

          const captured = yield* Schema.decodeEffect(claimsCodec)(encoded).pipe(
            Effect.provide(services),
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasskeyUnavailable.make({}))))
          )

          const result = yield* readPasskeyCommit(
            yield* completion
              .prepare({
                evidence: verified.evidence,
                requirement: verified.credential.requirement,
                claims: captured
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
        }),
        cleanup: Effect.fn("Passkeys.cleanup")(function*(invocation, limit) {
          yield* passkeyNoAmbient()
          if (invocation._tag !== "System") return yield* PasskeyMethodUnsupported.make({})
          yield* Schema.decodeEffect(CleanupLimit)(limit).pipe(
            Effect.mapError(() => PasskeyRejected.make({}))
          )

          return yield* readPasskeyCommit(
            yield* persistence.cleanup({ moduleId, limit }, (value, journal) => journal.prepare(value))
          )
        })
      })
    })
  ).pipe(Layer.provide(passkeyRateLimiterLayer))

  const { Begin, Complete, Cleanup } = makePasskeyContract(moduleId, sessions).operations

  const handlersLayer = Layer.mergeAll(
    Begin.credentialHandlerLayer((input, invocation) =>
      Effect.flatMap(Passkeys, (service) => service.begin(invocation, input))
    ),
    Complete.credentialHandlerLayer((input, invocation) =>
      Effect.flatMap(Passkeys, (service) => service.complete(invocation, input))
    ),
    Cleanup.handlerLayer((input, invocation) =>
      Effect.flatMap(Passkeys, (service) => service.cleanup(invocation, input.limit))
    )
  )

  const actions = makePasskeyActions(moduleId, source)

  // Protocol verification is an explicit server capability. Keeping it out of
  // this shared contract avoids bundling the maintained verifier into clients.
  const strategyLayer = handlersLayer.pipe(
    Layer.provide(defaultLayer(Passkeys, layer)),
    Layer.provide(defaultLayer(ceremony.binding.RequestBinding, ceremony.binding.layer)),
    Layer.provide(hooksLayer)
  )

  const registration = <Registration extends Schema.Codec<unknown, unknown, unknown, unknown>>(
    codec: Registration
  ) => {
    const module = makePasskeyRegistration(moduleId, source, codec)

    return Object.freeze({
      ...module,
      strategy: makeAuthStrategy(
        {
          register: module.operations.Begin.invoke,
          completeRegistration: module.operations.Complete.invoke
        },
        module.handlersLayer.pipe(
          Layer.provide(defaultLayer(module.Registrations, module.layer)),
          Layer.provide(defaultLayer(module.binding.RequestBinding, module.binding.layer)),
          Layer.provide(hooksLayer)
        )
      )
    })
  }

  const management = (policy: PasskeyManagementPolicy) => {
    const configured = Object.freeze({ ...policy })
    const module = makePasskeyManagement(moduleId, source, configured, sessions)

    return Object.freeze({
      ...module,
      persistence: {
        kind: "passkey" as const,
        moduleId,
        policy: source,
        management: true as const,
        managementPolicy: configured
      },
      strategy: makeAuthStrategy(
        {
          enrollPasskey: module.operations.Begin.invoke,
          completePasskeyEnrollment: module.operations.Complete.invoke,
          listPasskeys: module.operations.List.invoke,
          renamePasskey: module.operations.Rename.invoke,
          removePasskey: module.operations.Remove.invoke
        },
        module.handlersLayer.pipe(
          Layer.provide(defaultLayer(module.Management, module.layer)),
          Layer.provide(defaultLayer(module.binding.RequestBinding, module.binding.layer)),
          Layer.provide(hooksLayer)
        )
      )
    })
  }

  const pendingModule = makePasskeyPending(moduleId, source, sessions)

  const pending = Object.freeze({
    ...pendingModule,
    strategy: makeAuthStrategy(
      {
        beginPending: pendingModule.operations.Begin.invoke,
        completePending: pendingModule.operations.Complete.invoke
      },
      pendingModule.handlersLayer.pipe(
        Layer.provide(defaultLayer(pendingModule.Pending, pendingModule.layer)),
        Layer.provide(
          defaultLayer(pendingModule.binding.RequestBinding, pendingModule.binding.layer)
        ),
        Layer.provide(hooksLayer)
      ),
      { completion: true }
    )
  })

  const stepUpModule = makePasskeyStepUp(moduleId, source, sessions)

  const stepUp = Object.freeze({
    ...stepUpModule,
    strategy: makeAuthStrategy(
      {
        beginStepUp: stepUpModule.operations.Begin.invoke,
        completeStepUp: stepUpModule.operations.Complete.invoke
      },
      stepUpModule.handlersLayer.pipe(
        Layer.provide(defaultLayer(stepUpModule.StepUp, stepUpModule.layer)),
        Layer.provide(
          defaultLayer(stepUpModule.binding.RequestBinding, stepUpModule.binding.layer)
        ),
        Layer.provide(hooksLayer)
      )
    )
  })

  return Object.freeze({
    persistence: { kind: "passkey" as const, moduleId, policy: source },
    strategy: makeAuthStrategy(
      { signIn: Begin.invoke, completeSignIn: Complete.invoke },
      strategyLayer,
      { completion: true }
    ),
    Passkeys,
    SessionClaims,
    binding: ceremony.binding,
    layer,
    handlersLayer,
    operations: Object.freeze({ Begin, Complete, Cleanup }),
    group: operationGroup(Begin, Complete, Cleanup),
    registration,
    management,
    pending,
    stepUp,
    actions
  })
}
