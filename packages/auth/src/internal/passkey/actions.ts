import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Layer from "effect/Layer"
import * as RateLimiter from "effect/persistence/RateLimiter"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import { boundedMemoryRateLimiter, localRateLimiter } from "../auth/rateLimiter.ts"
import { hasCommitScope, type PreparedCommit } from "../hooks/commit.ts"
import { LifecycleHooks } from "../hooks/lifecycleHooks.ts"
import { lifecycleSnapshotEffect } from "../hooks/models.ts"
import type { AuthOperationResult } from "../operations/credentials.ts"
import { makeRequestBinding } from "../operations/requestBinding.ts"
import { type AuthenticationEvidence, AuthenticationFlowId } from "../sessions/models.ts"
import { timeoutWithCause } from "../shared/timeout.ts"
import {
  PasskeyActionRequired,
  PasskeyConfigurationError,
  type PasskeyFailure,
  PasskeyMethodUnsupported,
  type PasskeyProtocolRejected,
  PasskeyRejected,
  PasskeyUnavailable
} from "./errors.ts"
import {
  PasskeyAccess,
  PasskeyAssertion,
  PasskeyAssertionVerified,
  PasskeyAttestation,
  PasskeyAuthenticationOptions,
  type PasskeyAuthenticationStarted,
  PasskeyBegin,
  PasskeyCeremony,
  PasskeyComplete,
  PasskeyContext,
  PasskeyCredential,
  type PasskeyDescriptor,
  PasskeyEnrollmentSnapshot,
  PasskeyEvidence,
  PasskeyIssueDecision,
  PasskeyModuleId,
  PasskeyProtocolCredentialId,
  type PasskeyPurpose,
  PasskeyRegistrationComplete,
  PasskeyRegistrationOptions,
  type PasskeyRegistrationStarted,
  PasskeyRegistrationVerified,
  type PasskeyRevision,
  PasskeyTarget,
  PasskeyUserHandle
} from "./models.ts"
import type { PasskeyConfig } from "./passkeyConfig.ts"
import { PasskeyCredentials } from "./passkeyCredentials.ts"
import { PasskeyPersistence, type PreparePasskeyCommit } from "./passkeyPersistence.ts"
import { PasskeyProtocol } from "./passkeyProtocol.ts"
import { PasskeyMethodPolicy, validatePasskeyPolicy } from "./policy.ts"
import { freezePasskey, samePasskey, snapshotPasskey, snapshotPasskeyResult } from "./snapshot.ts"

/** Module-wide budgets stay per instance and are shared by every passkey facet. */
class PasskeyModuleLimiter extends Context.Service<PasskeyModuleLimiter, RateLimiter.RateLimiter>()(
  "@effect/auth/PasskeyModuleLimiter"
) {}

// One memoized Layer per Auth graph, so all facets charge the same buckets.
/** @internal */
export const passkeyRateLimiterLayer = Layer.merge(
  boundedMemoryRateLimiter("reject"),
  Layer.effect(PasskeyModuleLimiter, localRateLimiter("reject"))
)

/** @internal */
export const passkeyNoAmbient = Effect.fnUntraced(function*() {
  if (yield* hasCommitScope) return yield* PasskeyMethodUnsupported.make({})
})

/** @internal */
export const readPasskeyCommit = <A>(receipt: PreparedCommit<A>) =>
  receipt.read.pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasskeyUnavailable.make({}))))
  )

/** @internal */
export const capturePasskeyPolicy = (input: PasskeyMethodPolicy) =>
  Effect.fromResult(snapshotPasskeyResult(PasskeyMethodPolicy, input)).pipe(
    Effect.mapError(() => PasskeyConfigurationError.make({})),
    Effect.flatMap(validatePasskeyPolicy)
  )

const clear = { _tag: "Clear", slot: "request-binding" } as const

const prepare = <A>(value: A, journal: Parameters<PreparePasskeyCommit<A, A>>[1]) => journal.prepare(value)

const now = DateTime.now.pipe(Effect.map(DateTime.toEpochMillis))

const bounded = <A, E, R>(operation: Effect.Effect<A, E, R>, millis: number) =>
  operation.pipe(Effect.interruptible, timeoutWithCause(Math.max(1, millis)))

