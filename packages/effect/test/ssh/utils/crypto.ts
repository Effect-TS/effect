/**
 * A `Crypto` service backed by the runtime's WebCrypto implementation, for
 * tests that do not depend on a platform package.
 */
import type { Vitest } from "@effect/vitest"
import { it as vitest } from "@effect/vitest"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"

const randomBytes = (size: number): Uint8Array => {
  const out = new Uint8Array(size)
  for (let offset = 0; offset < size; offset += 65536) {
    globalThis.crypto.getRandomValues(out.subarray(offset, Math.min(size, offset + 65536)))
  }
  return out
}

export const crypto: Crypto.Crypto = Crypto.make({ ...Crypto.makeSubtle(globalThis.crypto.subtle), randomBytes })

export const CryptoLive: Layer.Layer<Crypto.Crypto> = Layer.succeed(Crypto.Crypto, crypto)

/** Provides the WebCrypto-backed `Crypto` service. */
export const provideCrypto = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, Exclude<R, Crypto.Crypto>> => Effect.provideService(effect, Crypto.Crypto, crypto)

/** Runs an effect that needs `Crypto`, for module-level fixtures. */
export const runWithCrypto = <A, E>(effect: Effect.Effect<A, E, Crypto.Crypto>): Promise<A> =>
  Effect.runPromise(provideCrypto(effect))

type Timeout = Parameters<Vitest.Test<Scope.Scope>>[2]

type Test<R> = <A, E>(name: string, self: () => Effect.Effect<A, E, R>, timeout?: Timeout) => void

interface Tester<R> extends Test<R> {
  readonly skip: Test<R>
  readonly skipIf: (condition: unknown) => Test<R>
  readonly only: Test<R>
  readonly fails: Test<R>
}

type Base = typeof vitest

/**
 * Wraps `@effect/vitest`'s `it` so that every `it.effect` / `it.live` body is
 * provided with a `Crypto` service.
 */
export const withCrypto = (
  base: Base,
  provide: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Crypto.Crypto>>
): Base & {
  readonly effect: Tester<Scope.Scope | Crypto.Crypto>
  readonly live: Tester<Scope.Scope | Crypto.Crypto>
} => {
  const wrap = (test: Vitest.Test<Scope.Scope>): Test<Scope.Scope | Crypto.Crypto> => (name, self, timeout) =>
    test(name, () => provide(self()), timeout)
  const tester = (base: Vitest.Tester<Scope.Scope>): Tester<Scope.Scope | Crypto.Crypto> =>
    Object.assign(wrap(base), {
      skip: wrap(base.skip),
      skipIf: (condition: unknown) => wrap(base.skipIf(condition)),
      only: wrap(base.only),
      fails: wrap(base.fails)
    })
  const call = ((...args: Array<unknown>) => (base as (...args: Array<unknown>) => unknown)(...args)) as Base
  return Object.assign(call, base, { effect: tester(base.effect), live: tester(base.live), layer: base.layer })
}

/** `it` from `@effect/vitest`, with `Crypto` provided to every test. */
export const it = withCrypto(vitest, provideCrypto)
