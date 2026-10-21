import * as Auth from "@effect/auth/Auth"
import * as Hooks from "@effect/auth/Hooks"
import * as OAuth from "@effect/auth/OAuth"
import * as Operations from "@effect/auth/Operations"
import * as Sessions from "@effect/auth/Sessions"
import { assert, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Schema } from "effect"
import { webCryptoLayer } from "../../utils/crypto.ts"

import { makeOAuthAccounts } from "@effect/auth/internal/oauth/accounts"
import { makeOAuthConnected } from "@effect/auth/internal/oauth/connected"

// Failure inventory for form_post completion. The session cookie is SameSite=Lax
// and is absent on Apple's cross-site POST. Only the binding cookie arrives.
// 1. A stored form_post link, Guest, and a valid binding must pass the operation
//    gate, verify that binding, and consume by the subject sealed at begin.
//    The result is not AuthenticationRequired.
// 2. The same continuation for a connected flow, using the caller sealed at begin.
// 3. A Guest with no valid binding is rejected and the flow is not consumed.
// Begin, list, unlink, and disconnect stay authenticated. A non-form_post guest
// is still rejected by the handler after persistence refuses that consume.

const digest = "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc"
const moduleId = "oauth"
const flowId = "flow"
const provider = "apple"
const callbackId = "callback"
const state = "A".repeat(43)
const subjectId = "subject"

const revision = {
  subjectId,
  securityRevision: "rev1",
  credentials: [{ credentialId: "credential", revision: "rev1" }]
}

const authorization = (action: "link-begin" | "connected-begin") => ({
  challenge: {
    moduleId,
    action,
    flowId,
    revision,
    intentDigest: digest,
    bindingDigest: digest
  },
  source: { _tag: "Proof" as const },
  validUntilMillis: 61_000,
  evidence: {
    revision,
    flowId,
    bindingDigest: digest,
    proofs: [
      {
        method: "passkey",
        credentialId: "credential",
        factors: ["possession" as const],
        userVerified: true,
        phishingResistant: true,
        verifiedAt: 1_000
      }
    ]
  },
  requirement: {
    alternatives: [
      {
        factors: ["possession" as const],
        userVerified: true,
        phishingResistant: true,
        minimumCredentials: 1
      }
    ],
    maximumAgeMillis: 60_000
  }
})

const sealed = {
  format: "oauth-xchacha20poly1305-v1" as const,
  keyId: "key1",
  nonce: "0zYbC6m33Uy0wpRZVPxCB5HBOjVBoeF-",
  ciphertext:
    "HYQ2sdnnDd4rmS83kz4c5a-8J4VThuncLRbWz9aW35B0uDF7yrLnBTyUB_-JDB4ZghX-Q0Z9Ra47P83rAJcjvyjqZIha8DIsn0C5U-MyHAGqo6snqB9oGzF1GfJoCxIYcEHvmLT8HUbRcxikcspNTrSS3yjCH0DRaB_aibYC4ree-4mA5jnUESzoN6jp4i_8yKfgcmecAJicFRk8nI9xzMyt8Ur-Yy_4JZMcqYEb0cxcXWn5hCOk-2GDX-Y6jISGURfe7qegB2gYsgFZARUROBtSUc2qE78Yua5RI-jw4uiNoA2ZHt2ndUUFEZ4TTzZqQyDx0sw"
}

const baseContext = {
  moduleId,
  generation: 1,
  flowId,
  provider,
  protocol: "oidc" as const,
  configurationGeneration: 1,
  issuer: "https://issuer.example",
  responseIssuerMode: "unsupported" as const,
  callbackId,
  redirectUri: "https://app.example/callback",
  returnTarget: "/",
  stateDigest: digest,
  requestBindingVerifier: digest,
  requestBindingExpiresAtMillis: 50_000,
  issuedAtMillis: 1_000,
  expiresAtMillis: 40_000,
  exchangeTimeoutMillis: 10_000,
  responseMode: "form_post" as const,
  revision,
  maximumEvidenceAgeMillis: 60_000
}

