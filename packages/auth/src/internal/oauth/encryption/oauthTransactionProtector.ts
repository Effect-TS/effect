import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { OAuthUnavailable } from "../signInErrors.ts"
import {
  OAuthEncryptionKeyId,
  OAuthSealedTransaction,
  OAuthSignInTransactionContext,
  OAuthTransactionSecrets
} from "../signInModels.ts"
import type { OAuthTransactionKeyring } from "../transactionKeyring.ts"
import { encodeUtf8 } from "./payload.ts"
import { transactionEncryption } from "./transactionEncryption.ts"

const aadCodec = Schema.fromJsonString(
  Schema.Tuple([
    Schema.Literal("effect-auth/oauth-sign-in-aead/v1"),
    OAuthSealedTransaction.fields.format,
    OAuthEncryptionKeyId,
    OAuthSignInTransactionContext
  ])
)

const aad = Effect.fnUntraced(function*(context: OAuthSignInTransactionContext, keyId: string) {
  const encoded = yield* Schema.encodeEffect(aadCodec)([
    "effect-auth/oauth-sign-in-aead/v1",
    "oauth-xchacha20poly1305-v1",
    keyId,
    context
  ]).pipe(Effect.mapError(() => OAuthUnavailable.make({})))

  return yield* encodeUtf8(encoded, 262144)
})

/** @internal */
export const make = (keyring: OAuthTransactionKeyring) =>
  transactionEncryption(OAuthSignInTransactionContext, aad, keyring, OAuthTransactionSecrets)
