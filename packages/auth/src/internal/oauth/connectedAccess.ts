import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

import { hasCommitScope, type PreparedCommit } from "../hooks/commit.ts"
import { type AuthInvocation, requireAuthenticated } from "../operations/context.ts"
import { AuthenticationRequired } from "../operations/errors.ts"
import { SecurityRevision } from "../sessions/models.ts"
import { markAuthFailureReported, reportAuthFailure } from "../shared/diagnostics.ts"
import { timeoutWithCause } from "../shared/timeout.ts"
import { OAuthAccountRevision } from "./accountsModels.ts"
import * as ConnectedModels from "./connectedModels.ts"
import { retainGrantTokens, wipeConnectedMaterial } from "./grantTokens.ts"
import { OAuthConnectedPersistence } from "./oauthConnectedPersistence.ts"
import { OAuthConnectedProtocol } from "./oauthConnectedProtocol.ts"
import { OAuthConnectedTokenProtector } from "./oauthConnectedTokenProtector.ts"
import { OAuthConnectedUseAuthority } from "./oauthConnectedUseAuthority.ts"
import { OAuthConfigurationError, OAuthMethodUnsupported, OAuthRejected, OAuthUnavailable } from "./signInErrors.ts"
import { OAuthClaimId, OAuthExternalIdentity, OAuthModuleId } from "./signInModels.ts"
import { makeOAuthSnapshot } from "./signInSnapshot.ts"

export const OAuthConnectedAccessFailure = Schema.Union([
  AuthenticationRequired,
  OAuthRejected,
  OAuthUnavailable,
  OAuthMethodUnsupported,
  ConnectedModels.OAuthConnectedBusy,
  ConnectedModels.OAuthConnectedReauthorizationRequired
])

export type OAuthConnectedAccessFailure = typeof OAuthConnectedAccessFailure.Type

/**
 * Application services may run without an operation transport. Observe their
 * owned defects once while retaining the complete private Cause for callers.
 *
 * @internal
 */
export const reportConnectedFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.uninterruptibleMask((restore) =>
    restore(effect).pipe(
      Effect.catchCause((cause) =>
        Cause.hasDies(cause)
          ? reportAuthFailure("oauth-connected", cause).pipe(
            Effect.andThen(Effect.failCause(markAuthFailureReported(cause)))
          )
          : Effect.failCause(cause)
      )
    )
  )

const invocationSchema = ConnectedModels.OAuthConnectedCaller

/** @internal */
export const connectedCaller = Effect.fnUntraced(function*(
  invocation: AuthInvocation
) {
  if (yield* hasCommitScope) return yield* OAuthMethodUnsupported.make({})

  return yield* snapshotInvocationSchema.effect(yield* requireAuthenticated(invocation))
})

/** @internal */
export const connectedRead = <A>(receipt: PreparedCommit<A>) =>
  receipt.read.pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
  )

/**
 * Cooperative deadline: cancellation waits for scoped driver/resource cleanup,
 * including uninterruptible commit finalizers. It is not a hard wall-clock bound.
 *
 * @internal
 */
export const connectedBounded = <A, E, R>(effect: Effect.Effect<A, E, R>, millis: number) =>
  effect.pipe(Effect.interruptible, timeoutWithCause(millis))

/** @internal */
export const connectedSame = <A>(schema: Schema.Codec<A, unknown, never, never>, a: A, b: A) =>
  Schema.encodeSync(Schema.fromJsonString(schema))(a) ===
    Schema.encodeSync(Schema.fromJsonString(schema))(b)

/** @internal */
export const captureConnectedPolicy = (input: ConnectedModels.OAuthConnectedPolicy) => {
  return Result.getOrUndefined(snapshotOAuthConnectedPolicy.result(input))
}

