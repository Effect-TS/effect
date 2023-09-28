import type * as Deferred from "../Deferred"
import * as Either from "../Either"
import * as Equal from "../Equal"
import type { FiberId } from "../FiberId"
import * as HashMap from "../HashMap"
import * as List from "../List"
import * as Option from "../Option"
import type * as Request from "../Request"
import type * as RequestBlock from "../RequestBlock"
import type * as RequestResolver from "../RequestResolver"

/** @internal */
export const empty: RequestBlock.RequestBlock<never> = {
  _tag: "Empty"
}

/**
 * Combines this collection of blocked requests with the specified collection
 * of blocked requests, in parallel.
 *
 * @internal
 */
export const par = <R, R2>(
  self: RequestBlock.RequestBlock<R>,
  that: RequestBlock.RequestBlock<R2>
): RequestBlock.RequestBlock<R | R2> => ({
  _tag: "Par",
  left: self,
  right: that
})

/**
 * Combines this collection of blocked requests with the specified collection
 * of blocked requests, in sequence.
 *
 * @internal
 */
export const seq = <R, R2>(
  self: RequestBlock.RequestBlock<R>,
  that: RequestBlock.RequestBlock<R2>
): RequestBlock.RequestBlock<R | R2> => ({
  _tag: "Seq",
  left: self,
  right: that
})

/**
 * Constructs a collection of blocked requests from the specified blocked
 * request and data source.
 *
 * @internal
 */
export const single = <R, A>(
  dataSource: RequestResolver.RequestResolver<A, R>,
  blockedRequest: Request.Entry<A>
): RequestBlock.RequestBlock<R> => ({
  _tag: "Single",
  dataSource,
  blockedRequest
})

/** @internal */
export const MapRequestResolversReducer = <R, A, R2>(
  f: (dataSource: RequestResolver.RequestResolver<A, R>) => RequestResolver.RequestResolver<A, R2>
): RequestBlock.RequestBlock.Reducer<R, RequestBlock.RequestBlock<R | R2>> => ({
  emptyCase: () => empty,
  parCase: (left, right) => par(left, right),
  seqCase: (left, right) => seq(left, right),
  singleCase: (dataSource, blockedRequest) => single(f(dataSource), blockedRequest)
})

type BlockedRequestsCase = ParCase | SeqCase

interface ParCase {
  readonly _tag: "ParCase"
}

interface SeqCase {
  readonly _tag: "SeqCase"
}

/**
 * Transforms all data sources with the specified data source aspect, which
 * can change the environment type of data sources but must preserve the
 * request type of each data source.
 *
 * @internal
 */
export const mapRequestResolvers = <R, A, R2>(
  self: RequestBlock.RequestBlock<R>,
  f: (dataSource: RequestResolver.RequestResolver<A, R>) => RequestResolver.RequestResolver<A, R2>
): RequestBlock.RequestBlock<R | R2> => reduce(self, MapRequestResolversReducer(f))

/**
 * Folds over the cases of this collection of blocked requests with the
 * specified functions.
 *
 * @internal
 */
export const reduce = <R, Z>(
  self: RequestBlock.RequestBlock<R>,
  reducer: RequestBlock.RequestBlock.Reducer<R, Z>
): Z => {
  let input: List.List<RequestBlock.RequestBlock<R>> = List.of(self)
  let output = List.empty<Either.Either<BlockedRequestsCase, Z>>()
  while (List.isCons(input)) {
    const current: RequestBlock.RequestBlock<R> = input.head
    switch (current._tag) {
      case "Empty": {
        output = List.cons(Either.right(reducer.emptyCase()), output)
        input = input.tail
        break
      }
      case "Par": {
        output = List.cons(Either.left({ _tag: "ParCase" }), output)
        input = List.cons(current.left, List.cons(current.right, input.tail))
        break
      }
      case "Seq": {
        output = List.cons(Either.left({ _tag: "SeqCase" }), output)
        input = List.cons(current.left, List.cons(current.right, input.tail))
        break
      }
      case "Single": {
        const result = reducer.singleCase(current.dataSource, current.blockedRequest)
        output = List.cons(Either.right(result), output)
        input = input.tail
        break
      }
    }
  }
  const result = List.reduce(output, List.empty<Z>(), (acc, current) => {
    switch (current._tag) {
      case "Left": {
        const left = List.unsafeHead(acc)
        const right = List.unsafeHead(List.unsafeTail(acc))
        const tail = List.unsafeTail(List.unsafeTail(acc))
        switch (current.left._tag) {
          case "ParCase": {
            return List.cons(reducer.parCase(left, right), tail)
          }
          case "SeqCase": {
            return List.cons(reducer.seqCase(left, right), tail)
          }
        }
      }
      case "Right": {
        return List.cons(current.right, acc)
      }
    }
  })
  if (List.isNil(result)) {
    throw new Error("BUG: BlockedRequests.reduce - please report an issue at https://github.com/Effect-TS/query/issues")
  }
  return result.head
}

