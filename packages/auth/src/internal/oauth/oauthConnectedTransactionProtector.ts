import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import type { OAuthConnectedTransactionContext } from "./connectedModels.ts"
import { make } from "./encryption/oauthConnectedTransactionProtector.ts"
import type { OAuthUnavailable } from "./signInErrors.ts"
import type { OAuthSealedTransaction, OAuthTransactionSecrets } from "./signInModels.ts"
import type { OAuthTransactionKeyring } from "./transactionKeyring.ts"

/** Separate connected purpose. Key retention includes live flow deadlines.
 * Layer teardown cancels and joins active operations before wiping keys;
 * later calls fail with OAuthUnavailable. */
export class OAuthConnectedTransactionProtector extends Context.Service<
  OAuthConnectedTransactionProtector,
  {
    readonly seal: (input: {
      readonly context: OAuthConnectedTransactionContext
      readonly secrets: OAuthTransactionSecrets
    }) => Effect.Effect<OAuthSealedTransaction, OAuthUnavailable>
    readonly open: (input: {
      readonly context: OAuthConnectedTransactionContext
      readonly sealed: OAuthSealedTransaction
    }) => Effect.Effect<OAuthTransactionSecrets, OAuthUnavailable>
  }
>()("@effect/auth/OAuthConnectedTransactionProtector") {
  static readonly layer = (keyring: OAuthTransactionKeyring) => Layer.effect(this, make(keyring))
}
