import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { OAuthLinkTransactionContext } from "../accountsModels.ts"
import { OAuthUnavailable } from "../signInErrors.ts"
import { OAuthEncryptionKeyId, OAuthSealedTransaction, OAuthTransactionSecrets } from "../signInModels.ts"
import type { OAuthTransactionKeyring } from "../transactionKeyring.ts"
import { encodeUtf8 } from "./payload.ts"
import { transactionEncryption } from "./transactionEncryption.ts"

const codec = Schema.fromJsonString(
  Schema.Tuple([
    Schema.Literal("effect-auth/oauth-link-aead/v1"),
    OAuthSealedTransaction.fields.format,
    OAuthEncryptionKeyId,
    OAuthLinkTransactionContext
  ])
)

const aad = Effect.fnUntraced(function*(context: OAuthLinkTransactionContext, keyId: string) {
  const value = yield* Schema.encodeEffect(codec)([
    "effect-auth/oauth-link-aead/v1",
    "oauth-xchacha20poly1305-v1",
    keyId,
    context
  ]).pipe(Effect.mapError(() => OAuthUnavailable.make({})))

  return yield* encodeUtf8(value, 262144)
})

/** @internal */
export const make = (keyring: OAuthTransactionKeyring) =>
  transactionEncryption(OAuthLinkTransactionContext, aad, keyring, OAuthTransactionSecrets)
