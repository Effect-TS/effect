import type { NodeInspectSymbol } from "./Inspectable.impl.js"

export * from "./Inspectable.impl.js"
export * from "./internal/Jumpers/Inspectable.js"

export declare namespace Inspectable {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Inspectable.impl.js"
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
