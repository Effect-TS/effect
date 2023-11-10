/**
 * This module provides a data structure called `Context` that can be used for dependency injection in effectful
 * programs. It is essentially a table mapping `Tag`s to their implementations (called `Service`s), and can be used to
 * manage dependencies in a type-safe way. The `Context` data structure is essentially a way of providing access to a set
 * of related services that can be passed around as a single unit. This module provides functions to create, modify, and
 * query the contents of a `Context`, as well as a number of utility types for working with tags and services.
 *
 * @since 2.0.0
 */
import type { Equal } from "./Equal.js"
import type { Tag, TypeId } from "./impl/Context.js"
import type { Inspectable } from "./Inspectable.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Context.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Context.js"

/**
 * @since 2.0.0
 */
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
