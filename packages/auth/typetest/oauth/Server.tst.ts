import { OAuthScope, OAuthServer } from "@effect/auth"
import type { Layer } from "effect"
import { Effect, Redacted } from "effect"
import { expect, it } from "tstyche"

// Compile-only contract for literal scope inference. Runtime proofs
// cannot detect a typo accepted by the TypeScript API.
it("preserves literal OAuth scope inference and rejects undeclared scopes", () => {
  const read = OAuthScope.make("documents:read")
  const write = OAuthScope.make("documents:write")
  const scopes = [read, write]

  expect(read).type.toBe<OAuthScope.OAuthScope<"documents:read">>()
  expect<"documents:read">().type.not.toBeAssignableTo<typeof read>()

  const resource = OAuthServer.make("typed-resource", {
    scopes
  })

  const identity = OAuthServer.makeOpenId("typed-identity", {
    scopes
  })

  const defaults = OAuthServer.makeOpenId("typed-defaults")

  expect(OAuthServer.make).type.not.toBeCallableWith("unbranded-scopes", { scopes: ["read"] })
  expect(OAuthServer.makeOpenId).type.not.toBeCallableWith("unbranded-openid", { scopes: ["read"] })

  expect<typeof resource.Scope.Type>().type.toBe<
    OAuthScope.OAuthScope<"documents:read" | "documents:write">
  >()
  expect<typeof identity.Scope.Type>().type.toBe<
    OAuthScope.OAuthScope<"openid" | "profile" | "email" | "documents:read" | "documents:write">
  >()
  expect<typeof defaults.Scope.Type>().type.toBe<
    OAuthScope.OAuthScope<"openid" | "profile" | "email">
  >()
  expect<(typeof identity.Access.Type.scopes)[number]>().type.toBe<
    OAuthScope.OAuthScope<"openid" | "profile" | "email" | "documents:read" | "documents:write">
  >()

  resource.middleware([read])
  expect(resource.middleware).type.not.toBeCallableWith(["documents:read"])
  identity.middleware([OAuthScope.make("openid"), read])
  expect(resource.middleware).type.not.toBeCallableWith([OAuthScope.make("documents:raed")])
  expect(identity.middleware).type.not.toBeCallableWith([OAuthScope.make("documents:raed")])
  expect(defaults.middleware).type.not.toBeCallableWith([read])

  expect(identity.Authorization.of).type.not.toBeCallableWith({
    authorize: () => Effect.succeed({ scopes: [OAuthScope.make("documents:raed")] })
  })

  identity.Identity.of({
    current: Effect.succeed(undefined),
    active: () => Effect.succeed(true),
    profile: ({ scopes }) => {
      expect(scopes[0]).type.toBe<
        OAuthScope.OAuthScope<"openid" | "profile" | "email" | "documents:read" | "documents:write">
      >()

      return Effect.succeed({})
    }
  })

  identity.Authorization.of({
    authorize: ({ scopes }) => {
      expect<(typeof scopes)[number]>().type.toBe<
        OAuthScope.OAuthScope<"openid" | "profile" | "email" | "documents:read" | "documents:write">
      >()

      return Effect.succeed({ scopes })
    }
  })

  Effect.gen(function*() {
    const resourceService = yield* resource.Service
    const access = yield* resourceService.verify(Redacted.make("credential"))

    expect(access.scopes[0]).type.toBe<
      OAuthScope.OAuthScope<"documents:read" | "documents:write">
    >()

    const identityService = yield* identity.Service
    const identityAccess = yield* identityService.verify(Redacted.make("credential"))

    expect(identityAccess.scopes[0]).type.toBe<
      OAuthScope.OAuthScope<"openid" | "profile" | "email" | "documents:read" | "documents:write">
    >()
    const current = yield* identity.CurrentAccess

    if (current !== undefined) {
      expect(current.scopes[0]).type.toBe<
        OAuthScope.OAuthScope<"openid" | "profile" | "email" | "documents:read" | "documents:write">
      >()
    }

    const configured = yield* OAuthServer.makeAccessTokenVerifier({
      issuer: "https://identity.example.com",
      resource: "https://resource.example.com",
      publicKeys: [],
      scopes: [read, OAuthScope.make("openid")]
    })

    const configuredAccess = yield* configured.verify(Redacted.make("credential"))

    expect(configuredAccess.scopes[0]).type.toBe<
      OAuthScope.OAuthScope<"documents:read" | "openid">
    >()

    const unconfigured = yield* OAuthServer.makeAccessTokenVerifier({
      issuer: "https://identity.example.com",
      resource: "https://resource.example.com",
      publicKeys: []
    })

    const unconfiguredAccess = yield* unconfigured.verify(Redacted.make("credential"))

    expect(unconfiguredAccess.scopes[0]).type.toBe<OAuthScope.OAuthScope>()
  })
})

const narrow = OAuthServer.makeOpenId("same-id", { scopes: [OAuthScope.make("read")] })
const broad = OAuthServer.makeOpenId("same-id", {
  scopes: [OAuthScope.make("read"), OAuthScope.make("write")]
})
declare const layers: {
  readonly server: Layer.Layer<typeof broad.Service.Identifier>
  readonly authorization: Layer.Layer<typeof broad.Authorization.Identifier>
  readonly identity: Layer.Layer<typeof broad.Identity.Identifier>
}

it("keeps OAuth server service scopes invariant", () => {
  const server = Effect.provide(narrow.Service, layers.server)
  const authorization = Effect.provide(narrow.Authorization, layers.authorization)
  const identity = Effect.provide(narrow.Identity, layers.identity)

  expect<Effect.Services<typeof server>>().type.toBe<
    typeof narrow.Service.Identifier
  >()
  expect<Effect.Services<typeof authorization>>().type.toBe<
    typeof narrow.Authorization.Identifier
  >()
  expect<Effect.Services<typeof identity>>().type.toBe<
    typeof narrow.Identity.Identifier
  >()
})
