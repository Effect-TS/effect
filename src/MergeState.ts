/**
 * @since 2.0.0
 */
import type { BothRunning, LeftDone, MergeStateTypeId, RightDone } from "./impl/MergeState.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/MergeState.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/MergeState.js"

/**
 * @since 2.0.0
 */
export declare namespace MergeState {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/MergeState.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export type MergeState<Env, Err, Err1, Err2, Elem, Done, Done1, Done2> =
  | BothRunning<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
  | LeftDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>
  | RightDone<Env, Err, Err1, Err2, Elem, Done, Done1, Done2>

/**
 * @since 2.0.0
 */
export declare namespace MergeState {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Proto {
    readonly [MergeStateTypeId]: MergeStateTypeId
  }
}
