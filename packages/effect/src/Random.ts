/**
 * Provides pseudo-random generation through an Effect service.
 *
 * This module exposes effectful generators for booleans, doubles, safe
 * integers, bounded numbers, shuffling, and deterministic seeded runs. Because
 * random generation is a service, tests and applications can replace the
 * generator used by Effect programs.
 *
 * @since 4.0.0
 */
import type * as Arr from "./Array.ts"
import * as Cause from "./Cause.ts"
import type * as Context from "./Context.ts"
import type * as Crypto from "./Crypto.ts"
import * as Effect from "./Effect.ts"
import { dual } from "./Function.ts"
import * as random from "./internal/random.ts"
import type * as NonEmptyIterable from "./NonEmptyIterable.ts"

/**
 * Represents a service for generating pseudo-random numbers.
 *
 * **When to use**
 *
 * Use to access or provide the random-number generator service used by Effect
 * programs.
 *
 * **Gotchas**
 *
 * The default implementation uses `Math.random`, and `withSeed` uses a
 * deterministic generator. Neither is cryptographically secure. Use the
 * platform `Crypto` service for security-sensitive random values.
 *
 * **Example** (Accessing the random service)
 *
 * ```ts import.meta.vitest
 * import { Effect, Random } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const float = yield* Random.next
 *   const integer = yield* Random.nextInt
 *   const inRange = yield* Random.nextIntBetween(1, 100)
 *   return [float, integer, inRange] as const
 * })
 *
 * await Effect.runPromise(program.pipe(Random.withSeed("example"))) // => [0.5616901992899823, -2677443905107343, 80]
 * ```
 *
 * @see {@link Crypto.Crypto} for cryptographically secure random values
 * @category services
 * @since 2.0.0
 */
export const Random: Context.Reference<{
  nextIntUnsafe(): number
  nextDoubleUnsafe(): number
}> = random.Random

const randomWith = <A>(f: (random: typeof Random["Service"]) => A): Effect.Effect<A> =>
  Effect.withFiber((fiber) => Effect.succeed(f(fiber.getRef(Random))))

/**
 * Generates a random number between 0 (inclusive) and 1 (exclusive).
 *
 * **When to use**
 *
 * Use to generate a pseudo-random floating-point number in the standard
 * `[0, 1)` range.
 *
 * **Example** (Generating a random number)
 *
 * ```ts import.meta.vitest
 * import { Effect, Random } from "effect"
 *
 * await Effect.runPromise(Random.next.pipe(Random.withSeed("example"))) // => 0.5616901992899823
 * ```
 *
 * @category generators
 * @since 2.0.0
 */
export const next: Effect.Effect<number> = randomWith((r) => r.nextDoubleUnsafe())

/**
 * Generates a random boolean value.
 *
 * **When to use**
 *
 * Use to make a pseudo-random true-or-false choice.
 *
 * **Example** (Generating a random boolean)
 *
 * ```ts import.meta.vitest
 * import { Effect, Random } from "effect"
 *
 * await Effect.runPromise(Random.nextBoolean.pipe(Random.withSeed("example"))) // => true
 * ```
 *
 * @category generators
 * @since 2.0.0
 */
export const nextBoolean: Effect.Effect<boolean> = randomWith((r) => r.nextDoubleUnsafe() > 0.5)

/**
 * Generates a random integer between `Number.MIN_SAFE_INTEGER` (inclusive)
 * and `Number.MAX_SAFE_INTEGER` (inclusive).
 *
 * **When to use**
 *
 * Use to generate a pseudo-random safe integer across the full safe-integer
 * range.
 *
 * **Example** (Generating a random integer)
 *
 * ```ts import.meta.vitest
 * import { Effect, Random } from "effect"
 *
 * await Effect.runPromise(Random.nextInt.pipe(Random.withSeed("example"))) // => 1111311834139105
 * ```
 *
 * @category generators
 * @since 2.0.0
 */
export const nextInt: Effect.Effect<number> = randomWith((r) => r.nextIntUnsafe())

/**
 * Generates a random number between `min` (inclusive) and `max` (exclusive).
 *
 * **When to use**
 *
 * Use to generate a pseudo-random floating-point number within a numeric range.
 *
 * **Example** (Generating a bounded random number)
 *
 * ```ts import.meta.vitest
 * import { Effect, Random } from "effect"
 *
 * await Effect.runPromise(Random.nextBetween(0, 1).pipe(Random.withSeed("example"))) // => 0.5616901992899823
 * ```
 *
 * @category generators
 * @since 4.0.0
 */
export const nextBetween = (min: number, max: number): Effect.Effect<number> =>
  randomWith((r) => r.nextDoubleUnsafe() * (max - min) + min)

