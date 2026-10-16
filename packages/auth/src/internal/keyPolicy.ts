import * as CryptoError from "effect/crypto/CryptoError"
import * as Digest from "effect/crypto/Digest"
import * as Signature from "effect/crypto/Signature"
import * as Effect from "effect/Effect"
import { InvalidKey } from "../jose/JoseError.ts"
import type { AsymmetricAlgorithm, PrivateJwk, PublicJwk, SecretJwk } from "../jose/Jwk.ts"

/** @internal */
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

/**
 * Check the parsed key, not caller-supplied JWK metadata.
 * @internal
 */
export const checkRsa = Effect.fnUntraced(
  function*(key: Signature.PublicKey | Signature.PrivateKey): Effect.fn.Return<void, CryptoError.CryptoError> {
    if (
      (key.algorithm._tag === "RsaPss" || key.algorithm._tag === "RsaPkcs1v15") &&
      key.algorithm.modulusLength < 2048
    ) {
      return yield* new CryptoError.CryptoError({
        module: "Signature",
        method: "checkRsa",
        reason: new CryptoError.InvalidKey({ description: "RSA keys must contain at least 2048 bits" })
      })
    }
  }
)

/** @internal */
export const signatureAlgorithm = (algorithm: AsymmetricAlgorithm, modulusLength = 2048): Signature.Algorithm => {
  switch (algorithm) {
    case "ES256":
      return Signature.ecdsaP256
    case "EdDSA":
      return Signature.ed25519
    case "PS256":
      return Signature.rsaPss({ hash: Digest.sha256, modulusLength, saltLength: 32 })
    case "RS256":
      return Signature.rsaPkcs1v15({ hash: Digest.sha256, modulusLength })
  }
}
