import * as ReactNativePasskey from "@effect/auth-react-native"
import { PasskeyAuthenticationStarted } from "@effect/auth/Passkey"
import { assert, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Logger from "effect/Logger"
import { Platform } from "react-native"
import { Passkey } from "react-native-passkey"
import { afterEach, vi } from "vitest"

vi.mock("react-native", () => ({
  NativeModules: {},
  Platform: {
    OS: "ios",
    get Version() {
      return "26.5"
    },
    select: (options: { readonly ios: string }) => options.ios
  }
}))
// Execute the installed peer's ESM implementation, including its real unlinked
// NativeModules proxy. Its CJS entry's require() cannot use Vitest's RN host mock.
vi.mock(
  "react-native-passkey",
  () => vi.importActual<{ readonly Passkey: typeof Passkey }>("react-native-passkey/lib/module/index.js")
)

const started = PasskeyAuthenticationStarted.make({
  flowId: PasskeyAuthenticationStarted.fields.flowId.make("diagnostic-flow"),
  expiresAtMillis: 8640000000000000,
  options: {
    challenge: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    rpId: "example.com",
    timeout: 300000,
    userVerification: "required",
    allowCredentials: []
  }
})

const input = { started, mediation: "required" as const }
const logs: Array<string> = []

const logger = Logger.make((entry) => logs.push(JSON.stringify(Logger.formatStructured.log(entry))))

const logging = Logger.layer([logger])

describe("React Native passkey diagnostics", { concurrent: false }, () => {
  afterEach(() => {
    vi.restoreAllMocks()
    logs.length = 0
  })

  // Regression in 05f4266: unexpected native failures were redacted without any
  // diagnostic. Static checks and the HTTP reporter test cannot observe this boundary.
  it.effect(
    "reports the installed peer's missing-module failure once and leaves expected cancellation quiet",
    () =>
      Effect.gen(function*() {
        const native = yield* ReactNativePasskey.make()

        assert.isTrue((yield* native.capabilities).supported)
        assert.deepInclude(yield* Effect.flip(native.authenticate(input)), {
          _tag: "PasskeyReactNativeUnavailable"
        })
        assert.lengthOf(logs, 1)
        assert.include(logs[0]!, "Auth passkey-react-native failed")
        assert.notInclude(logs[0]!, "doesn't seem to be linked")

        const get = vi.spyOn(Passkey, "get")

        get.mockRejectedValueOnce({ error: "UserCancelled", message: "private-native-marker" })
        assert.deepInclude(yield* Effect.flip(native.authenticate(input)), {
          _tag: "PasskeyReactNativeNotCompleted",
          reason: "cancelled"
        })
        assert.lengthOf(logs, 1)

        get.mockRejectedValueOnce({ error: "BadConfiguration", message: "private-native-marker" })
        assert.deepInclude(yield* Effect.flip(native.authenticate(input)), {
          _tag: "PasskeyReactNativeUnavailable"
        })
        assert.lengthOf(logs, 2)
        assert.notInclude(logs.join(" "), "private-native-marker")
      }).pipe(Effect.provide(logging))
  )

  it.effect(
    "reports environment and response defects once without treating schema rejection as a defect",
    () =>
      Effect.gen(function*() {
        const native = yield* ReactNativePasskey.make()

        const version = vi.spyOn(Platform, "Version", "get").mockImplementation(() => {
          throw new Error("private-environment-marker")
        })

        assert.deepInclude(yield* Effect.flip(native.capabilities), {
          _tag: "PasskeyReactNativeUnavailable"
        })
        assert.lengthOf(logs, 1)
        version.mockRestore()

        const get = vi.spyOn(Passkey, "get")

        get.mockResolvedValueOnce({
          id: "AQ",
          get response(): never {
            throw new Error("private-response-marker")
          }
        })
        assert.deepInclude(yield* Effect.flip(native.authenticate(input)), {
          _tag: "PasskeyReactNativeInvalidResponse"
        })
        assert.lengthOf(logs, 2)
        get.mockResolvedValueOnce({
          id: "AQ",
          response: { clientDataJSON: "invalid!", signature: "AQ", authenticatorData: "AQ" }
        })
        assert.deepInclude(yield* Effect.flip(native.authenticate(input)), {
          _tag: "PasskeyReactNativeInvalidResponse"
        })
        assert.lengthOf(logs, 2)
        assert.notInclude(logs.join(" "), "private-")
      }).pipe(Effect.provide(logging))
  )

  it.effect("leaves late settlement to guard cleanup after the caller's reporting scope ends", () =>
    Effect.gen(function*() {
      const native = yield* ReactNativePasskey.make()
      let rejectNative: (reason: unknown) => void = () => {}
      let entered = false

      const get = vi.spyOn(Passkey, "get").mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectNative = reject
            entered = true
          })
      )

      const fiber = yield* native.authenticate(input).pipe(Effect.forkChild)

      yield* Effect.yieldNow
      assert.isTrue(entered)
      yield* Fiber.interrupt(fiber)
      const exit = yield* Fiber.await(fiber)

      assert.isTrue(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause))
      assert.deepInclude(yield* Effect.flip(native.authenticate(input)), {
        _tag: "PasskeyReactNativeBusy"
      })
      rejectNative({ error: "UnknownError", message: "private-late-marker" })
      yield* Effect.promise(() => Promise.resolve())
      assert.lengthOf(logs, 0)
      get.mockRestore()
      assert.deepInclude(yield* Effect.flip(native.authenticate(input)), {
        _tag: "PasskeyReactNativeUnavailable"
      })
      assert.lengthOf(logs, 1)
      assert.notInclude(logs[0]!, "private-late-marker")
    }).pipe(Effect.provide(logging)))
})