interface RegistrationDraft {
  readonly ceremony: PasskeyCeremony
  readonly started: PasskeyRegistrationStarted
  readonly credentialCommands: AuthOperationResult<void>["credentialCommands"]
}

const envelope = Schema.Struct({
  id: PasskeyProtocolCredentialId,
  rawId: PasskeyProtocolCredentialId,
  type: Schema.Literal("public-key"),
  response: Schema.Struct({ userHandle: Schema.optionalKey(Schema.NullOr(PasskeyUserHandle)) })
})

const contextPurpose = {
  SignIn: "sign-in",
  Registration: "registration",
  Enrollment: "enrollment",
  Pending: "pending",
  StepUp: "step-up",
  Action: "action"
} as const

/**
 * Private ceremony machinery shared by separately enabled facets. No generic
 * evidence operation is installed. Callers authenticate target contexts first.
 *
 * @internal
 */
export const makePasskeyCeremony = <const Id extends string, const Purpose extends PasskeyPurpose>(
  moduleId: Id,
  source: Effect.Effect<PasskeyMethodPolicy, PasskeyConfigurationError, PasskeyConfig>,
  purpose: Purpose
) => {
  const binding = makeRequestBinding(moduleId, `passkey-${purpose}`)

  const make = Effect.gen(function*() {
    const policy = yield* source

    const id = yield* Schema.decodeEffect(PasskeyModuleId)(moduleId).pipe(
      Effect.mapError(() => PasskeyConfigurationError.make({}))
    )

    const protocol = yield* PasskeyProtocol
    const persistence = yield* PasskeyPersistence
    const binder = yield* binding.RequestBinding
    const randomSource = yield* SecureRandom.SecureRandom
    const hooks = yield* LifecycleHooks
    const shared = yield* RateLimiter.RateLimiter
    const local = yield* PasskeyModuleLimiter

    const admit = (scope: "global" | "subject" | "target", key: string) =>
      (scope === "global" ? local : shared)
        .consume({
          key: `effect-auth:passkey:${JSON.stringify([moduleId, scope, key])}`,
          algorithm: "token-bucket",
          limit: policy.admission[scope].limit,
          window: Duration.millis(policy.admission[scope].windowMillis),
          tokens: 1,
          onExceeded: "fail"
        })
        .pipe(
          Effect.asVoid,
          Effect.catchCause((cause) =>
            Effect.failCause(
              Cause.map(cause, (error) =>
                error.reason._tag === "RateLimitExceeded"
                  ? PasskeyRejected.make({})
                  : PasskeyUnavailable.make({}))
            )
          )
        )

    const admitContext = Effect.fnUntraced(function*(context: PasskeyContext) {
      if (context._tag === "Enrollment") yield* admit("subject", context.revision.subjectId)
      if ("target" in context) {
        yield* admit("subject", context.target.revision.subjectId)
        yield* admit(
          "target",
          JSON.stringify([context.target.moduleId, context.target.kind, context.target.flowId])
        )
      }
    })

    const random = () =>
      randomSource.randomBytes(32).pipe(
        Effect.map(Base64Url.encode),
        Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasskeyUnavailable.make({})))),
        Effect.catchDefect(() => Effect.fail(PasskeyUnavailable.make({})))
      )

    const profile = (profileId: string) =>
      Effect.fromNullishOr(policy.profiles.find((value) => value.profileId === profileId)).pipe(
        Effect.mapError(() => PasskeyRejected.make({}))
      )

    const access = Effect.fn("Passkey.access")(function*(
      input: Pick<PasskeyComplete, "flowId" | "bindingCredential">
    ) {
      const verified = yield* binder
        .verify(input.flowId, input.bindingCredential)
        .pipe(
          Effect.catchCause((cause) =>
            Effect.failCause(
              Cause.map(cause, (error) =>
                error._tag === "RequestBindingUnavailable"
                  ? PasskeyUnavailable.make({})
                  : PasskeyRejected.make({}))
            )
          )
        )

      return yield* snapshotPasskey(PasskeyAccess, {
        moduleId: id,
        purpose,
        flowId: input.flowId,
        requestBindingVerifier: verified.verifier,
        requestBindingExpiresAtMillis: verified.expiresAtMillis
      })
    })

    const validateInspection = Effect.fnUntraced(function*(
      key: PasskeyAccess,
      raw: PasskeyCeremony,
      expected?: PasskeyContext
    ) {
      const ceremony = yield* snapshotPasskey(PasskeyCeremony, raw),
        clock = yield* now

      if (
        ceremony.moduleId !== id ||
        ceremony.purpose !== purpose ||
        contextPurpose[ceremony.context._tag] !== purpose ||
        ceremony.flowId !== key.flowId ||
        ceremony.requestBindingVerifier !== key.requestBindingVerifier ||
        ceremony.requestBindingExpiresAtMillis !== key.requestBindingExpiresAtMillis ||
        ceremony.issuedAtMillis > clock ||
        ceremony.expiresAtMillis <= clock ||
        ceremony.expiresAtMillis > ceremony.requestBindingExpiresAtMillis ||
        ceremony.expiresAtMillis <= ceremony.issuedAtMillis
      ) {
        return yield* PasskeyRejected.make({})
      }
      if (
        ceremony.context._tag === "SignIn" &&
        (!ceremony.profile.primarySignIn ||
          ceremony.profile.residentKey !== "required" ||
          ceremony.profile.userVerification !== "required")
      ) {
        return yield* PasskeyRejected.make({})
      }
      if (
        expected !== undefined &&
        !(yield* samePasskey(PasskeyContext, ceremony.context, expected))
      ) {
        return yield* PasskeyRejected.make({})
      }

      return { key, ceremony }
    })

    const inspect = Effect.fn("Passkey.inspect")(function*(
      input: Pick<PasskeyComplete, "flowId" | "bindingCredential">,
      expected?: PasskeyContext
    ) {
      yield* passkeyNoAmbient()
      input = yield* snapshotPasskey(
        Schema.toType(
          Schema.Struct({
            flowId: PasskeyComplete.fields.flowId,
            bindingCredential: PasskeyComplete.fields.bindingCredential
          })
        ),
        input
      )

      yield* admit("global", moduleId)

      const key = yield* access(input),
        raw = yield* persistence.context(key)

      if (raw === undefined) return yield* PasskeyRejected.make({})

      const inspected = yield* validateInspection(key, raw, expected)

      yield* admitContext(inspected.ceremony.context)

      return inspected
    })

    const before = Effect.fn("Passkey.before")(function*(context: PasskeyContext) {
      yield* hooks.before(
        yield* lifecycleSnapshotEffect({
          action: purpose === "registration"
            ? "registration"
            : purpose === "enrollment"
            ? "credential-change"
            : purpose === "sign-in"
            ? "sign-in"
            : "proof-verification",
          operation: `${moduleId}/passkey/${purpose}`,
          method: "passkey",
          identifiers: [],
          ...(context._tag === "Enrollment"
            ? { subjectId: context.revision.subjectId }
            : "target" in context
            ? { subjectId: context.target.revision.subjectId }
            : {})
        }).pipe(Effect.orDie)
      )
    })

    const newCeremony = Effect.fn("Passkey.newCeremony")(function*(
      input: PasskeyBegin,
      context: PasskeyContext,
      allowed: ReadonlyArray<typeof PasskeyDescriptor.Type>
    ) {
      yield* passkeyNoAmbient()
      yield* admit("global", moduleId)
      yield* admitContext(context)

      const selected = yield* profile(input.profileId)

      if (contextPurpose[context._tag] !== purpose) return yield* PasskeyRejected.make({})
      const fixed = yield* snapshotPasskey(PasskeyContext, context)

      yield* before(fixed)

      const issued = yield* binder
        .issue(input.flowId)
        .pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasskeyUnavailable.make({}))))
        )

      const command = issued.credentialCommands[0]

      if (command?._tag !== "Issue") return yield* PasskeyUnavailable.make({})

      const verified = yield* binder
        .verify(input.flowId, command.credential)
        .pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasskeyUnavailable.make({}))))
        )

      const timestamp = yield* now

      const expiresAtMillis = Math.min(
        timestamp + policy.lifetimeMillis,
        verified.expiresAtMillis,
        "target" in fixed ? fixed.target.expiresAtMillis : Infinity,
        "target" in fixed && fixed.target.requirement !== undefined
          ? timestamp + fixed.target.requirement.maximumAgeMillis
          : Infinity
      )

      if (expiresAtMillis <= timestamp) return yield* PasskeyRejected.make({})

      const ceremony = yield* snapshotPasskey(PasskeyCeremony, {
        moduleId: id,
        flowId: input.flowId,
        commandId: input.commandId,
        purpose,
        profile: selected,
        challenge: yield* random(),
        requestBindingVerifier: verified.verifier,
        requestBindingExpiresAtMillis: verified.expiresAtMillis,
        issuedAtMillis: timestamp,
        expiresAtMillis,
        allowedCredentials: allowed,
        context: fixed
      })

      return { ceremony, commands: issued.credentialCommands }
    })

    const beginAuthentication = Effect.fn("Passkey.beginAuthentication")(function*(
      input: PasskeyBegin,
      context: PasskeyContext,
      allowed: ReadonlyArray<typeof PasskeyDescriptor.Type> = []
    ) {
      input = yield* snapshotPasskey(PasskeyBegin, input)
      const { ceremony, commands } = yield* newCeremony(input, context, allowed)

      if (
        context._tag === "SignIn" &&
        (!ceremony.profile.primarySignIn ||
          ceremony.profile.residentKey !== "required" ||
          ceremony.profile.userVerification !== "required")
      ) {
        return yield* PasskeyRejected.make({})
      }

      const options = yield* snapshotPasskey(
        PasskeyAuthenticationOptions,
        yield* protocol
          .prepareAuthentication({
            profile: ceremony.profile,
            challenge: ceremony.challenge,
            timeoutMillis: ceremony.expiresAtMillis - ceremony.issuedAtMillis,
            allowedCredentials: ceremony.allowedCredentials
          })
          .pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasskeyUnavailable.make({}))))
          )
      )

      if (
        options.challenge !== ceremony.challenge ||
        options.rpId !== ceremony.profile.rpId ||
        options.userVerification !== ceremony.profile.userVerification ||
        options.timeout > ceremony.expiresAtMillis - ceremony.issuedAtMillis ||
        options.timeout <= 0 ||
        options.allowCredentials.length !== ceremony.allowedCredentials.length ||
        options.allowCredentials.some(
          (item, index) => item.id !== ceremony.allowedCredentials[index]?.id
        )
      ) {
        return yield* PasskeyUnavailable.make({})
      }

      const result = yield* snapshotPasskey(
        PasskeyIssueDecision,
        yield* readPasskeyCommit(yield* persistence.issue({ ceremony }, prepare))
      )

      if (result._tag !== "Issued") return yield* PasskeyRejected.make({})
      if (
        !(yield* samePasskey(PasskeyCeremony, result.ceremony, ceremony)) ||
        (yield* now) >= ceremony.expiresAtMillis
      ) {
        return yield* PasskeyUnavailable.make({})
      }

      return {
        value: { flowId: input.flowId, expiresAtMillis: ceremony.expiresAtMillis, options },
        credentialCommands: commands
      } satisfies AuthOperationResult<PasskeyAuthenticationStarted>
    })

    const prepareRegistration = Effect.fn("Passkey.prepareRegistration")(function*(
      input: PasskeyBegin,
      context: Extract<PasskeyContext, { readonly _tag: "Registration" | "Enrollment" }>,
      excluded: ReadonlyArray<typeof PasskeyDescriptor.Type>
    ) {
      input = yield* snapshotPasskey(PasskeyBegin, input)
      context = yield* snapshotPasskey(
        Schema.Union([PasskeyContext.members[1], PasskeyContext.members[2]]),
        context
      )
      const { ceremony, commands } = yield* newCeremony(input, context, excluded)

      const options = yield* snapshotPasskey(
        PasskeyRegistrationOptions,
        yield* protocol
          .prepareRegistration({
            profile: ceremony.profile,
            challenge: ceremony.challenge,
            timeoutMillis: ceremony.expiresAtMillis - ceremony.issuedAtMillis,
            userHandle: context.userHandle,
            name: context.name,
            displayName: context._tag === "Registration" ? context.displayName : context.name,
            excludedCredentials: excluded
          })
          .pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => PasskeyUnavailable.make({}))))
          )
      )

      if (
        options.challenge !== ceremony.challenge ||
        options.rp.id !== ceremony.profile.rpId ||
        options.rp.name !== ceremony.profile.rpName ||
        options.user.id !== context.userHandle ||
        options.user.name !== context.name ||
        options.user.displayName !==
          (context._tag === "Registration" ? context.displayName : context.name) ||
        options.attestation !== "none" ||
        options.timeout <= 0 ||
        options.timeout > ceremony.expiresAtMillis - ceremony.issuedAtMillis ||
        options.authenticatorSelection.userVerification !== ceremony.profile.userVerification ||
        options.authenticatorSelection.residentKey !== ceremony.profile.residentKey ||
        options.pubKeyCredParams.length !== ceremony.profile.algorithms.length ||
        options.pubKeyCredParams.some(
          (item, index) => item.alg !== ceremony.profile.algorithms[index]
        ) ||
        options.excludeCredentials.length !== excluded.length ||
        options.excludeCredentials.some((item, index) => item.id !== excluded[index]?.id)
      ) {
        return yield* PasskeyUnavailable.make({})
      }

      const draft: RegistrationDraft = {
        ceremony,
        started: { flowId: input.flowId, expiresAtMillis: ceremony.expiresAtMillis, options },
        credentialCommands: commands
      }

      freezePasskey(draft)

      return draft
    })

    const acceptRegistrationIssue = Effect.fn("Passkey.acceptRegistrationIssue")(function*(
      draft: RegistrationDraft,
      decision: PasskeyIssueDecision
    ) {
      const result = yield* snapshotPasskey(PasskeyIssueDecision, decision)

      if (result._tag !== "Issued") return yield* PasskeyRejected.make({})
      if (
        !(yield* samePasskey(PasskeyCeremony, result.ceremony, draft.ceremony)) ||
        (yield* now) >= draft.ceremony.expiresAtMillis
      ) {
        return yield* PasskeyUnavailable.make({})
      }

      return {
        value: draft.started,
        credentialCommands: draft.credentialCommands
      } satisfies AuthOperationResult<PasskeyRegistrationStarted>
    })

    const verify = <A, R>(
      ceremony: PasskeyCeremony,
      operation: Effect.Effect<A, PasskeyFailure | PasskeyProtocolRejected, R>
    ) =>
      bounded(operation, ceremony.expiresAtMillis - ceremony.issuedAtMillis).pipe(
        Effect.catchCause((cause) =>
          Effect.failCause(
            Cause.map(cause, (error) => error._tag === "TimeoutError" ? PasskeyUnavailable.make({}) : error)
          )
        ),
        Effect.catchCause((cause) =>
          Effect.failCause(
            Cause.map(cause, (error) => error._tag === "PasskeyProtocolRejected" ? PasskeyRejected.make({}) : error)
          )
        )
      )

    const authentication = Effect.fn("Passkey.authentication")(function*(
      input: PasskeyComplete,
      expected: PasskeyContext
    ) {
      input = yield* snapshotPasskey(Schema.toType(PasskeyComplete), input)
      const inspected = yield* inspect(input, expected)

      yield* before(inspected.ceremony.context)

      yield* Schema.decodeEffect(Schema.toType(PasskeyAssertion))(input.response).pipe(
        Effect.mapError(() => PasskeyRejected.make({}))
      )

      const decoded = yield* Schema.decodeEffect(Schema.fromJsonString(envelope))(
        Redacted.value(input.response)
      ).pipe(Effect.result)

      let credential: PasskeyCredential | undefined

      if (decoded._tag === "Success" && decoded.success.id === decoded.success.rawId) {
        const found = yield* (yield* PasskeyCredentials).lookup({
          rpId: inspected.ceremony.profile.rpId,
          protocolCredentialId: decoded.success.id
        })

        if (found !== undefined) credential = yield* snapshotPasskey(PasskeyCredential, found)
      }

      const verified = yield* verify(
        inspected.ceremony,
        Effect.gen(function*() {
          if (credential === undefined || decoded._tag !== "Success") {
            return yield* PasskeyRejected.make({})
          }

          const ceremony = inspected.ceremony,
            context = ceremony.context

          const supplied = decoded.success.response.userHandle ?? undefined

          if (
            !credential.active ||
            credential.rpId !== ceremony.profile.rpId ||
            credential.protocolCredentialId !== decoded.success.id ||
            credential.profile.rpId !== credential.rpId ||
            !ceremony.profile.algorithms.includes(credential.algorithm) ||
            (credential.backupState && !credential.backupEligible) ||
            !credential.revision.credentials.some(
              (item) => item.credentialId === credential.credentialId
            )
          ) {
            return yield* PasskeyRejected.make({})
          }
          if (
            ceremony.allowedCredentials.length > 0 &&
            !ceremony.allowedCredentials.some((item) => item.id === credential.protocolCredentialId)
          ) {
            return yield* PasskeyRejected.make({})
          }
          if (
            (supplied !== undefined && supplied !== credential.userHandle) ||
            (context._tag === "SignIn" &&
              (supplied === undefined ||
                !credential.primarySignIn ||
                !credential.enrollmentUserVerified ||
                !credential.profile.primarySignIn ||
                credential.profile.userVerification !== "required"))
          ) {
            return yield* PasskeyRejected.make({})
          }
          if (
            "target" in context &&
            context.target.revision.subjectId !== credential.revision.subjectId
          ) {
            return yield* PasskeyRejected.make({})
          }
          const original = "target" in context ? context.target.revision : credential.revision

          const revision = credential.revision

          if (context._tag === "SignIn") yield* admit("subject", revision.subjectId)

          if (
            revision.securityRevision !== original.securityRevision ||
            revision.subjectId !== original.subjectId ||
            original.credentials.some(
              (item) =>
                !revision.credentials.some(
                  (current) =>
                    current.credentialId === item.credentialId &&
                    current.revision === item.revision
                )
            )
          ) {
            return yield* PasskeyRejected.make({})
          }

          const result = yield* snapshotPasskey(
            PasskeyAssertionVerified,
            yield* protocol.verifyAuthentication({
              ceremony,
              credential,
              response: input.response
            })
          )

          if (
            result.protocolCredentialId !== credential.protocolCredentialId ||
            result.userHandle !== supplied ||
            result.backupEligible !== credential.backupEligible ||
            (result.backupState && !result.backupEligible) ||
            ((context._tag === "SignIn" || ceremony.profile.userVerification === "required") &&
              !result.userVerified) ||
            (!credential.backupEligible &&
              (credential.counter > 0 || result.counter > 0) &&
              result.counter <= credential.counter)
          ) {
            return yield* PasskeyRejected.make({})
          }

          const evidence = yield* snapshotPasskey(PasskeyEvidence, {
            revision,
            flowId: "target" in context
              ? context.target.flowId
              : AuthenticationFlowId.make(ceremony.flowId),
            bindingDigest: "target" in context ? context.target.bindingDigest : ceremony.requestBindingVerifier,
            proofs: [
              {
                method: "passkey",
                credentialId: credential.credentialId,
                factors: ["possession"],
                userVerified: result.userVerified,
                phishingResistant: true,
                verifiedAt: DateTime.makeUnsafe(ceremony.issuedAtMillis)
              }
            ]
          })

          return { evidence, credential, ceremony, assertion: result }
        })
      )

      const consumed = yield* readPasskeyCommit(
        yield* persistence.consume(
          {
            access: inspected.key,
            ceremony: verified.ceremony,
            credential: verified.credential,
            assertion: verified.assertion
          },
          prepare
        )
      )

      if (consumed !== "Verified") return yield* PasskeyRejected.make({})

      return { ...verified, credentialCommands: [clear] as const }
    })

    const verifyRegistration = Effect.fn("Passkey.verifyRegistration")(function*(
      input: PasskeyRegistrationComplete,
      captured: Effect.Success<ReturnType<typeof inspect>>
    ) {
      yield* passkeyNoAmbient()
      input = yield* snapshotPasskey(Schema.toType(PasskeyRegistrationComplete), input)
      const inspected = captured

      yield* before(inspected.ceremony.context)

      if (
        inspected.ceremony.context._tag !== "Registration" &&
        inspected.ceremony.context._tag !== "Enrollment"
      ) {
        return yield* PasskeyRejected.make({})
      }
      yield* Schema.decodeEffect(Schema.toType(PasskeyAttestation))(input.response).pipe(
        Effect.mapError(() => PasskeyRejected.make({}))
      )

      const verified = yield* verify(
        inspected.ceremony,
        Effect.gen(function*() {
          const result = yield* snapshotPasskey(
            PasskeyRegistrationVerified,
            yield* protocol.verifyRegistration({
              ceremony: inspected.ceremony,
              response: input.response
            })
          )

          if (
            (result.backupState && !result.backupEligible) ||
            (inspected.ceremony.profile.userVerification === "required" && !result.userVerified) ||
            !inspected.ceremony.profile.algorithms.includes(result.algorithm)
          ) {
            return yield* PasskeyRejected.make({})
          }

          return result
        })
      )

      return Object.freeze({ access: inspected.key, ceremony: inspected.ceremony, verified })
    })

    const exclusions = Effect.fn("Passkey.exclusions")(function*(
      profileId: string,
      subjectId: (typeof PasskeyRevision.Type)["subjectId"]
    ) {
      const selected = yield* profile(profileId)

      const captured = yield* (yield* PasskeyCredentials).listForSubject({
        moduleId: id,
        rpId: selected.rpId,
        subjectId
      })

      if (captured === undefined || captured.revision.subjectId !== subjectId) {
        return yield* PasskeyRejected.make({})
      }

      return yield* snapshotPasskey(PasskeyEnrollmentSnapshot, captured)
    })

    return {
      policy,
      profile,
      random,
      inspect,
      beginAuthentication,
      prepareRegistration,
      acceptRegistrationIssue,
      authentication,
      verifyRegistration,
      exclusions,
      clear
    }
  })

  return { binding, make }
}

