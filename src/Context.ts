import type { Equal } from "./Equal.js"
import type { Tag, TypeId } from "./impl/Context.js"
import type { Inspectable } from "./Inspectable.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./impl/Context.js"
export * from "./internal/Jumpers/Context.js"

export declare namespace Context {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Context.js"
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