const profile = {
  key: "read",
  generation: 1,
  issuance: "active" as const,
  provider,
  clientRegistrationId: "client",
  scopes: ["openid"],
  resources: [],
  retention: "access-only" as const,
  maximumAccessLifetimeMillis: 3_600_000,
  refreshAheadMillis: 0,
  refresh: "unsupported" as const,
  revocation: "unsupported" as const
}

const sessions = Sessions.make(Schema.Struct({}), { namespace: "test/form-post" })

const signingKeys = {
  activeKeyId: "test",
  keys: [{ id: "test", material: Redacted.make("A".repeat(43)) }]
}

const sessionLayer = sessions
  .statelessLayer(
    Sessions.stateless({ issuer: "test", audience: "test" }).policy(sessions.moduleId)
  )
  .pipe(
    Layer.provide([
      webCryptoLayer,
      Hooks.LifecycleHooks.empty,
      Layer.succeed(Sessions.SessionSigningKeys, signingKeys)
    ])
  )

const bindingConfig = Auth.RequestBindingConfig.layer({
  lifetimeMillis: 300_000,
  generation: 1,
  keyring: signingKeys
})

const journal = {
  prepare: <A>(value: A) => ({
    _tag: "PreparedCommit" as const,
    read: Effect.succeed(value)
  }),
  stage: () => undefined
}

const unused = () => Effect.die(new globalThis.Error("unused"))

const callback = {
  flowId,
  provider,
  callbackId,
  response: { _tag: "Error" as const, error: "access-denied" as const, state }
}

const guest = Operations.guest

const collector = Effect.provideService(
  Operations.AuthCredentialCommandCollector,
  () => Effect.void
)

interface SeenAccess {
  readonly formPostSubject: boolean
  readonly subjectId: string | undefined
}

const linkPolicy = {
  generation: 1,
  lifetimeMillis: 300_000,
  exchangeTimeoutMillis: 30_000,
  maximumEvidenceAgeMillis: 60_000,
  requireImmediateInvalidation: false
}

const connectedPolicy = {
  generation: 1,
  lifetimeMillis: 300_000,
  exchangeTimeoutMillis: 30_000,
  maximumEvidenceAgeMillis: 60_000,
  refreshClaimLifetimeMillis: 60_000,
  profiles: [profile]
}