/**
 * Flattens a collection of blocked requests into a collection of pipelined
 * and batched requests that can be submitted for execution.
 *
 * @internal
 */
export const flatten = <R>(
  self: RequestBlock.RequestBlock<R>
): List.List<SequentialCollection<R>> => {
  let current = List.of(self)
  let updated = List.empty<SequentialCollection<R>>()
  // eslint-disable-next-line no-constant-condition
  while (1) {
    const [parallel, sequential] = List.reduce(
      current,
      [parallelCollectionEmpty<R>(), List.empty<RequestBlock.RequestBlock<R>>()] as const,
      ([parallel, sequential], blockedRequest) => {
        const [par, seq] = step(blockedRequest)
        return [
          parallelCollectionCombine(parallel, par),
          List.appendAll(sequential, seq)
        ]
      }
    )
    updated = merge(updated, parallel)
    if (List.isNil(sequential)) {
      return List.reverse(updated)
    }
    current = sequential
  }
  throw new Error(
    "BUG: BlockedRequests.flatten - please report an issue at https://github.com/Effect-TS/query/issues"
  )
}

/**
 * Takes one step in evaluating a collection of blocked requests, returning a
 * collection of blocked requests that can be performed in parallel and a list
 * of blocked requests that must be performed sequentially after those
 * requests.
 */
const step = <R>(
  requests: RequestBlock.RequestBlock<R>
): readonly [ParallelCollection<R>, List.List<RequestBlock.RequestBlock<R>>] => {
  let current: RequestBlock.RequestBlock<R> = requests
  let parallel = parallelCollectionEmpty<R>()
  let stack = List.empty<RequestBlock.RequestBlock<R>>()
  let sequential = List.empty<RequestBlock.RequestBlock<R>>()
  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (current._tag) {
      case "Empty": {
        if (List.isNil(stack)) {
          return [parallel, sequential] as const
        }
        current = stack.head
        stack = stack.tail
        break
      }
      case "Par": {
        stack = List.cons(current.right, stack)
        current = current.left
        break
      }
      case "Seq": {
        const left = current.left
        const right = current.right
        switch (left._tag) {
          case "Empty": {
            current = right
            break
          }
          case "Par": {
            const l = left.left
            const r = left.right
            current = par(seq(l, right), seq(r, right))
            break
          }
          case "Seq": {
            const l = left.left
            const r = left.right
            current = seq(l, seq(r, right))
            break
          }
          case "Single": {
            current = left
            sequential = List.cons(right, sequential)
            break
          }
        }
        break
      }
      case "Single": {
        parallel = parallelCollectionCombine(
          parallel,
          parallelCollectionMake(current.dataSource, current.blockedRequest)
        )
        if (List.isNil(stack)) {
          return [parallel, sequential]
        }
        current = stack.head
        stack = stack.tail
        break
      }
    }
  }
  throw new Error(
    "BUG: BlockedRequests.step - please report an issue at https://github.com/Effect-TS/query/issues"
  )
}

/**
 * Merges a collection of requests that must be executed sequentially with a
 * collection of requests that can be executed in parallel. If the collections
 * are both from the same single data source then the requests can be
 * pipelined while preserving ordering guarantees.
 */
const merge = <R>(
  sequential: List.List<SequentialCollection<R>>,
  parallel: ParallelCollection<R>
): List.List<SequentialCollection<R>> => {
  if (List.isNil(sequential)) {
    return List.of(parallelCollectionToSequentialCollection(parallel))
  }
  if (parallelCollectionIsEmpty(parallel)) {
    return sequential
  }
  const seqHeadKeys = sequentialCollectionKeys(sequential.head)
  const parKeys = parallelCollectionKeys(parallel)
  if (
    seqHeadKeys.length === 1 &&
    parKeys.length === 1 &&
    Equal.equals(seqHeadKeys[0], parKeys[0])
  ) {
    return List.cons(
      sequentialCollectionCombine(
        sequential.head,
        parallelCollectionToSequentialCollection(parallel)
      ),
      sequential.tail
    )
  }
  return List.cons(parallelCollectionToSequentialCollection(parallel), sequential)
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
    readonly result: Deferred.Deferred<Request.Request.Error<A>, Request.Request.Success<A>>,
    readonly listeners: Request.Listeners,
    readonly ownerId: FiberId,
    readonly state: {
      completed: boolean
    }
  ) {}
}

/** @internal */
const blockedRequestVariance = {
  _R: (_: never) => _
}

/** @internal */
export const isEntry = (u: unknown): u is Request.Entry<unknown> => {
  return typeof u === "object" && u != null && EntryTypeId in u
}

