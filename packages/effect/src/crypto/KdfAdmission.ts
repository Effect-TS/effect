/**
 * Shared admission control for expensive key derivation and its cleanup.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Context from "../Context.ts"
import * as Data from "../Data.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as Option from "../Option.ts"
import * as Semaphore from "../Semaphore.ts"
import * as CryptoError from "./CryptoError.ts"

/**
 * Admission capacity and the maximum time a caller may wait for a permit.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options {
  readonly concurrency?: number | undefined
  readonly maxQueued?: number | undefined
  readonly maxWaitMilliseconds?: number | undefined
}

/**
 * The queue is full or the wait for a derivation permit expired.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class KdfBusy extends Data.TaggedError("KdfBusy")<{}> {
  override get message(): string {
    return "Key derivation capacity is exhausted"
  }
}

/**
 * Service that bounds expensive work across KDF implementations.
 *
 * **Details**
 *
 * `run` retains its permit through scoped cleanup. Nested calls in the same
 * fiber reuse the permit; child fibers acquire their own. Waiting can be
 * interrupted. Nonabortable backends must mask interruption until they settle.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class KdfAdmission extends Context.Service<KdfAdmission, {
  readonly run: <A, E, R>(work: Effect.Effect<A, E, R>) => Effect.Effect<A, E | KdfBusy, R>
}>()("effect/crypto/KdfAdmission") {}

/**
 * Creates a shared gate with one active derivation, sixteen queued callers,
 * and a five-second acquisition timeout by default.
 *
 * **Details**
 *
 * Concurrency must be between 1 and 32, the queue capacity nonnegative, and
 * the wait positive. All three values must be safe integers. Invalid
 * configuration fails when the layer is built.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options = {}): Layer.Layer<KdfAdmission, CryptoError.CryptoError> => {
  const concurrency = options.concurrency ?? 1
  const maxQueued = options.maxQueued ?? 16
  const maxWaitMilliseconds = options.maxWaitMilliseconds ?? 5000
  return Layer.effect(
    KdfAdmission,
    Effect.gen(function*() {
      if (
        !Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 32 ||
        !Number.isSafeInteger(maxQueued) || maxQueued < 0 ||
        !Number.isSafeInteger(concurrency + maxQueued) ||
        !Number.isSafeInteger(maxWaitMilliseconds) || maxWaitMilliseconds <= 0
      ) {
        return yield* new CryptoError.CryptoError({
          module: "KdfAdmission",
          method: "layer",
          reason: new CryptoError.InvalidArgument({ description: "Invalid KDF admission configuration" })
        })
      }

      const active = yield* Semaphore.make(concurrency)
      const admitted = yield* Semaphore.make(concurrency + maxQueued)
      const owners = new Set<number>()
      const acquire = Effect.acquireRelease(active.take(1), () => active.release(1), {
        interruptible: true
      }).pipe(
        Effect.timeoutOrElse({
          duration: maxWaitMilliseconds,
          orElse: () => Effect.fail(new KdfBusy())
        })
      )

      return KdfAdmission.of({
        run: <A, E, R>(work: Effect.Effect<A, E, R>) =>
          Effect.withFiber((fiber) => {
            if (owners.has(fiber.id)) return work
            const owned = Effect.acquireRelease(
              Effect.sync(() => owners.add(fiber.id)),
              () => Effect.sync(() => owners.delete(fiber.id))
            ).pipe(Effect.andThen(work))
            return admitted.withPermitsIfAvailable(1)(Effect.scoped(Effect.andThen(acquire, owned))).pipe(
              Effect.flatMap((result) =>
                Option.isSome(result) ? Effect.succeed(result.value) : Effect.fail(new KdfBusy())
              )
            )
          })
      })
    })
  )
}