/**
 * Trusted target adapters only. Possession of a public flow/digest is not target
 * authorization; callers MUST resolve the private target capability each time.
 *
 * @internal
 */
export const makePasskeyActions = <const Id extends string>(
  moduleId: Id,
  source: Effect.Effect<PasskeyMethodPolicy, PasskeyConfigurationError, PasskeyConfig>
) => {
  const ceremony = makePasskeyCeremony(moduleId, source, "action")

  const PasskeyActionAssertions = Context.Service<
    { readonly moduleId: Id; readonly kind: "passkey-actions" },
    {
      readonly begin: (
        input: PasskeyBegin,
        target: PasskeyTarget
      ) => Effect.Effect<AuthOperationResult<PasskeyAuthenticationStarted>, PasskeyFailure>
      readonly complete: (
        input: PasskeyComplete,
        target: PasskeyTarget
      ) => Effect.Effect<
        {
          readonly evidence: AuthenticationEvidence
          readonly credentialCommands: AuthOperationResult<void>["credentialCommands"]
        },
        PasskeyFailure
      >
    }
  >(`@effect/auth/PasskeyActionAssertions/${moduleId.length}:${moduleId}`)

  const layer = Layer.effect(
    PasskeyActionAssertions,
    Effect.gen(function*() {
      const runtime = yield* ceremony.make,
        credentials = yield* PasskeyCredentials

      return PasskeyActionAssertions.of({
        begin: Effect.fn("PasskeyActionAssertions.begin")(
          function*(input, target) {
            const fixed = yield* snapshotPasskey(PasskeyTarget, target)
            const captured = yield* runtime.exclusions(input.profileId, fixed.revision.subjectId)

            if (
              captured.revision.securityRevision !== fixed.revision.securityRevision ||
              fixed.revision.credentials.some(
                (item) =>
                  !captured.revision.credentials.some(
                    (current) =>
                      current.credentialId === item.credentialId &&
                      current.revision === item.revision
                  )
              )
            ) {
              return yield* PasskeyActionRequired.make({})
            }

            return yield* runtime.beginAuthentication(
              input,
              { _tag: "Action", target: fixed },
              captured.credentials
            )
          },
          Effect.provideService(PasskeyCredentials, credentials)
        ),
        complete: Effect.fn("PasskeyActionAssertions.complete")(
          function*(input, target) {
            const fixed = yield* snapshotPasskey(PasskeyTarget, target)

            return yield* runtime.authentication(input, { _tag: "Action", target: fixed })
          },
          Effect.provideService(PasskeyCredentials, credentials)
        )
      })
    })
  ).pipe(Layer.provide(passkeyRateLimiterLayer))

  return Object.freeze({ PasskeyActionAssertions, binding: ceremony.binding, layer })
}
