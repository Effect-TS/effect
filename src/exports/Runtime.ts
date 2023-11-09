import type { Context } from "./Context.js"
import type { FiberRefs } from "./FiberRefs.js"
import type { Pipeable } from "./Pipeable.js"
import type { RuntimeFlags } from "./RuntimeFlags.js"

export * from "../internal/Jumpers/Runtime.js"
export * from "../Runtime.js"

export declare namespace Runtime {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../Runtime.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Runtime<R> extends Pipeable {
  /**
   * The context used as initial for forks
   */
  readonly context: Context<R>
  /**
   * The runtime flags used as initial for forks
   */
  readonly runtimeFlags: RuntimeFlags
  /**
   * The fiber references used as initial for forks
   */
  readonly fiberRefs: FiberRefs
}
