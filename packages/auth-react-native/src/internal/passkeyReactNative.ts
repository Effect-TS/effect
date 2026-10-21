import type { PasskeyAuthenticationStarted, PasskeyRegistrationStarted } from "@effect/auth/Passkey"
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

import type {
  PasskeyReactNativeAuthentication,
  PasskeyReactNativeCapabilities,
  PasskeyReactNativeFailure,
  PasskeyReactNativeRegistration,
  PasskeyReactNativeUnavailable
} from "./models.ts"

/**
 * Client-local iOS ceremonies. Applications own Begin/Complete and request binding.
 * Interruption stops delivery, but cannot dismiss OS UI. A started native request
 * retains the shared busy guard until its promise settles, even after interruption.
 * The calling fiber owns failure diagnostics; late settlement only clears the guard.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class PasskeyReactNative extends Context.Service<
  PasskeyReactNative,
  {
    readonly capabilities: Effect.Effect<
      PasskeyReactNativeCapabilities,
      PasskeyReactNativeUnavailable
    >
    /** Registers a platform passkey; requested algorithms must include ES256 (-7). */
    readonly register: (
      started: typeof PasskeyRegistrationStarted.Type
    ) => Effect.Effect<PasskeyReactNativeRegistration, PasskeyReactNativeFailure>
    /** Conditional mediation is accepted for port compatibility but fails Unsupported. */
    readonly authenticate: (input: {
      readonly started: typeof PasskeyAuthenticationStarted.Type
      readonly mediation: "required" | "conditional"
    }) => Effect.Effect<PasskeyReactNativeAuthentication, PasskeyReactNativeFailure>
  }
>()("@effect/auth-react-native/PasskeyReactNative") {}
