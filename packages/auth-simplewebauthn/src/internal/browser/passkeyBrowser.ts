import type { PasskeyAuthenticationStarted, PasskeyRegistrationStarted } from "@effect/auth/Passkey"
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

import type {
  PasskeyBrowserAuthentication,
  PasskeyBrowserCapabilities,
  PasskeyBrowserFailure,
  PasskeyBrowserRegistration,
  PasskeyBrowserUnavailable
} from "./models.ts"

/**
 * Client-local ceremony capability. The caller owns Begin/Complete RPCs and
 * request binding. Interrupt its Effect to request cancellation; no global cancel.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class PasskeyBrowser extends Context.Service<
  PasskeyBrowser,
  {
    readonly capabilities: Effect.Effect<PasskeyBrowserCapabilities, PasskeyBrowserUnavailable>
    readonly register: (
      started: typeof PasskeyRegistrationStarted.Type
    ) => Effect.Effect<PasskeyBrowserRegistration, PasskeyBrowserFailure>
    readonly authenticate: (input: {
      readonly started: typeof PasskeyAuthenticationStarted.Type
      readonly mediation: "required" | "conditional"
    }) => Effect.Effect<PasskeyBrowserAuthentication, PasskeyBrowserFailure>
  }
>()("@effect/auth-simplewebauthn/PasskeyBrowser") {}