/**
 * Generates a random integer between `min` and `max`.
 *
 * **When to use**
 *
 * Use to generate a pseudo-random integer within a rounded numeric range.
 *
 * **Details**
 *
 * The lower bound is rounded up with `Math.ceil` and the upper bound is
 * rounded down with `Math.floor`. By default the range is inclusive; set
 * `options.halfOpen: true` to exclude the upper bound.
 *
 * **Example** (Generating a bounded random integer)
 *
 * ```ts import.meta.vitest
 * import { Effect, Random } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const diceRoll1 = yield* Random.nextIntBetween(1, 6)
 *   const diceRoll2 = yield* Random.nextIntBetween(1, 6, {
 *     halfOpen: true
 *   })
 *   const diceRoll3 = yield* Random.nextIntBetween(0, 10)
 *   return [diceRoll1, diceRoll2, diceRoll3]
 * })
 *
 * await Effect.runPromise(program.pipe(Random.withSeed("example"))) // => [4, 2, 8]
 * ```
 *
 * @category generators
 * @since 2.0.0
 */
export const nextIntBetween = (min: number, max: number, options?: {
  readonly halfOpen?: boolean
}): Effect.Effect<number> => {
  const extra = options?.halfOpen === true ? 0 : 1
  return randomWith((r) => {
    const minInt = Math.ceil(min)
    const maxInt = Math.floor(max)
    return Math.floor(r.nextDoubleUnsafe() * (maxInt - minInt + extra)) + minInt
  })
}

/**
 * Uses the pseudo-random number generator to shuffle the specified iterable.
 *
 * **When to use**
 *
 * Use to randomly reorder an iterable using the active `Random` service.
 *
 * **Example** (Shuffling values)
 *
 * ```ts import.meta.vitest
 * import { Effect, Random } from "effect"
 *
 * await Effect.runPromise(Random.shuffle([1, 2, 3, 4, 5]).pipe(Random.withSeed("example"))) // => [1, 4, 5, 2, 3]
 * ```
 *
 * @category generators
 * @since 2.0.0
 */
export const shuffle = <A>(elements: Iterable<A>): Effect.Effect<Array<A>> =>
  randomWith((r) => {
    const buffer = Array.from(elements)
    for (let i = buffer.length - 1; i >= 1; i = i - 1) {
      const index = Math.min(i, Math.floor(r.nextDoubleUnsafe() * (i + 1)))
      const value = buffer[i]!
      buffer[i] = buffer[index]!
      buffer[index] = value
    }
    return buffer
  })

/**
 * Gets a random element from an iterable.
 *
 * **When to use**
 *
 * Use to select one value uniformly from a collection using the active `Random`
 * service.
 *
 * **Details**
 *
 * If the input type is known to be non-empty, the returned effect cannot fail.
 * Otherwise, empty iterables fail with `Cause.NoSuchElementError`.
 *
 * **Example** (Choosing a random value)
 *
 * ```ts import.meta.vitest
 * import { Effect, Random } from "effect"
 *
 * await Effect.runPromise(Random.choice(["red", "green", "blue"] as const).pipe(Random.withSeed("example"))) // => "green"
 * ```
 *
 * @category generators
 * @since 3.6.0
 */
export const choice: <Self extends Iterable<unknown>>(
  elements: Self
) => Self extends NonEmptyIterable.NonEmptyIterable<infer A> ? Effect.Effect<A>
  : Self extends Arr.NonEmptyReadonlyArray<infer A> ? Effect.Effect<A>
  : Self extends Iterable<infer A> ? Effect.Effect<A, Cause.NoSuchElementError>
  : never = ((elements: Iterable<unknown>) => {
    const buffer = Array.from(elements)
    return buffer.length === 0
      ? Effect.fail(new Cause.NoSuchElementError("Cannot select a random element from an empty array"))
      : randomWith((r) => buffer[Math.min(buffer.length - 1, Math.floor(r.nextDoubleUnsafe() * buffer.length))]!)
  }) as any

/**
 * Seeds the pseudo-random number generator with the specified value.
 *
 * **When to use**
 *
 * Use to run an effect with a deterministic pseudo-random sequence.
 *
 * **Details**
 *
 * Using the same seed produces the same random sequence, which is useful for
 * tests and reproducible simulations.
 *
 * **Gotchas**
 *
 * The generated sequence is deterministic and not cryptographically secure.
 * Use the platform `Crypto` service for security-sensitive random values.
 *
 * **Example** (Seeding random generation)
 *
 * ```ts import.meta.vitest
 * import { Effect, Random } from "effect"
 *
 * const program = Effect.gen(function*() {
 *   const value1 = yield* Random.next
 *   const value2 = yield* Random.next
 *   return [value1, value2]
 * })
 *
 * await Effect.runPromise(Effect.all([
 *   program.pipe(Random.withSeed("my-seed")),
 *   program.pipe(Random.withSeed("my-seed"))
 * ])) // => [[0.6326454961245862, 0.8450308069253001], [0.6326454961245862, 0.8450308069253001]]
 * ```
 *
 * @see {@link Crypto.Crypto} for cryptographically secure random values
 * @category providing services
 * @since 4.0.0
 */
export const withSeed: {
  (seed: string | number): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(self: Effect.Effect<A, E, R>, seed: string | number): Effect.Effect<A, E, R>
} = dual(2, <A, E, R>(
  self: Effect.Effect<A, E, R>,
  seed: string | number
) => Effect.provideService(self, Random, random.makeSeeded(seed)))
