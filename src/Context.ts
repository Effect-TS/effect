import type { Tag, TypeId } from "./Context.impl.js"
import type { Equal } from "./Equal.js"
import type { Inspectable } from "./Inspectable.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./Context.impl.js"
export * from "./internal/Jumpers/Context.js"

export declare namespace Context {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Context.impl.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Context<Services> extends Equal, Pipeable, Inspectable {
  readonly [TypeId]: {
    readonly _S: (_: Services) => unknown
  }
  readonly unsafeMap: Map<Tag<any, any>, any>
}