/** @internal */
export const validateConnectedPolicy = Effect.fnUntraced(function*(
  moduleId: string,
  captured: ConnectedModels.OAuthConnectedPolicy | undefined
) {
  const id = yield* Schema.decodeEffect(OAuthModuleId)(moduleId).pipe(
    Effect.mapError(() => OAuthConfigurationError.make({ reason: "module" }))
  )

  if (!captured) return yield* OAuthConfigurationError.make({ reason: "policy" })

  const seen = new Set<string>(),
    active = new Set<string>()

  for (const profile of captured.profiles) {
    const key = profile.key + ":" + profile.generation

    if (
      seen.has(key) ||
      (profile.issuance === "active" && active.has(profile.key)) ||
      new Set(profile.scopes).size !== profile.scopes.length ||
      new Set(profile.resources).size !== profile.resources.length ||
      profile.refreshAheadMillis >= profile.maximumAccessLifetimeMillis ||
      (profile.retention === "access-and-refresh" &&
        (profile.maximumRefreshLifetimeMillis === undefined ||
          profile.refresh === "unsupported")) ||
      (profile.retention === "access-only" && profile.refresh !== "unsupported")
    ) {
      return yield* OAuthConfigurationError.make({ reason: "policy" })
    }
    seen.add(key)
    if (profile.issuance === "active") active.add(profile.key)
  }
  if (active.size === 0) return yield* OAuthConfigurationError.make({ reason: "policy" })

  return { id, policy: captured }
})

/** @internal */
export const connectedProfile = (
  policy: ConnectedModels.OAuthConnectedPolicy,
  input: ConnectedModels.OAuthConnectedProfile
) => {
  const current = policy.profiles.find((p) => p.key === input.key && p.issuance === "active")

  return (
    current !== undefined &&
    connectedSame(ConnectedModels.OAuthConnectedProfile, current, { ...input, issuance: "active" })
  )
}

/** @internal */
export const connectedUseAuthorization = Effect.fnUntraced(function*(
  value: ConnectedModels.OAuthConnectedUseAuthorization,
  moduleId: typeof OAuthModuleId.Type,
  subjectId: typeof ConnectedModels.OAuthConnectedTokenContext.Type.subjectId,
  purpose: "metadata" | "use",
  grantId?: typeof ConnectedModels.OAuthGrantId.Type,
  profileKey?: typeof ConnectedModels.OAuthPermissionProfileKey.Type
) {
  const authorization = yield* snapshotOAuthConnectedUseAuthorization.effect(value)
  const now = DateTime.toEpochMillis(yield* DateTime.now)

  if (
    authorization.moduleId !== moduleId ||
    authorization.revision.subjectId !== subjectId ||
    authorization.purpose !== purpose ||
    authorization.grantId !== grantId ||
    authorization.profileKey !== profileKey ||
    authorization.expiresAtMillis <= now ||
    new Set(authorization.revision.credentials.map((v) => v.credentialId)).size !==
      authorization.revision.credentials.length
  ) {
    return yield* OAuthUnavailable.make({})
  }

  return authorization
})

/**
 * Private bounded projection shared by initial and refresh orchestration.
 *
 * @internal
 */
