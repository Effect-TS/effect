/**
 * @since 0.1.0
 */
import * as B from "bun:test"
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as FC from "effect/FastCheck"
import type * as Layer from "effect/Layer"
import type * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import type * as TestServices from "effect/TestServices"
import * as internal from "./internal/internal.js"
import type { BunTest } from "./types.js"

// Re-export Bun test hooks and assertion API
export const afterAll = B.afterAll
export const afterEach = B.afterEach
export const beforeAll = B.beforeAll
export const beforeEach = B.beforeEach
export const describe = B.describe
export const expect = B.expect
export const jest = B.jest
export const mock = B.mock
export const setDefaultTimeout = B.setDefaultTimeout
export const setSystemTime = B.setSystemTime
export const spyOn = B.spyOn
export const test = B.test

// Re-export Bun types
export type * from "bun:test"

// Public types namespace (for consumers who want explicit types)
export type { BunTest } from "./types.js"

// Public API
export const addEqualityTesters: () => void = internal.addEqualityTesters
export const effect: BunTest.Tester<TestServices.TestServices> = internal.effect
export const scoped: BunTest.Tester<TestServices.TestServices | Scope.Scope> = internal.scoped
export const live: BunTest.Tester<never> = internal.live
export const scopedLive: BunTest.Tester<Scope.Scope> = internal.scopedLive
export const layer: <R, E>(
  layer_: Layer.Layer<R, E>,
  options?: { readonly memoMap?: Layer.MemoMap; readonly timeout?: Duration.DurationInput }
) => {
  (f: (it: BunTest.Methods<R>) => void): void
  (name: string, f: (it: BunTest.Methods<R>) => void): void
} = internal.layer

export const flakyTest = internal.flakyTest as <A, E, R>(
  self: Effect.Effect<A, E, R>,
  timeout?: Duration.DurationInput
) => Effect.Effect<A, never, R>

export const prop: <const Arbs extends BunTest.Arbitraries>(
  name: string,
  arbitraries: Arbs,
  self: (
    props: { [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Schema.Schema.Type<Arbs[K]> }
  ) => void,
  options?: number | {
    timeout?: number
    fastCheck?: FC.Parameters<
      { [K in keyof Arbs]: Arbs[K] extends FC.Arbitrary<infer T> ? T : Schema.Schema.Type<Arbs[K]> }
    >
  }
) => void = internal.prop as any

const methods = { effect, live, flakyTest, scoped, scopedLive, layer, prop } as const
export const it = Object.assign(B.test, methods) as any as BunTest.Methods

// Optional namespaced re-exports for consistency with codegen
export * as types from "./types.js"
