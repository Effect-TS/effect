/**
 * Provides a deterministic implementation of the `SecureRandom` service for
 * tests.
 *
 * Random bytes, numbers, shuffles, UUIDs, and ULIDs are derived from a seeded
 * pseudo-random generator, so tests that depend on secure randomness can
 * assert exact values. Other cryptographic services are unaffected: key
 * generation and randomized encryption and signatures still use the platform's
 * secure generator.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as SecureRandom from "../crypto/SecureRandom.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Random from "../Random.ts"

/**
 * Creates a deterministic `SecureRandom` service using a seeded pseudo-random
 * generator.
 *
 * **When to use**
 *
 * Use to construct a `SecureRandom` service whose output is reproducible in
 * tests.
 *
 * **Details**
 *
 * Each evaluation starts a new random sequence from `seed`; random bytes,
 * numbers, shuffles, UUIDs, and ULIDs are derived from that sequence.
 *
 * **Gotchas**
 *
 * The generated values are deterministic and must not be used for
 * security-sensitive purposes. The sequence depends on the order in which
 * random operations are evaluated. UUIDv7 and ULID values also include the
 * current `Clock` time, which must be controlled separately when their complete
 * output needs to be reproducible.
 *
 * @see {@link layer} for providing the service as a layer
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make: (seed: string | number) => Effect.Effect<SecureRandom.SecureRandom> = Effect.fnUntraced(
  function*(_seed: string | number) {
    const seededRandom = yield* Random.Random
    return SecureRandom.make((size) => {
      const bytes = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        bytes[i] = Math.floor(seededRandom.nextDoubleUnsafe() * 256)
      }
      return bytes
    })
  },
  (effect, seed) => Random.withSeed(effect, seed)
)

/**
 * Creates a layer that provides deterministic `SecureRandom` operations from a
 * seed.
 *
 * **When to use**
 *
 * Use to provide reproducible random bytes, numbers, shuffles, UUIDs, and ULIDs
 * to an Effect program under test.
 *
 * **Details**
 *
 * Each layer build starts the random sequence from `seed`.
 *
 * **Gotchas**
 *
 * UUIDv7 and ULID values also depend on the current `Clock`. Provide a test
 * clock when their complete output needs to be reproducible.
 *
 * @see {@link make} for constructing the service directly
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (seed: string | number): Layer.Layer<SecureRandom.SecureRandom> =>
  Layer.effect(SecureRandom.SecureRandom, make(seed))
