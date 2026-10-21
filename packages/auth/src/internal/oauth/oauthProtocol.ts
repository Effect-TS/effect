import * as Context from "effect/Context"
import type * as DateTime from "effect/DateTime"
import type * as Effect from "effect/Effect"

import type { RequestBindingFlowId } from "../operations/requestBinding.ts"
import type { OAuthProviderKey } from "./schema.ts"
import type { OAuthProtocolRejected, OAuthRejected, OAuthUnavailable } from "./signInErrors.ts"
import type {
  OAuthCallbackId,
  OAuthCodeResponse,
  OAuthProtocolConfiguration,
  OAuthProtocolPreparation,
  OAuthTransactionSecrets,
  OAuthVerifiedExternalIdentity
} from "./signInModels.ts"

/** Configured protocol authority. Resolve exact captured configuration generations;
 * preparation/exchange run outside persistence owners. Discard all provider tokens
 * in sign-in adapters; profile/email never selects application identity.
 * The adapter owns canonical issuer, exact configured redirect, fixed provider
 * authorization origin/parameters, S256 and nonce validation, and retention of
 * each configuration generation through its issued flow horizon. Never discover
 * a caller-supplied issuer or substitute a newer configuration at completion.
 * No network implementation is installed by the core method.
 */
export class OAuthProtocol extends Context.Service<
  OAuthProtocol,
  {
    readonly prepareAuthorization: (input: {
      readonly provider: OAuthProviderKey
      /** Omission selects the provider-named callback, or its only callback.
       * Ambiguous configurations must reject rather than choose by array order. */
      readonly callbackId?: typeof OAuthCallbackId.Type
      readonly flowId: RequestBindingFlowId
      readonly prompt?: "none" | "login" | "consent" | "select_account"
      readonly loginHint?: string
    }) => Effect.Effect<OAuthProtocolPreparation, OAuthRejected | OAuthUnavailable>
    readonly exchangeVerifiedIdentity: (input: {
      readonly configuration: OAuthProtocolConfiguration
      readonly response: OAuthCodeResponse
      readonly secrets: OAuthTransactionSecrets
      readonly verificationStartedAt: DateTime.Utc
    }) => Effect.Effect<OAuthVerifiedExternalIdentity, OAuthProtocolRejected | OAuthUnavailable>
  }
>()("@effect/auth/OAuthProtocol") {}