export const connectedGrantResponse = Effect.fnUntraced(function*(
  configuration: ConnectedModels.OAuthConnectedConfiguration,
  raw: ConnectedModels.OAuthConnectedGrantResponse,
  startedAtMillis: number,
  previous?: {
    readonly context: ConnectedModels.OAuthConnectedTokenContext
    readonly material: ConnectedModels.OAuthConnectedTokenMaterial
  }
) {
  const response = yield* snapshotOAuthConnectedGrantResponse.effect(raw)
  const now = DateTime.toEpochMillis(yield* DateTime.now)
  const profile = configuration.profile

  if (
    response.identity.provider !== configuration.provider ||
    response.identity.issuer !== configuration.issuer ||
    (configuration.protocol === "oidc") !== (response.material.continuation._tag === "Oidc") ||
    new Set(response.scopes).size !== response.scopes.length ||
    new Set(response.resources).size !== response.resources.length ||
    !connectedSame(
      ConnectedModels.OAuthConnectedScopes,
      [...response.scopes].sort(),
      [...profile.scopes].sort()
    ) ||
    !connectedSame(
      ConnectedModels.OAuthConnectedResources,
      [...response.resources].sort(),
      [...profile.resources].sort()
    ) ||
    (response.accessExpiresAtMillis !== undefined && response.accessExpiresAtMillis <= now) ||
    startedAtMillis > now ||
    startedAtMillis < 0
  ) {
    return yield* OAuthUnavailable.make({})
  }
  if (
    previous &&
    (!connectedSame(OAuthExternalIdentity, response.identity, previous.context.identity) ||
      !connectedSame(
        ConnectedModels.OAuthConnectedContinuation,
        response.material.continuation,
        previous.material.continuation
      ))
  ) {
    return yield* OAuthUnavailable.make({})
  }

  const { material, refreshExpiresAtMillis: refreshExpires } = yield* retainGrantTokens(
    profile,
    response,
    previous
  )

  const refreshUseUntil = material.refreshToken === undefined
    ? undefined
    : Math.min(
      previous?.context.metadata.refreshUseUntilMillis ??
        startedAtMillis + (profile.maximumRefreshLifetimeMillis ?? 0),
      refreshExpires ?? Number.MAX_SAFE_INTEGER
    )

  const useUntil = Math.min(
    startedAtMillis + profile.maximumAccessLifetimeMillis,
    response.accessExpiresAtMillis ?? Number.MAX_SAFE_INTEGER
  )

  if (useUntil <= now || (refreshUseUntil !== undefined && refreshUseUntil <= now)) {
    return yield* OAuthUnavailable.make({})
  }

  const metadata = yield* snapshotOAuthConnectedTokenMetadata.effect({
    scopes: response.scopes,
    resources: response.resources,
    useUntilMillis: useUntil,
    obtainedAtMillis: startedAtMillis,
    ...(response.accessExpiresAtMillis === undefined
      ? {}
      : { accessExpiresAtMillis: response.accessExpiresAtMillis }),
    ...(material.refreshToken === undefined || refreshExpires === undefined
      ? {}
      : { refreshExpiresAtMillis: refreshExpires }),
    ...(refreshUseUntil === undefined ? {} : { refreshUseUntilMillis: refreshUseUntil }),
    ...(response.profile === undefined ? {} : { profile: response.profile })
  })

  return { identity: response.identity, metadata, material }
})

export interface AccessModule<Id extends string> {
  readonly moduleId: Id
  readonly kind: "oauth-connected-access"
}

