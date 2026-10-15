import * as CryptoError from "effect/crypto/CryptoError"
import * as Rsa from "effect/crypto/Rsa"
import * as Effect from "effect/Effect"
import type { PrivateJwk, PublicJwk, SecretJwk } from "../Jose/Jwk.ts"
import { InvalidKey } from "../JoseError.ts"

export const check = (
  jwk: PublicJwk | PrivateJwk | SecretJwk,
  algorithm: string,
  operation: "sign" | "verify" | "encrypt" | "decrypt"
) => {
  const use = operation === "sign" || operation === "verify" ? "sig" : "enc"

  return (jwk.alg !== undefined && jwk.alg !== algorithm) ||
      (jwk.use !== undefined && jwk.use !== use) ||
      (jwk.key_ops !== undefined && !jwk.key_ops.includes(operation))
    ? Effect.fail(InvalidKey.make({}))
    : Effect.void
}

/** Check the parsed key, not caller-supplied JWK metadata. */
export const checkRsa = Effect.fnUntraced(
  function*(key: Rsa.PublicKey): Effect.fn.Return<void, CryptoError.CryptoError> {
    if ((yield* Rsa.modulusLength(key)) < 2048) {
      return yield* new CryptoError.CryptoError({
        algorithm: "RSA",
        method: "checkRsa",
        reason: new CryptoError.InvalidKey({ description: "RSA keys must contain at least 2048 bits" })
      })
    }
  }
)
