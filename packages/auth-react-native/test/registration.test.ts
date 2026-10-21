import * as ReactNativePasskey from "@effect/auth-react-native"
import { PasskeyRegistrationStarted } from "@effect/auth/Passkey"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import type { Passkey } from "react-native-passkey"
import { afterEach, vi } from "vitest"

const bridge = vi.hoisted(() => ({
  create: vi
    .fn<
      (request: string, forcePlatformKey: boolean, forceSecurityKey: boolean) => Promise<unknown>
    >()
    .mockRejectedValue({ code: "UserCancelled" })
}))

vi.mock("react-native", () => ({
  NativeModules: { Passkey: bridge },
  Platform: { OS: "ios", Version: "26.5", select: () => "" }
}))
vi.mock(
  "react-native-passkey",
  () => vi.importActual<{ readonly Passkey: typeof Passkey }>("react-native-passkey/lib/module/index.js")
)

const started = PasskeyRegistrationStarted.make({
  flowId: PasskeyRegistrationStarted.fields.flowId.make("registration-flow"),
  expiresAtMillis: 8640000000000000,
  options: {
    challenge: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    rp: { id: "example.com", name: "Example" },
    user: {
      id: PasskeyRegistrationStarted.fields.options.fields.user.fields.id.make("AQ"),
      name: "alice",
      displayName: "Alice"
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 }
    ],
    timeout: 300000,
    attestation: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
    excludeCredentials: []
  }
})

describe("React Native passkey registration", { concurrent: false }, () => {
  afterEach(() => bridge.create.mockClear())

  // Regression in 05f4266: the peer's security-key path changes attestation "none"
  // to "direct". Diagnostics tests cannot observe native registration selection.
  it.effect("limits native registration to platform credentials", () =>
    Effect.gen(function*() {
      const native = yield* ReactNativePasskey.make()

      yield* Effect.flip(native.register(started))
      assert.lengthOf(bridge.create.mock.calls, 1)
      const [request, platformKey, securityKey] = bridge.create.mock.calls[0]!
      assert.isString(request)
      assert.isTrue(platformKey)
      assert.isFalse(securityKey)
    }))

  // The same commit allowed RSA-only requests to create ES256 platform credentials.
  it.effect("rejects RSA-only registration before native credential creation", () =>
    Effect.gen(function*() {
      const native = yield* ReactNativePasskey.make()

      assert.deepInclude(
        yield* Effect.flip(
          native.register({
            ...started,
            options: {
              ...started.options,
              pubKeyCredParams: [{ type: "public-key", alg: -257 }]
            }
          })
        ),
        { _tag: "PasskeyReactNativeUnsupported" }
      )
      assert.lengthOf(bridge.create.mock.calls, 0)
    }))
})
