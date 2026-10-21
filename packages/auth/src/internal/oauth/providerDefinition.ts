import type * as Effect from "effect/Effect"

import type { OAuthConnectedProtocol } from "./oauthConnectedProtocol.ts"
import type { OAuthProtocol } from "./oauthProtocol.ts"
import type { OAuthProviderKey } from "./schema.ts"
import type { OAuthCallbackId, OAuthRedirectUri } from "./signInModels.ts"

/** A server-side provider declaration. The host supplies its stable provider key
 * and exact callback destinations; the adapter owns discovery and exchanges.
 * Importing this contract does not load any optional protocol implementation. */
export interface ProviderDefinition<E = never, R = never> {
  readonly configure: (binding: {
    readonly provider: OAuthProviderKey
    readonly callbacks: ReadonlyArray<{
      readonly callbackId: typeof OAuthCallbackId.Type
      readonly redirectUri: typeof OAuthRedirectUri.Type
    }>
  }) => Effect.Effect<
    OAuthProtocol["Service"] & { readonly connected?: OAuthConnectedProtocol["Service"] },
    E,
    R
  >
}
