import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

import type { OAuthConnectedTokenContext, OAuthConnectedTokenMaterial } from "../../connectedModels.ts"
import { OAuthUnavailable } from "../../signInErrors.ts"
import type { OpenIdConnectAuthentication } from "./models.ts"

/**
 * Private provider-owned cohort revocation; transport belongs to its adapter.
 *
 * @internal
 */
export class ProviderRevocation extends Context.Service<
  ProviderRevocation,
  {
    readonly revoke: (input: {
      readonly clientId: string
      readonly authentication: OpenIdConnectAuthentication
      readonly context: OAuthConnectedTokenContext
      readonly material: OAuthConnectedTokenMaterial
    }) => Effect.Effect<void, OAuthUnavailable>
  }
>()("@effect/auth/oauth/providers/ProviderRevocation") {
  static readonly layerUnsupported = Layer.succeed(ProviderRevocation, {
    revoke: () => Effect.fail(OAuthUnavailable.make({}))
  })
}
