import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { OAuthConnectedTransactionContext } from "../connectedModels.ts"
import { OAuthUnavailable } from "../signInErrors.ts"
import { OAuthSealedTransaction, OAuthTransactionSecrets } from "../signInModels.ts"
import type { OAuthTransactionKeyring } from "../transactionKeyring.ts"
import { encodeUtf8 } from "./payload.ts"
import { transactionEncryption } from "./transactionEncryption.ts"

const codec = Schema.fromJsonString(
  Schema.Tuple([
    Schema.Literal("effect-auth/oauth-connected-aead/v1"),
    OAuthSealedTransaction.fields.format,
    OAuthSealedTransaction.fields.keyId,
    OAuthConnectedTransactionContext
  ])
)

const aad = Effect.fnUntraced(function*(context: OAuthConnectedTransactionContext, keyId: string) {
  const value = yield* Schema.encodeEffect(codec)([
    "effect-auth/oauth-connected-aead/v1",
    "oauth-xchacha20poly1305-v1",
    keyId,
    context
  ]).pipe(Effect.mapError(() => OAuthUnavailable.make({})))

  return yield* encodeUtf8(value, 262144)
})

/** @internal */
export const make = (keyring: OAuthTransactionKeyring) =>
  transactionEncryption(OAuthConnectedTransactionContext, aad, keyring, OAuthTransactionSecrets, {
    schema: OAuthSealedTransaction,
    maximumPlaintextBytes: 16384
  })
