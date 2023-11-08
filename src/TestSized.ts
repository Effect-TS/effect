/**
 * @since 2.0.0
 */
import { Context } from "./Context.js"
import type { Effect } from "./Effect.js"
import type { FiberRef } from "./FiberRef.js"
import * as core from "./internal/core.js"

/**
 * @since 2.0.0
 */
export const TestSizedTypeId = Symbol.for("effect/TestSized")

/**
 * @since 2.0.0
 */
export type TestSizedTypeId = typeof TestSizedTypeId

export * as TestSized from "./TestSized.js"
declare module "./TestSized.js" {
  /**
   * @since 2.0.0
   */
  export interface TestSized {
    readonly [TestSizedTypeId]: TestSizedTypeId
    readonly fiberRef: FiberRef<number>
    size(): Effect<never, never, number>
    withSize(size: number): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  }
}

/**
 * @since 2.0.0
 */
export const Tag: Context.Tag<TestSized, TestSized> = Context.Tag(TestSizedTypeId)

/** @internal */
class SizedImpl implements TestSized {
  readonly [TestSizedTypeId]: TestSizedTypeId = TestSizedTypeId
  constructor(readonly fiberRef: FiberRef<number>) {}
  size(): Effect<never, never, number> {
    return core.fiberRefGet(this.fiberRef)
  }
  withSize(size: number) {
    return <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> => core.fiberRefLocally(this.fiberRef, size)(effect)
  }
}

/**
 * @since 2.0.0
 */
export const make = (size: number): TestSized => new SizedImpl(core.fiberRefUnsafeMake(size))

/**
 * @since 2.0.0
 */
export const fromFiberRef = (fiberRef: FiberRef<number>): TestSized => new SizedImpl(fiberRef)
