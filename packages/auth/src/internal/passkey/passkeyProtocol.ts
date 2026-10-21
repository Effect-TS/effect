import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"

import type { PasskeyProtocolRejected, PasskeyUnavailable } from "./errors.ts"
import type {
  PasskeyAssertionVerified,
  PasskeyAuthenticationOptions,
  PasskeyCeremony,
  PasskeyCredential,
  PasskeyDescriptor,
  PasskeyProfile,
  PasskeyRegistrationOptions,
  PasskeyRegistrationVerified,
  PasskeyUserHandle
} from "./models.ts"

/** Maintained WebAuthn boundary. Validate the configured RP against a maintained
 * public-suffix/domain authority; no permissive default or hand-written verifier.
 * Exact type/challenge/origin/RP/id/rawId/handle, UP/UV, signature and immutable BE.
 * None-only attestation. No global settings, identity lookup, persistence or tokens. */
export class PasskeyProtocol extends Context.Service<
  PasskeyProtocol,
  {
    readonly prepareAuthentication: (input: {
      readonly profile: PasskeyProfile
      readonly challenge: string
      readonly timeoutMillis: number
      readonly allowedCredentials: ReadonlyArray<typeof PasskeyDescriptor.Type>
    }) => Effect.Effect<PasskeyAuthenticationOptions, PasskeyProtocolRejected | PasskeyUnavailable>
    readonly prepareRegistration: (input: {
      readonly profile: PasskeyProfile
      readonly challenge: string
      readonly timeoutMillis: number
      readonly userHandle: PasskeyUserHandle
      readonly name: string
      readonly displayName: string
      readonly excludedCredentials: ReadonlyArray<typeof PasskeyDescriptor.Type>
    }) => Effect.Effect<PasskeyRegistrationOptions, PasskeyProtocolRejected | PasskeyUnavailable>
    readonly verifyAuthentication: (input: {
      readonly ceremony: PasskeyCeremony
      readonly credential: PasskeyCredential
      readonly response: Redacted.Redacted<string>
    }) => Effect.Effect<PasskeyAssertionVerified, PasskeyProtocolRejected | PasskeyUnavailable>
    readonly verifyRegistration: (input: {
      readonly ceremony: PasskeyCeremony
      readonly response: Redacted.Redacted<string>
    }) => Effect.Effect<PasskeyRegistrationVerified, PasskeyProtocolRejected | PasskeyUnavailable>
  }
>()("@effect/auth/PasskeyProtocol") {}
