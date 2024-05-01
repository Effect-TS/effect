import * as Chunk from "../Chunk.js"
import type * as Deferred from "../Deferred.js"
import type { FiberId } from "../FiberId.js"
import * as HashMap from "../HashMap.js"
import * as MutableHashMap from "../MutableHashMap.js"
import * as Option from "../Option.js"
import { hasProperty } from "../Predicate.js"
import type * as Request from "../Request.js"
import type * as RequestBlock from "../RequestBlock.js"
import type * as RequestResolver from "../RequestResolver.js"

/** @internal */
export const empty: RequestBlock.RequestBlock = Chunk.empty()

/**
 * Combines this collection of blocked requests with the specified collection
 * of blocked requests, in parallel.
 *
 * @internal
 */
export const par = (
  self: RequestBlock.RequestBlock,
  that: RequestBlock.RequestBlock
): RequestBlock.RequestBlock => Chunk.appendAll(self, that)

/**
 * Constructs a collection of blocked requests from the specified blocked
 * request and data source.
 *
 * @internal
 */
export const single = <A>(
  dataSource: RequestResolver.RequestResolver<A>,
  blockedRequest: Request.Entry<A>
): RequestBlock.RequestBlock =>
  Chunk.of({
    dataSource: dataSource as any,
    blockedRequest
  })

/**
 * Transforms all data sources with the specified data source aspect, which
 * can change the environment type of data sources but must preserve the
 * request type of each data source.
 *
 * @internal
 */
export const mapRequestResolvers = (
  self: RequestBlock.RequestBlock,
  f: <A>(dataSource: RequestResolver.RequestResolver<A>) => RequestResolver.RequestResolver<A>
): RequestBlock.RequestBlock =>
  Chunk.map(self, (_) => ({ dataSource: f(_.dataSource), blockedRequest: _.blockedRequest }))

/**
 * Flattens a collection of blocked requests into a collection of pipelined
 * and batched requests that can be submitted for execution.
 *
 * @internal
 */
export const flatten = (
  self: RequestBlock.RequestBlock
): SequentialCollection => {
  return new SequentialImpl(
    HashMap.map(HashMap.fromIterable(step(self).map), (v) => Chunk.of(Chunk.fromIterable(v)))
  )
}

/**
 * Takes one step in evaluating a collection of blocked requests, returning a
 * collection of blocked requests that can be performed in parallel and a list
 * of blocked requests that must be performed sequentially after those
 * requests.
 */
const step = (
  requests: RequestBlock.RequestBlock
): ParallelCollection => {
  const parallel = parallelCollectionEmpty()
  Chunk.forEach(requests, (current) => {
    if (!MutableHashMap.has(parallel.map, current.dataSource)) {
      MutableHashMap.set(parallel.map, current.dataSource, [])
    }
    Option.getOrThrow(MutableHashMap.get(parallel.map, current.dataSource)).push(current.blockedRequest)
  })
  return parallel
}

//
// circular
//

/** @internal */
export const EntryTypeId: Request.EntryTypeId = Symbol.for(
  "effect/RequestBlock/Entry"
) as Request.EntryTypeId

/** @internal */
class EntryImpl<A extends Request.Request<any, any>> implements Request.Entry<A> {
  readonly [EntryTypeId] = blockedRequestVariance
  constructor(
    readonly request: A,
    readonly result: Deferred.Deferred<Request.Request.Success<A>, Request.Request.Error<A>>,
    readonly listeners: Request.Listeners,
    readonly ownerId: FiberId,
    readonly state: {
      completed: boolean
    }
  ) {}
}

const blockedRequestVariance = {
  /* c8 ignore next */
  _R: (_: never) => _
}

/** @internal */
export const isEntry = (u: unknown): u is Request.Entry<unknown> => hasProperty(u, EntryTypeId)

/** @internal */
export const makeEntry = <A extends Request.Request<any, any>>(
  options: {
    readonly request: A
    readonly result: Deferred.Deferred<Request.Request.Success<A>, Request.Request.Error<A>>
    readonly listeners: Request.Listeners
    readonly ownerId: FiberId
    readonly state: { completed: boolean }
  }
): Request.Entry<A> => new EntryImpl(options.request, options.result, options.listeners, options.ownerId, options.state)

/** @internal */
export const RequestBlockParallelTypeId = Symbol.for(
  "effect/RequestBlock/RequestBlockParallel"
)

const parallelVariance = {
  /* c8 ignore next */
  _R: (_: never) => _
}

class ParallelImpl implements ParallelCollection {
  readonly [RequestBlockParallelTypeId] = parallelVariance
  constructor(
    readonly map: MutableHashMap.MutableHashMap<
      RequestResolver.RequestResolver<unknown, unknown>,
      Array<Request.Entry<unknown>>
    >
  ) {}
}

/** @internal */
export const parallelCollectionEmpty = (): ParallelCollection => new ParallelImpl(MutableHashMap.empty())

/** @internal */
export const SequentialCollectionTypeId = Symbol.for(
  "effect/RequestBlock/RequestBlockSequential"
)

const sequentialVariance = {
  /* c8 ignore next */
  _R: (_: never) => _
}

class SequentialImpl implements SequentialCollection {
  readonly [SequentialCollectionTypeId] = sequentialVariance
  constructor(
    readonly map: HashMap.HashMap<
      RequestResolver.RequestResolver<unknown, unknown>,
      Chunk.Chunk<Chunk.Chunk<Request.Entry<unknown>>>
    >
  ) {}
}

/** @internal */
export const sequentialCollectionMake = <A, R>(
  map: HashMap.HashMap<
    RequestResolver.RequestResolver<A, R>,
    Chunk.Chunk<Chunk.Chunk<Request.Entry<A>>>
  >
): SequentialCollection => new SequentialImpl(map as any)

/** @internal */
export const sequentialCollectionIsEmpty = (self: SequentialCollection): boolean => HashMap.isEmpty(self.map)

/** @internal */
export type RequestBlockParallelTypeId = typeof RequestBlockParallelTypeId

/** @internal */
export interface ParallelCollection extends ParallelCollection.Variance {
  readonly map: MutableHashMap.MutableHashMap<
    RequestResolver.RequestResolver<unknown, unknown>,
    Array<Request.Entry<unknown>>
  >
}

/** @internal */
export declare namespace ParallelCollection {
  /** @internal */
  export interface Variance {
    readonly [RequestBlockParallelTypeId]: {}
  }
}

/** @internal */
export type SequentialCollectionTypeId = typeof SequentialCollectionTypeId

/** @internal */
export interface SequentialCollection extends SequentialCollection.Variance {
  readonly map: HashMap.HashMap<
    RequestResolver.RequestResolver<unknown, unknown>,
    Chunk.Chunk<Chunk.Chunk<Request.Entry<unknown>>>
  >
}

/** @internal */
export declare namespace SequentialCollection {
  /** @internal */
  export interface Variance {
    readonly [SequentialCollectionTypeId]: {}
  }
}
