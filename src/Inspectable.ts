/**
 * @since 2.0.0
 */
import type { NodeInspectSymbol } from "./impl/Inspectable.js"

/**
 * @since 2.0.0
 */
export * from "./impl/Inspectable.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/Inspectable.js"

/**
 * @since 2.0.0
 */
export declare namespace Inspectable {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Inspectable.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Inspectable {
  readonly toString: () => string
  readonly toJSON: () => unknown
  readonly [NodeInspectSymbol]: () => unknown
}