it.effect("admits a form_post account link that has only the binding cookie", () =>
  Effect.gen(function*() {
    const template = yield* Schema.decodeUnknownEffect(OAuth.OAuthLinkFlow)({
      context: {
        ...baseContext,
        namespace: "effect-auth/oauth-link-context/v1",
        authorization: authorization("link-begin")
      },
      sealed
    }).pipe(Effect.orDie)

    const seen: Array<SeenAccess> = []
    const accounts = makeOAuthAccounts(moduleId, sessions, linkPolicy)

    const handlers = accounts.handlersLayer.pipe(
      Layer.provide(accounts.layer),
      Layer.provide([
        accounts.binding.layer.pipe(Layer.provide([bindingConfig, webCryptoLayer])),
        Layer.succeed(OAuth.OAuthAccountsPersistence, {
          list: unused,
          capture: unused,
          issue: unused,
          consume: (access, prepare) =>
            Effect.sync(() => {
              seen.push({
                formPostSubject: access.formPostSubject === true,
                subjectId: access.subjectId
              })

              if (access.formPostSubject !== true) return prepare({ _tag: "Rejected" }, journal)

              return prepare(
                {
                  _tag: "Consumed",
                  flow: {
                    context: {
                      ...template.context,
                      moduleId: access.moduleId,
                      generation: access.generation,
                      flowId: access.flowId,
                      provider: access.provider,
                      callbackId: access.callbackId,
                      stateDigest: access.stateDigest,
                      requestBindingVerifier: access.requestBindingVerifier,
                      requestBindingExpiresAtMillis: access.requestBindingExpiresAtMillis,
                      expiresAtMillis: access.requestBindingExpiresAtMillis,
                      responseMode: "form_post" as const
                    },
                    sealed: template.sealed
                  }
                },
                journal
              )
            }),
          link: unused,
          readCredential: unused,
          unlink: unused,
          cleanup: unused
        }),
        Layer.succeed(OAuth.OAuthActionEvidence, { verify: unused }),
        Layer.succeed(OAuth.OAuthProtocol, {
          prepareAuthorization: unused,
          exchangeVerifiedIdentity: unused
        }),
        Layer.succeed(OAuth.OAuthReturnTargets, { resolve: unused }),
        Layer.succeed(OAuth.OAuthLinkTransactionProtector, { seal: unused, open: unused }),
        Hooks.LifecycleHooks.empty,
        webCryptoLayer,
        sessionLayer
      ])
    )

    const issued = yield* Effect.gen(function*() {
      const binding = yield* accounts.binding.RequestBinding
      const id = yield* Schema.decodeEffect(Operations.RequestBindingFlowId)(flowId)

      return yield* binding.issue(id)
    }).pipe(
      Effect.provide(
        accounts.binding.layer.pipe(Layer.provide([bindingConfig, webCryptoLayer]))
      )
    )

    const command = issued.credentialCommands[0]

    if (command?._tag !== "Issue") return yield* Effect.die(new globalThis.Error("binding"))

    const result = yield* accounts.operations.Link.Complete.invoke(guest, {
      ...callback,
      requestBinding: Redacted.value(command.credential)
    }).pipe(collector, Effect.provide(handlers), Effect.result)

    assert.deepNestedInclude(result, { "_tag": "Success", "success._tag": "Cancelled", "success.returnTarget": "/" })
    assert.deepStrictEqual(seen, [{ formPostSubject: true, subjectId: undefined }])
  }))

