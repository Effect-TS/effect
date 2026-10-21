import * as SecureRandom from "effect/crypto/SecureRandom"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"

import { SecurityRevision } from "../sessions/models.ts"
import { OAuthAccountRevision } from "./accountsModels.ts"
import { connectedGrantResponse, connectedRead, connectedSame, validateConnectedPolicy } from "./connectedAccess.ts"
import {
  OAuthConnectedConfiguration,
  OAuthConnectedGrantResponse,
  OAuthConnectedProfile,
  OAuthConnectedSettlementDecision,
  OAuthConnectedStoredGrant,
  OAuthConnectedTarget,
  OAuthConnectedTokenContext,
  OAuthGrantId
} from "./connectedModels.ts"
import { wipeConnectedMaterial } from "./grantTokens.ts"
import { OAuthConnectedPersistence } from "./oauthConnectedPersistence.ts"
import { OAuthConnectedProtocol } from "./oauthConnectedProtocol.ts"
import { OAuthConnectedTokenProtector } from "./oauthConnectedTokenProtector.ts"
import type { OAuthProtocol } from "./oauthProtocol.ts"
import { OAuthConfigurationError, OAuthRejected, OAuthUnavailable } from "./signInErrors.ts"
import {
  OAuthCallbackId,
  type OAuthCredentialSnapshot,
  OAuthProtocolConfiguration,
  type OAuthSignInFlow,
  type OAuthSignInPolicy,
  OAuthVerifiedExternalIdentity
} from "./signInModels.ts"
import { makeOAuthSnapshot } from "./signInSnapshot.ts"

/** The ordinary sign-in workflow owns the callback and session. This capability
 * adds the single connected exchange and confirmed grant retention to that flow. */
const make = Effect.fnUntraced(function*(
  moduleId: string,
  policy: OAuthSignInPolicy,
  raw: OAuthConnectedProfile
) {
  const profile = yield* snapshotOAuthConnectedProfile
    .effect(raw)
    .pipe(Effect.mapError(() => OAuthConfigurationError.make({ reason: "policy" })))

  yield* validateConnectedPolicy(moduleId, {
    ...policy,
    profiles: [profile],
    maximumEvidenceAgeMillis: 300_000,
    refreshClaimLifetimeMillis: policy.exchangeTimeoutMillis
  })
  const protocol = yield* OAuthConnectedProtocol
  const persistence = yield* OAuthConnectedPersistence
  const protector = yield* OAuthConnectedTokenProtector
  const randomService = yield* SecureRandom.SecureRandom

  const random = randomService.randomBytes(32).pipe(
    Effect.mapError(() => OAuthUnavailable.make({})),
    Effect.map((bytes) => {
      const value = Base64Url.encode(bytes)

      bytes.fill(0)

      return value
    })
  )

  const prepare: OAuthProtocol["Service"]["prepareAuthorization"] = Effect.fn(
    "OAuth.access.prepare"
  )(function*(input) {
    if (input.provider !== profile.provider || profile.issuance !== "active") {
      return yield* OAuthRejected.make({})
    }

    const prepared = yield* protocol
      .prepareAuthorization({
        profile,
        callbackId: input.callbackId ?? OAuthCallbackId.make(input.provider),
        flowId: input.flowId,
        ...(input.prompt === undefined ? {} : { prompt: input.prompt }),
        ...(input.loginHint === undefined ? {} : { loginHint: input.loginHint })
      })
      .pipe(
        Effect.mapError((error) => error._tag === "OAuthProtocolRejected" ? OAuthRejected.make({}) : error)
      )

    if (!connectedSame(OAuthConnectedProfile, prepared.configuration.profile, profile)) {
      return yield* OAuthUnavailable.make({})
    }

    return prepared
  })

  const configurationFor = Effect.fnUntraced(function*(
    flow: OAuthSignInFlow
  ) {
    if (
      flow.context.access === undefined ||
      !connectedSame(OAuthConnectedProfile, flow.context.access, profile)
    ) {
      return yield* OAuthRejected.make({})
    }

    return yield* snapshotOAuthConnectedConfiguration.effect({
      ...(yield* snapshotOAuthProtocolConfiguration.effect(flow.context)),
      profile: flow.context.access
    })
  })

  const exchange = Effect.fn("OAuth.access.exchange")(function*(
    flow: OAuthSignInFlow,
    input: Omit<Parameters<typeof protocol.exchangeGrant>[0], "configuration">
  ) {
    const grant = yield* protocol
      .exchangeGrant({ ...input, configuration: yield* configurationFor(flow) })
      .pipe(Effect.flatMap((value) => snapshotOAuthConnectedGrantResponse.effect(value)))

    const continuation = grant.material.continuation

    const identity = yield* snapshotOAuthVerifiedExternalIdentity.effect({
      identity: grant.identity,
      ...(grant.profile === undefined ? {} : { profile: grant.profile }),
      ...(continuation._tag === "Oidc" && continuation.authTime !== undefined
        ? { upstreamAuthenticatedAt: DateTime.makeUnsafe(continuation.authTime * 1000) }
        : {})
    })

    return { identity, grant }
  })

  const retain = Effect.fn("OAuth.access.retain")(function*(
    flow: OAuthSignInFlow,
    credential: OAuthCredentialSnapshot,
    grant: OAuthConnectedGrantResponse,
    startedAtMillis: number
  ) {
    const configuration = yield* configurationFor(flow)

    const found = yield* persistence.read({
      moduleId: flow.context.moduleId,
      subjectId: credential.revision.subjectId,
      selector: { _tag: "Identity", profileKey: profile.key, identity: credential.identity }
    })

    if (
      found === undefined ||
      !connectedSame(OAuthAccountRevision, found.revision, credential.revision)
    ) {
      return yield* OAuthRejected.make({})
    }

    const previous = found.grant === undefined
      ? undefined
      : yield* snapshotOAuthConnectedTarget.effect(found.grant.context)

    if (
      previous !== undefined &&
      (previous.identity.provider !== credential.identity.provider ||
        previous.identity.issuer !== credential.identity.issuer ||
        previous.identity.subject !== credential.identity.subject ||
        previous.configuration.profile.key !== profile.key)
    ) {
      return yield* OAuthUnavailable.make({})
    }

    const projected = yield* connectedGrantResponse(configuration, grant, startedAtMillis)

    return yield* Effect.gen(function*() {
      const version = SecurityRevision.make(yield* random)

      const context = yield* snapshotOAuthConnectedTokenContext.effect({
        namespace: "effect-auth/oauth-connected-token-context/v1",
        moduleId: flow.context.moduleId,
        subjectId: credential.revision.subjectId,
        identity: projected.identity,
        configuration: configuration,
        grantId: previous?.grantId ?? OAuthGrantId.make(yield* random),
        grantVersion: version,
        tokenVersion: version,
        metadata: projected.metadata
      })

      const stored = yield* snapshotOAuthConnectedStoredGrant.effect({
        context,
        sealed: yield* protector.seal({ context, material: projected.material })
      })

      const settled = yield* persistence
        .settle(
          {
            _tag: "SignIn",
            flow,
            credential,
            grant: stored,
            ...(previous === undefined ? {} : { previous })
          },
          (value, journal) => journal.prepare(snapshotOAuthConnectedSettlementDecision.sync(value))
        )
        .pipe(Effect.flatMap(connectedRead))

      if (settled._tag !== "Connected") return yield* OAuthRejected.make({})
      if (!connectedSame(OAuthConnectedStoredGrant, settled.grant, stored)) {
        return yield* OAuthUnavailable.make({})
      }

      return { grantId: context.grantId, profileKey: profile.key }
    }).pipe(Effect.ensuring(Effect.sync(() => wipeConnectedMaterial(projected.material))))
  })

  return { profile, prepare, exchange, retain }
})

