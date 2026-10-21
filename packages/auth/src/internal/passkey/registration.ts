import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as Types from "effect/Types"

import { makeRegistration as makePasskeyRegistrationContract } from "../../PasskeyContract.ts"
import { TokenDigest } from "../../Schema.ts"
import type { PreparedCommit } from "../hooks/commit.ts"
import { lifecycleEvent, LifecycleEventId, lifecycleSnapshot } from "../hooks/models.ts"
import type { AuthInvocation } from "../operations/context.ts"
import type { AuthOperationResult } from "../operations/credentials.ts"
import { operationGroup } from "../operations/operation.ts"
import { makePasskeyCeremony, passkeyNoAmbient, passkeyRateLimiterLayer, readPasskeyCommit } from "./actions.ts"
import type { PasskeyConfigurationError, PasskeyFailure } from "./errors.ts"
import { PasskeyRejected, PasskeyUnavailable } from "./errors.ts"
import type {
  PasskeyAccess,
  PasskeyCeremony,
  PasskeyRegistrationStarted,
  PasskeyRegistrationVerified
} from "./models.ts"
import {
  PasskeyIssueDecision,
  PasskeyLabel,
  PasskeyRegistrationComplete,
  PasskeyRegistrationResult,
  PasskeyUserHandle
} from "./models.ts"
import type { PasskeyConfig } from "./passkeyConfig.ts"
import type { PreparePasskeyCommit } from "./passkeyPersistence.ts"
import type { PasskeyMethodPolicy } from "./policy.ts"
import { freezePasskey, snapshotPasskey, snapshotPasskeySync } from "./snapshot.ts"
const decision = Schema.Union([PasskeyRegistrationResult, Schema.TaggedStruct("Rejected", {})])

const inspection = Schema.Struct({
  fingerprint: TokenDigest.check(Schema.isMaxLength(256)),
  eligible: Schema.Boolean,
  name: PasskeyLabel,
  displayName: PasskeyLabel
})

/**
 * Exact application registration intent is owned by the optional authority.
 * No Claims/session dependency and no registration-time authentication proof.
 *
 * @internal
 */
export const makePasskeyRegistration = <
  const Id extends string,
  Registration extends Schema.Codec<unknown, unknown, unknown, unknown>