/** @internal */
export const makeOAuthConnectedAccess = <const Id extends string>(
  moduleId: Id,
  configuration: ConnectedModels.OAuthConnectedPolicy
) => {
  const ConnectedAccess = Context.Service<
    AccessModule<Id>,
    {
      readonly withAccessToken: <A, E, R>(
        invocation: AuthInvocation,
        input: typeof ConnectedModels.OAuthConnectedUse.Type,
        use: (accessToken: Redacted.Redacted<string>) => Effect.Effect<A, E, R>
      ) => Effect.Effect<A, E | OAuthConnectedAccessFailure, R>
    }
  >()("@effect/auth/oauth/" + moduleId.length + ":" + moduleId + "/ConnectedAccess")

  const captured = captureConnectedPolicy(configuration)

  const accessLayer = Layer.effect(
    ConnectedAccess,
    Effect.gen(function*() {
      const { id, policy } = yield* validateConnectedPolicy(moduleId, captured)
      const { authorize } = yield* OAuthConnectedUseAuthority

      const { read, claimRefresh, settleRefresh } = yield* OAuthConnectedPersistence

      const { refreshGrant } = yield* OAuthConnectedProtocol
      const { seal, open } = yield* OAuthConnectedTokenProtector
      const { randomBytes } = yield* SecureRandom.SecureRandom

      const random = Effect.fnUntraced(function*() {
        const bytes = yield* randomBytes(32).pipe(
          Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => OAuthUnavailable.make({}))))
        )

        const result = OAuthClaimId.make(Base64Url.encode(bytes))

        bytes.fill(0)

        return result
      })

      const refresh = Effect.fn("OAuthConnectedAccess.refresh")(function*(
        grant: ConnectedModels.OAuthConnectedStoredGrant,
        authorization: ConnectedModels.OAuthConnectedUseAuthorization
      ) {
        const claimId = yield* random(),
          nextTokenVersion = SecurityRevision.make(yield* random())

        return yield* Effect.uninterruptibleMask((restore) =>
          Effect.gen(function*() {
            const receipt = yield* restore(
              claimRefresh(
                {
                  grant,
                  authorization,
                  claimId,
                  nextTokenVersion,
                  lifetimeMillis: policy.refreshClaimLifetimeMillis
                },
                (value, journal) => journal.prepare(snapshotOAuthConnectedRefreshDecision.sync(value))
              )
            )

            const decision = yield* connectedRead(receipt)

            if (decision._tag === "Busy") return yield* ConnectedModels.OAuthConnectedBusy.make({})
            if (decision._tag === "ReauthorizationRequired") {
              return yield* ConnectedModels.OAuthConnectedReauthorizationRequired.make({})
            }
            if (decision._tag !== "Claimed") return yield* OAuthRejected.make({})
            const owned = yield* snapshotOAuthConnectedRefreshClaim.effect(decision.claim)

            if (
              owned.claimId !== claimId ||
              owned.nextTokenVersion !== nextTokenVersion ||
              !connectedSame(ConnectedModels.OAuthConnectedStoredGrant, owned.grant, grant) ||
              owned.claimExpiresAtMillis <= owned.claimedAtMillis ||
              owned.claimExpiresAtMillis >
                Math.min(
                  owned.claimedAtMillis + policy.refreshClaimLifetimeMillis,
                  grant.context.metadata.refreshUseUntilMillis ?? 0,
                  authorization.expiresAtMillis
                ) ||
              owned.claimedAtMillis > DateTime.toEpochMillis(yield* DateTime.now)
            ) {
              return yield* OAuthUnavailable.make({})
            }

            const exchange = Effect.gen(function*() {
              const material = yield* open(
                yield* snapshotOAuthConnectedStoredGrant.effect(grant)
              ).pipe(Effect.flatMap((v) => snapshotOAuthConnectedTokenMaterial.effect(v)))

              return yield* Effect.gen(function*() {
                const start = DateTime.toEpochMillis(yield* DateTime.now)

                if (
                  !material.refreshToken ||
                  grant.context.configuration.profile.refresh === "unsupported" ||
                  grant.context.metadata.refreshUseUntilMillis === undefined ||
                  grant.context.metadata.refreshUseUntilMillis <= start ||
                  start >= owned.claimExpiresAtMillis
                ) {
                  return yield* ConnectedModels.OAuthConnectedReauthorizationRequired.make({})
                }

                const response = yield* refreshGrant({
                  context: yield* snapshotOAuthConnectedTokenContext.effect(grant.context),
                  material: yield* snapshotOAuthConnectedTokenMaterial.effect(material),
                  verificationStartedAt: DateTime.makeUnsafe(start)
                })

                const projected = yield* connectedGrantResponse(
                  grant.context.configuration,
                  response,
                  start,
                  { context: grant.context, material }
                )

                return yield* Effect.gen(function*() {
                  const context = yield* snapshotOAuthConnectedTokenContext.effect({
                    ...grant.context,
                    tokenVersion: nextTokenVersion,
                    metadata: projected.metadata
                  })

                  const sealed = yield* seal({
                    context,
                    material: yield* snapshotOAuthConnectedTokenMaterial.effect(projected.material)
                  })

                  const updated = yield* snapshotOAuthConnectedStoredGrant.effect({
                    context,
                    sealed
                  })

                  return yield* snapshotOAuthConnectedRefreshOutcome.effect({
                    _tag: "Refreshed",
                    grant: updated
                  })
                }).pipe(
                  Effect.ensuring(Effect.sync(() => wipeConnectedMaterial(projected.material)))
                )
              }).pipe(Effect.ensuring(Effect.sync(() => wipeConnectedMaterial(material))))
            })

            const remaining = Math.max(
              1,
              owned.claimExpiresAtMillis - DateTime.toEpochMillis(yield* DateTime.now)
            )

            const exchanged = yield* Effect.exit(restore(connectedBounded(exchange, remaining)))

            const outcome: ConnectedModels.OAuthConnectedRefreshOutcome = Exit.isSuccess(exchanged)
              ? exchanged.value
              : { _tag: "ReauthorizationRequired" }

            // Request settlement cancellation after five seconds while preserving
            // scoped cleanup. Unknown completion releases no token or retry authority.
            const finished = yield* Effect.exit(
              connectedBounded(
                settleRefresh({ claim: owned, authorization, outcome }, (value, journal) =>
                  journal.prepare(snapshotOAuthConnectedRefreshSettlement.sync(value))).pipe(
                    Effect.flatMap(connectedRead)
                  ),
                5_000
              )
            )

            if (Exit.isFailure(exchanged)) {
              const cause = Cause.map(exchanged.cause, (error) =>
                error._tag === "OAuthProtocolRejected" ||
                  error._tag === "OAuthConnectedReauthorizationRequired"
                  ? ConnectedModels.OAuthConnectedReauthorizationRequired.make({})
                  : OAuthUnavailable.make({}))

              return yield* Effect.failCause(
                Exit.isFailure(finished)
                  ? Cause.combine(
                    cause,
                    Cause.map(finished.cause, () =>
                      OAuthUnavailable.make({}))
                  )
                  : cause
              )
            }
            if (Exit.isFailure(finished)) {
              return yield* Effect.failCause(
                Cause.map(finished.cause, () => OAuthUnavailable.make({}))
              )
            }
            const settled = finished.value

            if (settled._tag !== "Refreshed") {
              return yield* ConnectedModels.OAuthConnectedReauthorizationRequired.make({})
            }
            if (
              outcome._tag !== "Refreshed" ||
              !connectedSame(ConnectedModels.OAuthConnectedStoredGrant, settled.grant, outcome.grant)
            ) {
              return yield* OAuthUnavailable.make({})
            }

            return yield* snapshotOAuthConnectedStoredGrant.effect(settled.grant)
          })
        )
      })

      const prepare = Effect.fn("OAuthConnectedAccess.prepare")(function*(
        invocation: AuthInvocation,
        raw: typeof ConnectedModels.OAuthConnectedUse.Type
      ) {
        const caller = yield* connectedCaller(invocation)
        const input = yield* snapshotOAuthConnectedUse.effect(raw)

        const inspected = yield* read({
          moduleId: id,
          subjectId: caller.subjectId,
          selector: { _tag: "Grant", grantId: input.grantId }
        })

        if (inspected?.grant === undefined) return yield* OAuthRejected.make({})

        const captured = yield* snapshotInspection.effect({ ...inspected, grant: inspected.grant })

        const snapshot = captured.grant

        if (
          captured.revision.subjectId !== caller.subjectId ||
          snapshot.context.moduleId !== id ||
          snapshot.context.subjectId !== caller.subjectId ||
          snapshot.context.grantId !== input.grantId ||
          snapshot.context.configuration.profile.key !== input.profileKey ||
          !connectedProfile(policy, snapshot.context.configuration.profile)
        ) {
          return yield* OAuthRejected.make({})
        }

        const authorization = yield* connectedUseAuthorization(
          yield* authorize({
            invocation: caller,
            moduleId: id,
            purpose: "use",
            ...input,
            captured
          }),
          id,
          caller.subjectId,
          "use",
          input.grantId,
          input.profileKey
        )

        if (
          !connectedSame(OAuthAccountRevision, captured.revision, authorization.revision) ||
          (captured.policyRevision !== undefined &&
            captured.policyRevision !== authorization.policyRevision)
        ) {
          return yield* OAuthRejected.make({})
        }

        if (snapshot.state === "Refreshing") {
          if (
            (snapshot.refreshClaimExpiresAtMillis ?? 0) <=
              DateTime.toEpochMillis(yield* DateTime.now)
          ) {
            return yield* ConnectedModels.OAuthConnectedReauthorizationRequired.make({})
          }

          return yield* ConnectedModels.OAuthConnectedBusy.make({})
        }
        if (snapshot.state === "ReauthorizationRequired") {
          return yield* ConnectedModels.OAuthConnectedReauthorizationRequired.make({})
        }
        let grant = yield* snapshotOAuthConnectedStoredGrant.effect(snapshot)

        const now = DateTime.toEpochMillis(yield* DateTime.now)

        if (
          grant.context.configuration.profile.refresh !== "unsupported" &&
          grant.context.metadata.refreshUseUntilMillis !== undefined &&
          grant.context.metadata.refreshUseUntilMillis > now &&
          now + grant.context.configuration.profile.refreshAheadMillis >=
            grant.context.metadata.useUntilMillis
        ) {
          grant = yield* refresh(grant, authorization)
        }

        const material = yield* open(yield* snapshotOAuthConnectedStoredGrant.effect(grant)).pipe(
          Effect.flatMap((v) => snapshotOAuthConnectedTokenMaterial.effect(v))
        )

        return yield* Effect.gen(function*() {
          yield* connectedUseAuthorization(
            authorization,
            id,
            caller.subjectId,
            "use",
            input.grantId,
            input.profileKey
          )
          if (DateTime.toEpochMillis(yield* DateTime.now) >= grant.context.metadata.useUntilMillis) {
            return yield* ConnectedModels.OAuthConnectedReauthorizationRequired.make({})
          }

          return {
            token: Redacted.make(Redacted.value(material.accessToken)),
            expiresAtMillis: Math.min(
              authorization.expiresAtMillis,
              grant.context.metadata.useUntilMillis
            )
          }
        }).pipe(Effect.ensuring(Effect.sync(() => wipeConnectedMaterial(material))))
      })

      const withAccessToken = <A, E, R>(
        invocation: AuthInvocation,
        input: typeof ConnectedModels.OAuthConnectedUse.Type,
        use: (token: Redacted.Redacted<string>) => Effect.Effect<A, E, R>
      ): Effect.Effect<A, E | OAuthConnectedAccessFailure, R> =>
        prepare(invocation, input).pipe(
          reportConnectedFailure,
          Effect.flatMap(({ token, expiresAtMillis }) =>
            Effect.gen(function*() {
              if (DateTime.toEpochMillis(yield* DateTime.now) >= expiresAtMillis) {
                return yield* OAuthUnavailable.make({})
              }

              return yield* Effect.suspend(() => use(token)).pipe(Effect.interruptible)
            }).pipe(Effect.ensuring(Effect.sync(() => Redacted.wipeUnsafe(token))))
          )
        )

      return ConnectedAccess.of({ withAccessToken })
    })
  )

  return { ConnectedAccess, accessLayer }
}

