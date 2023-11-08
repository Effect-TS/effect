import type { Backing, NonEmptyChunk, TypeId } from "./Chunk.impl.js"
import type { Equal } from "./Equal.js"
import type { Inspectable } from "./Inspectable.impl.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./Chunk.impl.js"
export * from "./internal/Jumpers/Chunk.js"

/**
 * @category models
 * @since 2.0.0
 */
export interface Chunk<A> extends Iterable<A>, Equal, Pipeable, Inspectable {
  readonly [TypeId]: {
    readonly _A: (_: never) => A
  }
  readonly length: number
  /** @internal */
  right: Chunk<A>
  /** @internal */
  left: Chunk<A>
  /** @internal */
  backing: Backing<A>
  /** @internal */
  depth: number
}

/**
 * @since 2.0.0
 */
export declare namespace Chunk {
  /**
   * @since 2.0.0
   */
  export type Infer<T extends Chunk<any>> = T extends Chunk<infer A> ? A : never

  /**
   * @since 2.0.0
   */
  export type With<T extends Chunk<any>, A> = T extends NonEmptyChunk<any> ? NonEmptyChunk<A> : Chunk<A>

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Chunk.impl.js"
}