/** @internal */
export const makeEntry = <A extends Request.Request<any, any>>(
  options: {
    readonly request: A
    readonly result: Deferred.Deferred<Request.Request.Error<A>, Request.Request.Success<A>>
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
  _R: (_: never) => _
}

class ParallelImpl<R> implements ParallelCollection<R> {
  readonly [RequestBlockParallelTypeId] = parallelVariance
  constructor(
    readonly map: HashMap.HashMap<
      RequestResolver.RequestResolver<unknown, unknown>,
      Array<Request.Entry<unknown>>
    >
  ) {}
}

/** @internal */
export const parallelCollectionEmpty = <R>(): ParallelCollection<R> => new ParallelImpl(HashMap.empty())

/** @internal */
export const parallelCollectionMake = <R, A>(
  dataSource: RequestResolver.RequestResolver<A, R>,
  blockedRequest: Request.Entry<A>
): ParallelCollection<R> => new ParallelImpl(HashMap.make([dataSource, Array.of(blockedRequest)]))

/** @internal */
export const parallelCollectionCombine = <R, R2>(
  self: ParallelCollection<R>,
  that: ParallelCollection<R2>
): ParallelCollection<R | R2> =>
  new ParallelImpl(HashMap.reduce(self.map, that.map, (map, value, key) =>
    HashMap.set(
      map,
      key,
      Option.match(HashMap.get(map, key), {
        onNone: () => value,
        onSome: (a) => [...a, ...value]
      })
    )))

/** @internal */
export const parallelCollectionIsEmpty = <R>(self: ParallelCollection<R>): boolean => HashMap.isEmpty(self.map)

/** @internal */
export const parallelCollectionKeys = <R>(
  self: ParallelCollection<R>
): Array<RequestResolver.RequestResolver<unknown, R>> => Array.from(HashMap.keys(self.map)) as any

/** @internal */
export const parallelCollectionToSequentialCollection = <R>(
  self: ParallelCollection<R>
): SequentialCollection<R> => sequentialCollectionMake(HashMap.map(self.map, (x) => Array.of(x)) as any)

/** @internal */
export const parallelCollectionToChunk = <R>(
  self: ParallelCollection<R>
): Array<
  readonly [
    RequestResolver.RequestResolver<unknown, R>,
    Array<Request.Entry<unknown>>
  ]
> => Array.from(self.map) as any

/** @internal */
export const SequentialCollectionTypeId = Symbol.for(
  "effect/RequestBlock/RequestBlockSequential"
)

/** @internal */
const sequentialVariance = {
  _R: (_: never) => _
}

class SequentialImpl<R> implements SequentialCollection<R> {
  readonly [SequentialCollectionTypeId] = sequentialVariance
  constructor(
    readonly map: HashMap.HashMap<
      RequestResolver.RequestResolver<unknown, unknown>,
      Array<Array<Request.Entry<unknown>>>
    >
  ) {}
}

/** @internal */
export const sequentialCollectionMake = <R, A>(
  map: HashMap.HashMap<
    RequestResolver.RequestResolver<A, R>,
    Array<Array<Request.Entry<A>>>
  >
): SequentialCollection<R> => new SequentialImpl(map)

/** @internal */
export const sequentialCollectionCombine = <R, R2>(
  self: SequentialCollection<R>,
  that: SequentialCollection<R2>
): SequentialCollection<R | R2> =>
  new SequentialImpl(HashMap.reduce(that.map, self.map, (map, value, key) =>
    HashMap.set(
      map,
      key,
      Option.match(HashMap.get(map, key), {
        onNone: () => [],
        onSome: (a) => [...a, ...value]
      })
    )))

/** @internal */
export const sequentialCollectionIsEmpty = <R>(self: SequentialCollection<R>): boolean => HashMap.isEmpty(self.map)

/** @internal */
export const sequentialCollectionKeys = <R>(
  self: SequentialCollection<R>
): Array<RequestResolver.RequestResolver<unknown, R>> => Array.from(HashMap.keys(self.map)) as any

/** @internal */
export const sequentialCollectionToChunk = <R>(self: SequentialCollection<R>): Array<
  readonly [
    RequestResolver.RequestResolver<unknown, R>,
    Array<Array<Request.Entry<unknown>>>
  ]
> => Array.from(self.map) as any

/** @internal */
export type RequestBlockParallelTypeId = typeof RequestBlockParallelTypeId

/** @internal */
export interface ParallelCollection<R> extends ParallelCollection.Variance<R> {
  readonly map: HashMap.HashMap<
    RequestResolver.RequestResolver<unknown, unknown>,
    Array<Request.Entry<unknown>>
  >
}

/** @internal */
export declare namespace ParallelCollection {
  /** @internal */
  export interface Variance<R> {
    readonly [RequestBlockParallelTypeId]: {
      readonly _R: (_: never) => R
    }
  }
}

/** @internal */
export type SequentialCollectionTypeId = typeof SequentialCollectionTypeId

/** @internal */
export interface SequentialCollection<R> extends SequentialCollection.Variance<R> {
  readonly map: HashMap.HashMap<
    RequestResolver.RequestResolver<unknown, unknown>,
    Array<Array<Request.Entry<unknown>>>
  >
}

/** @internal */
export declare namespace SequentialCollection {
  /** @internal */
  export interface Variance<R> {
    readonly [SequentialCollectionTypeId]: {
      readonly _R: (_: never) => R
    }
  }
}
