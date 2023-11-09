import type { Variance } from "../FiberRef.js"
import type { Pipeable } from "./Pipeable.js"

export * from "../FiberRef.js"
export * from "../internal/Jumpers/FiberRef.js"

export declare namespace FiberRef {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../FiberRef.js"
}
/**
 * @since 2.0.0
 * @category model
 */
export interface FiberRef<A> extends Variance<A>, Pipeable {
  /** @internal */
  readonly initial: A
  /** @internal */
  readonly diff: (oldValue: A, newValue: A) => unknown
  /** @internal */
  readonly combine: (first: unknown, second: unknown) => unknown
  /** @internal */
  readonly patch: (patch: unknown) => (oldValue: A) => A
  /** @internal */
  readonly fork: unknown
  /** @internal */
  readonly join: (oldValue: A, newValue: A) => A
}
