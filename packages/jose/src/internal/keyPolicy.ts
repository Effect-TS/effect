import * as Effect from "effect/Effect"
import { InvalidKey } from "../Errors.ts"
import type { PrivateJwk, PublicJwk, SecretJwk } from "../Jwk.ts"

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
