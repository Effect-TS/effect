/**
 * @since 2.0.0
 */
import type { Empty, Par, Seq, Single } from "./impl/RequestBlock.js"
import type { Request } from "./Request.js"
import type { RequestResolver } from "./RequestResolver.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/RequestBlock.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/RequestBlock.js"

/**
 * @since 2.0.0
 */
export declare namespace RequestBlock {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/RequestBlock.js"
}
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
export type RequestBlock<R> = Empty | Par<R> | Seq<R> | Single<R>

/**
 * @since 2.0.0
 * @category models

 * @since 2.0.0
 */
export declare namespace RequestBlock {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Reducer<R, Z> {
    readonly emptyCase: () => Z
    readonly parCase: (left: Z, right: Z) => Z
    readonly singleCase: (
      dataSource: RequestResolver<unknown, R>,
      blockedRequest: Request.Entry<unknown>
    ) => Z
    readonly seqCase: (left: Z, right: Z) => Z
  }
}
