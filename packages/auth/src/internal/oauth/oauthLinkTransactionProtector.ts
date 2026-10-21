import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import type { OAuthLinkTransactionContext } from "./accountsModels.ts"
import { make } from "./encryption/oauthLinkTransactionProtector.ts"
import type { OAuthUnavailable } from "./signInErrors.ts"
import type { OAuthSealedTransaction, OAuthTransactionSecrets } from "./signInModels.ts"
import type { OAuthTransactionKeyring } from "./transactionKeyring.ts"

/** Typed authenticated-link domain, isolated from guest sign-in. Layer teardown
 * cancels and joins active operations before wiping keys; later calls fail closed.
 * Dedicated keyring retention covers issued and claimed link horizons and deployment convergence;
 * link-binder signing keys have their own independent retention obligation. */
export class OAuthLinkTransactionProtector extends Context.Service<
  OAuthLinkTransactionProtector,
  {
    readonly seal: (input: {
      readonly context: OAuthLinkTransactionContext
      readonly secrets: OAuthTransactionSecrets
    }) => Effect.Effect<OAuthSealedTransaction, OAuthUnavailable>
    readonly open: (input: {
      readonly context: OAuthLinkTransactionContext
      readonly sealed: OAuthSealedTransaction
    }) => Effect.Effect<OAuthTransactionSecrets, OAuthUnavailable>
  }
>()("@effect/auth/OAuthLinkTransactionProtector") {
  static readonly layer = (keyring: OAuthTransactionKeyring) => Layer.effect(this, make(keyring))
}
