/**
 * @since 2.0.0
 */
import type { Chunk } from "./Chunk.js"
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
export type RequestBlock = Chunk<Single>

/**
 * @since 2.0.0
 * @category models
 */
export interface Single {
  readonly dataSource: RequestResolver.RequestResolver<unknown>
  readonly blockedRequest: Request.Entry<unknown>
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const single: <A>(
  dataSource: RequestResolver.RequestResolver<A>,
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
export const mapRequestResolvers: (
  self: RequestBlock,
  f: <A>(dataSource: RequestResolver.RequestResolver<A>) => RequestResolver.RequestResolver<A>
) => RequestBlock = _RequestBlock.mapRequestResolvers

/**
 * @since 2.0.0
 * @category constructors
 */
export const parallel: (self: RequestBlock, that: RequestBlock) => RequestBlock = _RequestBlock.par
