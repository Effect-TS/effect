/**
 * @since 2.0.0
 */
import * as Context from "./Context"
import type * as Effect from "./Effect"
import type * as FiberRef from "./FiberRef"
import * as core from "./internal/core"

/**
 * @since 2.0.0
 */
export const TestSizedTypeId = Symbol.for("effect/TestSized")

/**
 * @since 2.0.0
 */
export type TestSizedTypeId = typeof TestSizedTypeId

/**
 * @since 2.0.0
 */
export interface TestSized {
  readonly [TestSizedTypeId]: TestSizedTypeId
  readonly fiberRef: FiberRef.FiberRef<number>
  size(): Effect.Effect<never, never, number>
  withSize(size: number): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
}

/**
 * @since 2.0.0
 */
export const TestSized: Context.Tag<TestSized, TestSized> = Context.Tag(TestSizedTypeId)

/** @internal */
class SizedImpl implements TestSized {
  readonly [TestSizedTypeId]: TestSizedTypeId = TestSizedTypeId
  constructor(readonly fiberRef: FiberRef.FiberRef<number>) {}
  size(): Effect.Effect<never, never, number> {
    return core.fiberRefGet(this.fiberRef)
  }
  withSize(size: number) {
    return <R, E, A>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A> =>
      core.fiberRefLocally(this.fiberRef, size)(effect)
  }
}

/**
 * @since 2.0.0
 */
export const make = (size: number): TestSized => new SizedImpl(core.fiberRefUnsafeMake(size))

/**
 * @since 2.0.0
 */
export const fromFiberRef = (fiberRef: FiberRef.FiberRef<number>): TestSized => new SizedImpl(fiberRef)