/** @internal */
export type SignInAccess = Effect.Success<ReturnType<typeof make>>
/** @internal */
export type AccessServices = Effect.Services<ReturnType<typeof make>>

/**
 * Only the configured branch acquires connected services.
 *
 * @internal
 */
export const signInAccess = <Access extends OAuthConnectedProfile | undefined>(
  moduleId: string,
  policy: OAuthSignInPolicy,
  profile: Access
): Effect.Effect<
  SignInAccess | undefined,
  OAuthConfigurationError,
  Access extends OAuthConnectedProfile ? AccessServices : never
> =>
  // AccessServices is acquired only when the profile is present, matching the conditional public requirement.
  (profile === undefined
    ? Effect.succeed(undefined)
    : make(moduleId, policy, profile)) as Effect.Effect<
      SignInAccess | undefined,
      OAuthConfigurationError,
      Access extends OAuthConnectedProfile ? AccessServices : never
    >

const snapshotOAuthConnectedProfile = makeOAuthSnapshot(OAuthConnectedProfile)
const snapshotOAuthConnectedConfiguration = makeOAuthSnapshot(OAuthConnectedConfiguration)
const snapshotOAuthProtocolConfiguration = makeOAuthSnapshot(OAuthProtocolConfiguration)
const snapshotOAuthConnectedGrantResponse = makeOAuthSnapshot(OAuthConnectedGrantResponse)
const snapshotOAuthVerifiedExternalIdentity = makeOAuthSnapshot(OAuthVerifiedExternalIdentity)
const snapshotOAuthConnectedTarget = makeOAuthSnapshot(OAuthConnectedTarget)
const snapshotOAuthConnectedTokenContext = makeOAuthSnapshot(OAuthConnectedTokenContext)
const snapshotOAuthConnectedStoredGrant = makeOAuthSnapshot(OAuthConnectedStoredGrant)

const snapshotOAuthConnectedSettlementDecision = makeOAuthSnapshot(
  OAuthConnectedSettlementDecision
)
