import * as Context from "effect/Context"
import type * as DateTime from "effect/DateTime"
import type * as Effect from "effect/Effect"

import type { RequestBindingFlowId } from "../operations/requestBinding.ts"
import type {
  OAuthConnectedConfiguration,
  OAuthConnectedGrantResponse,
  OAuthConnectedProfile,
  OAuthConnectedTokenContext,
  OAuthConnectedTokenMaterial
} from "./connectedModels.ts"
import type { OAuthProtocolRejected, OAuthUnavailable } from "./signInErrors.ts"
import type {
  OAuthCallbackId,
  OAuthCodeResponse,
  OAuthProtocolPreparation,
  OAuthTransactionSecrets
} from "./signInModels.ts"

/** Explicit server-only token capability; ordinary OAuthProtocol stays token-free.
 * All provider/identity/refresh/revocation HTTP stays outside database owners.
 * Exact retained config and fixed profiles only. No automatic exchange retry.
 * Refresh validates original identity, optional OIDC nonce/auth_time and permissions;
 * it never upgrades authentication freshness. Unknown outcomes are unavailable.
 * Revocation reports Confirmed only under the declared provider cohort contract. */
export class OAuthConnectedProtocol extends Context.Service<
  OAuthConnectedProtocol,
  {
    readonly prepareAuthorization: (input: {
      readonly profile: OAuthConnectedProfile
      readonly callbackId: typeof OAuthCallbackId.Type
      readonly flowId: RequestBindingFlowId
      readonly prompt?: "none" | "login" | "consent" | "select_account"
      readonly loginHint?: string
    }) => Effect.Effect<
      Omit<OAuthProtocolPreparation, "configuration"> & {
        readonly configuration: OAuthConnectedConfiguration
      },
      OAuthProtocolRejected | OAuthUnavailable
    >
    readonly exchangeGrant: (input: {
      readonly configuration: OAuthConnectedConfiguration
      readonly secrets: OAuthTransactionSecrets
      readonly response: OAuthCodeResponse
      readonly verificationStartedAt: DateTime.Utc
    }) => Effect.Effect<OAuthConnectedGrantResponse, OAuthProtocolRejected | OAuthUnavailable>
    readonly refreshGrant: (input: {
      readonly context: OAuthConnectedTokenContext
      readonly material: OAuthConnectedTokenMaterial
      readonly verificationStartedAt: DateTime.Utc
    }) => Effect.Effect<OAuthConnectedGrantResponse, OAuthProtocolRejected | OAuthUnavailable>
    readonly revokeGrant: (input: {
      readonly context: OAuthConnectedTokenContext
      readonly material: OAuthConnectedTokenMaterial
    }) => Effect.Effect<"Confirmed", OAuthUnavailable>
  }
>()("@effect/auth/OAuthConnectedProtocol") {}