>(
  moduleId: Id,
  source: Effect.Effect<PasskeyMethodPolicy, PasskeyConfigurationError, PasskeyConfig>,
  codec: Registration
) => {
  const {
    BeginInput,
    RegistrationCodec,
    operations: { Begin, Complete }
  } = makePasskeyRegistrationContract(moduleId, codec)

  const ceremony = makePasskeyCeremony(moduleId, source, "registration")

  const RegistrationAuthority = Context.Service<
    {
      readonly moduleId: Id
      readonly kind: "passkey-registration-authority"
      readonly registration: Types.Invariant<Registration>
    },
    {
      readonly inspect: (
        registration: Registration["Type"]
      ) => Effect.Effect<typeof inspection.Type, PasskeyUnavailable>
      /** Reserve exact application intent/fingerprint, random handle, challenge and
       * application snapshot in SAME owner; no subject yet. No adoption by command/flow. */
      readonly issueRegistration: <A>(
        input: {
          readonly ceremony: PasskeyCeremony
          readonly registration: Registration["Type"]
        },
        prepare: PreparePasskeyCommit<PasskeyIssueDecision, A>
      ) => Effect.Effect<PreparedCommit<A>, PasskeyUnavailable>
      /** Exact challenge/fingerprint/original schema-decoded application data;
       * RP-global credential uniqueness and the selected enrollment profile. Atomically consume,
       * provision the subject and credential/shared factor synchronously.
       * Provisioning is idempotent by requestId; an unknown commit outcome never
       * authorizes a second account or credential issuance.
       * Final owner clock checks expiry and all postconditions after last writes. */
      readonly completeRegistration: <A>(
        input: {
          readonly access: PasskeyAccess
          readonly ceremony: PasskeyCeremony
          readonly verified: PasskeyRegistrationVerified
        },
        prepare: PreparePasskeyCommit<typeof decision.Type, A>
      ) => Effect.Effect<PreparedCommit<A>, PasskeyUnavailable>
    }
  >(`@effect/auth/PasskeyRegistrationAuthority/${moduleId.length}:${moduleId}`)

  const Registrations = Context.Service<
    {
      readonly moduleId: Id
      readonly kind: "passkey-registration"
      readonly registration: Types.Invariant<Registration>
    },
    {
      readonly begin: (
        invocation: AuthInvocation,
        input: typeof BeginInput.Type
      ) => Effect.Effect<AuthOperationResult<PasskeyRegistrationStarted>, PasskeyFailure>
      readonly complete: (
        invocation: AuthInvocation,
        input: PasskeyRegistrationComplete
      ) => Effect.Effect<AuthOperationResult<PasskeyRegistrationResult>, PasskeyFailure>
    }
  >(`@effect/auth/PasskeyRegistrations/${moduleId.length}:${moduleId}`)

  const layer = Layer.effect(
    Registrations,
    Effect.gen(function*() {
      const runtime = yield* ceremony.make,
        authority = yield* RegistrationAuthority

      const services = yield* Effect.context<
        Registration["DecodingServices"] | Registration["EncodingServices"]
      >()

      const dataCodec = Schema.toCodecJson(Schema.toType(RegistrationCodec))

      const data = Effect.fn("PasskeyRegistration.data")(
        function*(value: Registration["Type"]) {
          const encoded = yield* Schema.encodeEffect(dataCodec)(value)
          const decoded = yield* Schema.decodeEffect(dataCodec)(encoded)

          freezePasskey(decoded)

          return decoded
        },
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasskeyUnavailable.make({})))),
        Effect.provide(services)
      )

      return Registrations.of({
        begin: Effect.fn("PasskeyRegistration.begin")(
          function*(invocation, input) {
            const authority = yield* RegistrationAuthority

            yield* passkeyNoAmbient()
            if (invocation._tag !== "Guest") return yield* PasskeyRejected.make({})
            const selected = yield* runtime.profile(input.profileId)

            if (
              !selected.primarySignIn ||
              selected.residentKey !== "required" ||
              selected.userVerification !== "required"
            ) {
              return yield* PasskeyRejected.make({})
            }

            const registration = yield* data(input.registration),
              inspected = yield* snapshotPasskey(
                inspection,
                yield* authority.inspect(yield* data(registration))
              )

            if (!inspected.eligible) return yield* PasskeyRejected.make({})

            const context = {
              _tag: "Registration" as const,
              fingerprint: inspected.fingerprint,
              userHandle: PasskeyUserHandle.make(yield* runtime.random()),
              name: inspected.name,
              displayName: inspected.displayName
            }

            const draft = yield* runtime.prepareRegistration(input, context, [])

            const issued = yield* readPasskeyCommit(
              yield* authority.issueRegistration(
                { ceremony: draft.ceremony, registration },
                (value, journal) => journal.prepare(snapshotPasskeySync(PasskeyIssueDecision, value))
              )
            )

            return yield* runtime.acceptRegistrationIssue(draft, issued)
          },
          Effect.provideService(RegistrationAuthority, authority)
        ),
        complete: Effect.fn("PasskeyRegistration.complete")(
          function*(invocation, input) {
            yield* passkeyNoAmbient()
            if (invocation._tag !== "Guest") return yield* PasskeyRejected.make({})
            input = yield* snapshotPasskey(Schema.toType(PasskeyRegistrationComplete), input)
            const inspected = yield* runtime.inspect(input)

            const {
              access,
              ceremony: original,
              verified
            } = yield* runtime.verifyRegistration(input, inspected)

            const authority = yield* RegistrationAuthority
            const timestamp = DateTime.toEpochMillis(yield* DateTime.now)

            const result = yield* readPasskeyCommit(
              yield* authority.completeRegistration(
                { access, ceremony: original, verified },
                (value, journal) => {
                  const projected = snapshotPasskeySync(decision, value)

                  if (projected._tag === "RegistrationAccepted") {
                    journal.stage(
                      lifecycleEvent({
                        id: LifecycleEventId.make(
                          `passkey-registration/${moduleId}/${original.flowId}`
                        ),
                        occurredAtMillis: timestamp,
                        snapshot: lifecycleSnapshot({
                          action: "registration",
                          operation: `${moduleId}/passkey/registration/complete`,
                          method: "passkey",
                          identifiers: []
                        })
                      })
                    )
                  }

                  return journal.prepare(projected)
                }
              )
            )

            if (result._tag === "Rejected") return yield* PasskeyRejected.make({})

            return { value: result, credentialCommands: [runtime.clear] }
          },
          Effect.provideService(RegistrationAuthority, authority)
        )
      })
    })
  ).pipe(Layer.provide(passkeyRateLimiterLayer))

  return Object.freeze({
    RegistrationAuthority,
    Registrations,
    binding: ceremony.binding,
    layer,
    operations: Object.freeze({ Begin, Complete }),
    group: operationGroup(Begin, Complete),
    handlersLayer: Layer.mergeAll(
      Begin.credentialHandlerLayer((input, invocation) =>
        Effect.flatMap(Registrations, (service) => service.begin(invocation, input))
      ),
      Complete.credentialHandlerLayer((input, invocation) =>
        Effect.flatMap(Registrations, (service) => service.complete(invocation, input))
      )
    )
  })
}
