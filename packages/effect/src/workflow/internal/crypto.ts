import * as Digest from "../../crypto/Digest.ts"
import * as Effect from "../../Effect.ts"

const encoder = new TextEncoder()

/**
 * Execution ids and idempotency keys are persisted, so they keep the first 16
 * bytes of the SHA-256 digest as 32 hex characters.
 *
 * @internal
 */
export const makeHashDigest = (original: string): Effect.Effect<string> =>
  Effect.map(Digest.digestHex(Digest.sha256, encoder.encode(original)), (hex) => hex.slice(0, 32))