const snapshotInvocationSchema = makeOAuthSnapshot(invocationSchema)
const snapshotOAuthConnectedPolicy = makeOAuthSnapshot(ConnectedModels.OAuthConnectedPolicy)
const snapshotOAuthConnectedUseAuthorization = makeOAuthSnapshot(ConnectedModels.OAuthConnectedUseAuthorization)
const snapshotOAuthConnectedGrantResponse = makeOAuthSnapshot(ConnectedModels.OAuthConnectedGrantResponse)
const snapshotOAuthConnectedTokenMetadata = makeOAuthSnapshot(ConnectedModels.OAuthConnectedTokenMetadata)
const snapshotOAuthConnectedRefreshDecision = makeOAuthSnapshot(ConnectedModels.OAuthConnectedRefreshDecision)
const snapshotOAuthConnectedRefreshClaim = makeOAuthSnapshot(ConnectedModels.OAuthConnectedRefreshClaim)
const snapshotOAuthConnectedStoredGrant = makeOAuthSnapshot(ConnectedModels.OAuthConnectedStoredGrant)
const snapshotOAuthConnectedTokenMaterial = makeOAuthSnapshot(ConnectedModels.OAuthConnectedTokenMaterial)
const snapshotOAuthConnectedTokenContext = makeOAuthSnapshot(ConnectedModels.OAuthConnectedTokenContext)
const snapshotOAuthConnectedRefreshOutcome = makeOAuthSnapshot(ConnectedModels.OAuthConnectedRefreshOutcome)

const snapshotOAuthConnectedRefreshSettlement = makeOAuthSnapshot(
  ConnectedModels.OAuthConnectedRefreshSettlement
)

const snapshotOAuthConnectedUse = makeOAuthSnapshot(ConnectedModels.OAuthConnectedUse)

const snapshotInspection = makeOAuthSnapshot(
  Schema.Struct({
    revision: OAuthAccountRevision,
    grant: ConnectedModels.OAuthConnectedGrantSnapshot,
    policyRevision: Schema.optionalKey(ConnectedModels.OAuthConnectedUseAuthorization.fields.policyRevision)
  })
)
