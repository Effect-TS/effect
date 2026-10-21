import * as Effect from "effect/Effect"
import * as Redacted from "effect/Redacted"

import {
  type OAuthConnectedGrantResponse,
  type OAuthConnectedProfile,
  type OAuthConnectedTokenContext,
  OAuthConnectedTokenMaterial
} from "./connectedModels.ts"
import { makeOAuthSnapshot } from "./signInSnapshot.ts"

/** @internal */
export interface PreviousGrantTokens {
  readonly material: OAuthConnectedTokenMaterial
  readonly context: Pick<OAuthConnectedTokenContext, "metadata">
}

/** @internal */
export const wipeConnectedMaterial = (material: OAuthConnectedTokenMaterial) => {
  Redacted.wipeUnsafe(material.accessToken)
  if (material.refreshToken) Redacted.wipeUnsafe(material.refreshToken)
  if (material.continuation._tag === "Oidc" && material.continuation.nonce) {
    Redacted.wipeUnsafe(material.continuation.nonce)
  }
}

/**
 * An omitted refresh token preserves the old credential and its provider expiry.
 * Each workflow separately owns its local retention horizon.
 *
 * @internal
 */
export const retainGrantTokens = Effect.fnUntraced(function*(
  profile: OAuthConnectedProfile,
  response: OAuthConnectedGrantResponse,
  previous?: PreviousGrantTokens
) {
  const refreshToken = profile.retention === "access-and-refresh"
    ? (response.material.refreshToken ?? previous?.material.refreshToken)
    : undefined

  const material = yield* snapshotOAuthConnectedTokenMaterial.effect({
    namespace: response.material.namespace,
    accessToken: response.material.accessToken,
    continuation: response.material.continuation,
    ...(refreshToken === undefined
      ? {}
      : { refreshToken: Redacted.make(Redacted.value(refreshToken)) })
  })

  const unchanged = previous !== undefined &&
    (response.material.refreshToken === undefined ||
      (previous.material.refreshToken !== undefined &&
        Redacted.value(response.material.refreshToken) ===
          Redacted.value(previous.material.refreshToken)))

  const oldExpiry = unchanged ? previous?.context.metadata.refreshExpiresAtMillis : undefined

  const refreshExpiresAtMillis = oldExpiry === undefined
    ? response.refreshExpiresAtMillis
    : Math.min(oldExpiry, response.refreshExpiresAtMillis ?? Number.MAX_SAFE_INTEGER)

  return { material, refreshExpiresAtMillis }
})

const snapshotOAuthConnectedTokenMaterial = makeOAuthSnapshot(OAuthConnectedTokenMaterial)
