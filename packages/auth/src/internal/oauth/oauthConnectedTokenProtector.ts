import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import type {
  OAuthConnectedSealedTokens,
  OAuthConnectedTokenContext,
  OAuthConnectedTokenMaterial
} from "./connectedModels.ts"
import { make } from "./encryption/oauthConnectedTokenProtector.ts"
import type { OAuthUnavailable } from "./signInErrors.ts"
import type { OAuthTransactionKeyring } from "./transactionKeyring.ts"

export type OAuthConnectedTokenKeyring = OAuthTransactionKeyring

/** Explicit encrypted long-lived tokens; dedicated key retention covers all live
 * grants and unresolved refresh/revocation work. Fixed typed AAD, no raw context.
 * Layer teardown cancels and joins active operations before wiping keys;
 * later calls fail with OAuthUnavailable. */
export class OAuthConnectedTokenProtector extends Context.Service<
  OAuthConnectedTokenProtector,
  {
    readonly seal: (input: {
      readonly context: OAuthConnectedTokenContext
      readonly material: OAuthConnectedTokenMaterial
    }) => Effect.Effect<OAuthConnectedSealedTokens, OAuthUnavailable>
    readonly open: (input: {
      readonly context: OAuthConnectedTokenContext
      readonly sealed: OAuthConnectedSealedTokens
    }) => Effect.Effect<OAuthConnectedTokenMaterial, OAuthUnavailable>
  }
>()("@effect/auth/OAuthConnectedTokenProtector") {
  static readonly layer = (keyring: OAuthConnectedTokenKeyring) => Layer.effect(this, make(keyring))
}
