/**
 * Provides a deterministic implementation of the Effect `Crypto` service for
 * tests.
 *
 * Random bytes, numbers, shuffles, UUIDs, and ULIDs are derived from a seeded
 * pseudo-random generator. Digest operations are delegated to an underlying
 * platform `Crypto` service.
 *
 * @since 4.0.0
 */
import * as Crypto from "../Crypto.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Random from "../Random.ts"

/**
 * Creates a deterministic `Crypto` service using a seeded pseudo-random
 * generator.
 *
 * **When to use**
 *
 * Use to construct a `Crypto` service whose random operations are reproducible
 * in tests while preserving the digest implementation of a platform `Crypto`
 * service.
 *
 * **Details**
 *
 * The effect requires an existing `Crypto` service and delegates digest
 * operations to it. Each evaluation starts a new random sequence from `seed`;
 * every other random operation is derived from that sequence.
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
 * @category constructors
 * @since 4.0.0
 */
export const make = (seed: string | number): Effect.Effect<Crypto.Crypto, never, Crypto.Crypto> =>
  Effect.gen(function*() {
    const crypto = yield* Crypto.Crypto
    const seededRandom = yield* Random.Random
    return Crypto.make({
      randomBytes: (size) => {
        const bytes = new Uint8Array(size)
        for (let i = 0; i < size; i++) {
          bytes[i] = Math.floor(seededRandom.nextDoubleUnsafe() * 256)
        }
        return bytes
      },
      digest: crypto.digest
    })
  }).pipe(Random.withSeed(seed))

/**
 * Creates a layer that provides deterministic `Crypto` random operations from
 * a seed.
 *
 * **When to use**
 *
 * Use to provide reproducible random bytes, numbers, shuffles, UUIDs, and ULIDs
 * to an Effect program under test.
 *
 * **Details**
 *
 * The layer requires an existing platform `Crypto` service whose digest
 * implementation is retained. Each layer build starts the random sequence from
 * `seed`.
 *
 * **Gotchas**
 *
 * UUIDv7 and ULID values also depend on the current `Clock`. Provide a test
 * clock when their complete output needs to be reproducible.
 *
 * @see {@link make} for constructing the service directly
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (seed: string | number): Layer.Layer<Crypto.Crypto, never, Crypto.Crypto> =>
  Layer.effect(Crypto.Crypto, make(seed))