it.effect("admits a form_post connected flow that has only the binding cookie", () =>
  Effect.gen(function*() {
    const template = yield* Schema.decodeUnknownEffect(OAuth.OAuthConnectedFlow)({
      context: {
        ...baseContext,
        namespace: "effect-auth/oauth-connected-context/v1",
        authorization: authorization("connected-begin"),
        profile,
        grantId: "grant",
        authenticatedCaller: {
          _tag: "Authenticated",
          subjectId,
          assurance: {
            method: "password",
            factors: ["knowledge"],
            authenticatedAt: 1_000
          }
        }
      },
      sealed
    }).pipe(Effect.orDie)

    const seen: Array<SeenAccess> = []

    const policy = yield* Schema.decodeUnknownEffect(OAuth.OAuthConnectedPolicy)(
      connectedPolicy
    ).pipe(Effect.orDie)

    const connected = makeOAuthConnected(moduleId, policy)

    const handlers = connected.handlersLayer.pipe(
      Layer.provide(connected.layer),
      Layer.provide([
        connected.binding.layer.pipe(Layer.provide([bindingConfig, webCryptoLayer])),
        Layer.succeed(OAuth.OAuthConnectedPersistence, {
          read: unused,
          issue: unused,
          consume: (access, prepare) =>
            Effect.sync(() => {
              seen.push({
                formPostSubject: access.formPostSubject === true,
                subjectId: access.subjectId
              })

              if (access.formPostSubject !== true) return prepare({ _tag: "Rejected" }, journal)

              return prepare(
                {
                  _tag: "Consumed",
                  flow: {
                    context: {
                      ...template.context,
                      moduleId: access.moduleId,
                      generation: access.generation,
                      flowId: access.flowId,
                      provider: access.provider,
                      callbackId: access.callbackId,
                      stateDigest: access.stateDigest,
                      requestBindingVerifier: access.requestBindingVerifier,
                      requestBindingExpiresAtMillis: access.requestBindingExpiresAtMillis,
                      expiresAtMillis: access.requestBindingExpiresAtMillis,
                      responseMode: "form_post" as const
                    },
                    sealed: template.sealed
                  }
                },
                journal
              )
            }),
          settle: unused,
          list: unused,
          disconnect: unused,
          claimRefresh: unused,
          settleRefresh: unused,
          cleanup: unused
        }),
        Layer.succeed(OAuth.OAuthConnectedActionEvidence, { verify: unused }),
        Layer.succeed(OAuth.OAuthConnectedProtocol, {
          prepareAuthorization: unused,
          exchangeGrant: unused,
          refreshGrant: unused,
          revokeGrant: unused
        }),
        Layer.succeed(OAuth.OAuthConnectedTransactionProtector, { seal: unused, open: unused }),
        Layer.succeed(OAuth.OAuthConnectedTokenProtector, { seal: unused, open: unused }),
        Layer.succeed(OAuth.OAuthConnectedUseAuthority, { authorize: unused }),
        Layer.succeed(OAuth.OAuthReturnTargets, { resolve: unused }),
        Hooks.LifecycleHooks.empty,
        webCryptoLayer
      ])
    )

    const issued = yield* Effect.gen(function*() {
      const binding = yield* connected.binding.RequestBinding
      const id = yield* Schema.decodeEffect(Operations.RequestBindingFlowId)(flowId)

      return yield* binding.issue(id)
    }).pipe(
      Effect.provide(
        connected.binding.layer.pipe(Layer.provide([bindingConfig, webCryptoLayer]))
      )
    )

    const command = issued.credentialCommands[0]

    if (command?._tag !== "Issue") return yield* Effect.die(new globalThis.Error("binding"))

    const result = yield* connected.operations.Complete.invoke(guest, {
      ...callback,
      requestBinding: Redacted.value(command.credential)
    }).pipe(collector, Effect.provide(handlers), Effect.result)

    assert.deepNestedInclude(result, { "_tag": "Success", "success._tag": "Cancelled", "success.returnTarget": "/" })
    assert.deepStrictEqual(seen, [{ formPostSubject: true, subjectId: undefined }])
  }))

it.effect("rejects an unbound guest before consuming a form_post link", () =>
  Effect.gen(function*() {
    const seen: Array<SeenAccess> = []
    const accounts = makeOAuthAccounts(moduleId, sessions, linkPolicy)

    const handlers = accounts.handlersLayer.pipe(
      Layer.provide(accounts.layer),
      Layer.provide([
        accounts.binding.layer.pipe(Layer.provide([bindingConfig, webCryptoLayer])),
        Layer.succeed(OAuth.OAuthAccountsPersistence, {
          list: unused,
          capture: unused,
          issue: unused,
          consume: (access, prepare) =>
            Effect.sync(() => {
              seen.push({
                formPostSubject: access.formPostSubject === true,
                subjectId: access.subjectId
              })

              return prepare({ _tag: "Rejected" }, journal)
            }),
          link: unused,
          readCredential: unused,
          unlink: unused,
          cleanup: unused
        }),
        Layer.succeed(OAuth.OAuthActionEvidence, { verify: unused }),
        Layer.succeed(OAuth.OAuthProtocol, {
          prepareAuthorization: unused,
          exchangeVerifiedIdentity: unused
        }),
        Layer.succeed(OAuth.OAuthReturnTargets, { resolve: unused }),
        Layer.succeed(OAuth.OAuthLinkTransactionProtector, { seal: unused, open: unused }),
        Hooks.LifecycleHooks.empty,
        webCryptoLayer,
        sessionLayer
      ])
    )

    const result = yield* accounts.operations.Link.Complete.invoke(guest, {
      ...callback,
      requestBinding: "unbound"
    }).pipe(collector, Effect.provide(handlers), Effect.result)

    assert.deepNestedInclude(result, { "_tag": "Failure", "failure._tag": "OAuthRejected" })
    assert.deepStrictEqual(seen, [])
  }))
