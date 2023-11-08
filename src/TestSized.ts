import type { Effect } from "./Effect.js"
import type { FiberRef } from "./FiberRef.js"
import type { TestSizedTypeId } from "./TestSized.impl.js"

export * from "./internal/Jumpers/TestSized.js"
export * from "./TestSized.impl.js"

export declare namespace TestSized {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./TestSized.impl.js"
}
/**
 * @since 2.0.0
 */
export interface TestSized {
  readonly [TestSizedTypeId]: TestSizedTypeId
  readonly fiberRef: FiberRef<number>
  size(): Effect<never, never, number>
  withSize(size: number): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
}
