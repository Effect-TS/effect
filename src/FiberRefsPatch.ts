/**
 * @since 2.0.0
 */
import type { Add, AndThen, Empty, Remove, Update } from "./impl/FiberRefsPatch.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/FiberRefsPatch.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/FiberRefsPatch.js"

/**
 * @since 2.0.0
 */
export declare namespace FiberRefsPatch {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/FiberRefsPatch.js"
}
/**
 * A `FiberRefsPatch` captures the changes in `FiberRef` values made by a single
 * fiber as a value. This allows fibers to apply the changes made by a workflow
 * without inheriting all the `FiberRef` values of the fiber that executed the
 * workflow.
 *
 * @since 2.0.0
 * @category models
 */
export type FiberRefsPatch = Empty | Add | Remove | Update | AndThen
