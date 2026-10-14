import type { AsymmetricAlgorithm } from "../Jwk.ts"
import type { Algorithm } from "./signatureParameters.ts"

export const algorithms = {
  ES256: "ECDSA-P256-SHA256",
  RS256: "RSASSA-PKCS1-v1_5-SHA256",
  PS256: "RSA-PSS-SHA256",
  EdDSA: "Ed25519"
} satisfies Record<AsymmetricAlgorithm, Algorithm>
