/**
 * WebCrypto-backed randomness, digests, and message authentication for Auth.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Digest from "effect/crypto/Digest"
import * as Mac from "effect/crypto/Mac"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Base64 from "effect/encoding/Base64"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"

/**
 * Supplies cryptographically secure randomness and digests from WebCrypto.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layerCryptoWeb: Layer.Layer<SecureRandom.SecureRandom | Digest.Digest> = Layer.merge(
  SecureRandom.layerWebCrypto,
  Digest.layerWebCrypto
)

/**
 * Supplies randomness, digests, and MAC operations for sessions and proofs.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layerWebCrypto: Layer.Layer<SecureRandom.SecureRandom | Digest.Digest | Mac.Mac> = Mac.layerWebCrypto.pipe(
  Layer.provideMerge(layerCryptoWeb)
)

/**
 * Decodes a PEM body's base64 payload into DER bytes, including escaped newlines.
 *
 * @stability unstable
 * @category decoding
 * @since 4.1.0
 */
export const decodePem = (pem: string): Uint8Array | undefined =>
  Result.getOrUndefined(
    Base64.decode(
      pem
        .replace(/\\r\\n|\\n/g, "\n")
        .replace(/-----[A-Z ]+-----/g, "")
        .replace(/\s/g, "")
    )
  )
