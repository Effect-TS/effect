/**
 * @since 2.0.0
 */
import * as _RequestBlock from "./internal/blockedRequests.js"
import type * as Request from "./Request.js"
import type * as RequestResolver from "./RequestResolver.js"

/**
 * `RequestBlock` captures a collection of blocked requests as a data
 * structure. By doing this the library is able to preserve information about
 * which requests must be performed sequentially and which can be performed in
 * parallel, allowing for maximum possible batching and pipelining while
 * preserving ordering guarantees.
 *
 * @since 2.0.0
 * @category models
 */
export type RequestBlock = Empty | Par | Seq | Single

/**
 * @since 2.0.0
 * @category models
 */
export declare namespace RequestBlock {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Reducer<in out Z> {
    emptyCase(): Z
    parCase(left: Z, right: Z): Z
    singleCase(
      dataSource: RequestResolver.RequestResolver<unknown, never>,
      blockedRequest: Request.Entry<unknown>
    ): Z
    seqCase(left: Z, right: Z): Z
  }
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Empty {
  readonly _tag: "Empty"
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Par {
  readonly _tag: "Par"
  readonly left: RequestBlock
  readonly right: RequestBlock
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Seq {
  readonly _tag: "Seq"
  readonly left: RequestBlock
  readonly right: RequestBlock
}

/**
 * @since 2.0.0
 * @category models
 */
export interface Single {
  readonly _tag: "Single"
  readonly dataSource: RequestResolver.RequestResolver<unknown, never>
  readonly blockedRequest: Request.Entry<unknown>
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const single: <A>(
  dataSource: RequestResolver.RequestResolver<A, never>,
  blockedRequest: Request.Entry<A>
) => RequestBlock = _RequestBlock.single

/**
 * @since 2.0.0
 * @category constructors
 */
export const empty: RequestBlock = _RequestBlock.empty

/**
 * @since 2.0.0
 * @category constructors
 */
export const mapRequestResolvers: <A>(
  self: RequestBlock,
  f: (dataSource: RequestResolver.RequestResolver<A>) => RequestResolver.RequestResolver<A>
) => RequestBlock = _RequestBlock.mapRequestResolvers

/**
 * @since 2.0.0
 * @category constructors
 */
export const parallel: (self: RequestBlock, that: RequestBlock) => RequestBlock = _RequestBlock.par

/**
 * @since 2.0.0
 * @category constructors
 */
export const reduce: <Z>(self: RequestBlock, reducer: RequestBlock.Reducer<Z>) => Z = _RequestBlock.reduce

/**
 * @since 2.0.0
 * @category constructors
 */
export const sequential: (self: RequestBlock, that: RequestBlock) => RequestBlock = _RequestBlock.seq
