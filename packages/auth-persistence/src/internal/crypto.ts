import { TokenDigest } from "@effect/auth/Schema"
import * as Digest from "effect/crypto/Digest"
import * as SecureRandom from "effect/crypto/SecureRandom"
import * as Effect from "effect/Effect"
import * as Base64Url from "effect/encoding/Base64Url"

const encoder = new TextEncoder()

/** @internal */
export const randomId = Effect.flatMap(
  SecureRandom.SecureRandom,
  (random) => random.randomBytes(32).pipe(Effect.map(Base64Url.encode))
)

/**
 * Persisted UTF-8 SHA-256, encoded as unpadded base64url.
 *
 * @internal
 */
export const digest = (value: string) =>
  Effect.flatMap(Digest.Digest, (digest) => digest.digest(Digest.sha256, encoder.encode(value))).pipe(
    Effect.map((bytes) => TokenDigest.make(Base64Url.encode(bytes)))
  )
