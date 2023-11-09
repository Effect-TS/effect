import { Cause } from "../exports/Cause.js"
import { Chunk } from "../exports/Chunk.js"
import type { Context } from "../exports/Context.js"
import { Effect } from "../exports/Effect.js"
import type { Either } from "../exports/Either.js"
import { dual, pipe } from "../exports/Function.js"
import { ReadonlyArray as RA } from "../exports/ReadonlyArray.js"
import type { Request } from "../exports/Request.js"
import type { RequestResolver } from "../exports/RequestResolver.js"
import * as core from "./core.js"
import { invokeWithInterrupt, zipWithOptions } from "./fiberRuntime.js"
import { complete } from "./request.js"

/** @internal */
export const make = <R, A>(
  runAll: (requests: Array<Array<A>>) => Effect<R, never, void>
): RequestResolver<A, R> =>
  new core.RequestResolverImpl((requests) => runAll(requests.map((_) => _.map((_) => _.request))))

/** @internal */
export const makeWithEntry = <R, A>(
  runAll: (requests: Array<Array<Request.Entry<A>>>) => Effect<R, never, void>
): RequestResolver<A, R> => new core.RequestResolverImpl((requests) => runAll(requests))

/** @internal */
export const makeBatched = <R, A extends Request<any, any>>(
  run: (requests: Array<A>) => Effect<R, never, void>
): RequestResolver<A, R> =>
  new core.RequestResolverImpl<R, A>(
    (requests) =>
      requests.length > 1 ?
        core.forEachSequentialDiscard(requests, (block) =>
          invokeWithInterrupt(
            run(
              block
                .filter((_) => !_.state.completed)
                .map((_) => _.request)
            ),
            block
          )) :
        (requests.length === 1 ?
          run(
            requests[0]
              .filter((_) => !_.state.completed)
              .map((_) => _.request)
          ) :
          core.unit)
  )

/** @internal */
export const around = dual<
  <R2, A2, R3, _>(
    before: Effect<R2, never, A2>,
    after: (a: A2) => Effect<R3, never, _>
  ) => <R, A>(
    self: RequestResolver<A, R>
  ) => RequestResolver<A, R | R2 | R3>,
  <R, A, R2, A2, R3, _>(
    self: RequestResolver<A, R>,
    before: Effect<R2, never, A2>,
    after: (a: A2) => Effect<R3, never, _>
  ) => RequestResolver<A, R | R2 | R3>
>(3, (self, before, after) =>
  new core.RequestResolverImpl(
    (requests) =>
      core.acquireUseRelease(
        before,
        () => self.runAll(requests),
        after
      ),
    Chunk.make("Around", self, before, after)
  ))

/** @internal */
export const batchN = dual<
  (n: number) => <R, A>(
    self: RequestResolver<A, R>
  ) => RequestResolver<A, R>,
  <R, A>(
    self: RequestResolver<A, R>,
    n: number
  ) => RequestResolver<A, R>
>(2, <R, A>(
  self: RequestResolver<A, R>,
  n: number
): RequestResolver<A, R> =>
  new core.RequestResolverImpl(
    (requests) => {
      return n < 1
        ? core.die(Cause.IllegalArgumentException("RequestResolver.batchN: n must be at least 1"))
        : self.runAll(
          Array.from(Chunk.map(
            RA.reduce(
              requests,
              Chunk.empty<Chunk<Request.Entry<A>>>(),
              (acc, chunk) => Chunk.appendAll(acc, Chunk.chunksOf(Chunk.unsafeFromArray(chunk), n))
            ),
            (chunk) => Array.from(chunk)
          ))
        )
    },
    Chunk.make("BatchN", self, n)
  ))

/** @internal */
export const mapInputContext = dual<
  <R0, R>(
    f: (context: Context<R0>) => Context<R>
  ) => <A extends Request<any, any>>(
    self: RequestResolver<A, R>
  ) => RequestResolver<A, R0>,
  <R, A extends Request<any, any>, R0>(
    self: RequestResolver<A, R>,
    f: (context: Context<R0>) => Context<R>
  ) => RequestResolver<A, R0>
>(2, <R, A extends Request<any, any>, R0>(
  self: RequestResolver<A, R>,
  f: (context: Context<R0>) => Context<R>
) =>
  new core.RequestResolverImpl<R0, A>(
    (requests) =>
      core.mapInputContext(
        self.runAll(requests),
        (context: Context<R0>) => f(context)
      ),
    Chunk.make("MapInputContext", self, f)
  ))

/** @internal */
export const eitherWith = dual<
  <
    A extends Request<any, any>,
    R2,
    B extends Request<any, any>,
    C extends Request<any, any>
  >(
    that: RequestResolver<B, R2>,
    f: (_: Request.Entry<C>) => Either<Request.Entry<A>, Request.Entry<B>>
  ) => <R>(
    self: RequestResolver<A, R>
  ) => RequestResolver<C, R | R2>,
  <
    R,
    A extends Request<any, any>,
    R2,
    B extends Request<any, any>,
    C extends Request<any, any>
  >(
    self: RequestResolver<A, R>,
    that: RequestResolver<B, R2>,
    f: (_: Request.Entry<C>) => Either<Request.Entry<A>, Request.Entry<B>>
  ) => RequestResolver<C, R | R2>
>(3, <
  R,
  A extends Request<any, any>,
  R2,
  B extends Request<any, any>,
  C extends Request<any, any>
>(
  self: RequestResolver<A, R>,
  that: RequestResolver<B, R2>,
  f: (_: Request.Entry<C>) => Either<Request.Entry<A>, Request.Entry<B>>
) =>
  new core.RequestResolverImpl<R | R2, C>(
    (batch) =>
      pipe(
        core.forEachSequential(batch, (requests) => {
          const [as, bs] = pipe(
            requests,
            RA.partitionMap(f)
          )
          return zipWithOptions(
            self.runAll(Array.of(as)),
            that.runAll(Array.of(bs)),
            () => void 0,
            { concurrent: true }
          )
        })
      ),
    Chunk.make("EitherWith", self, that, f)
  ))

/** @internal */
export const fromFunction = <A extends Request<never, any>>(
  f: (request: A) => Request.Success<A>
): RequestResolver<A> =>
  makeBatched((requests: Array<A>) =>
    core.forEachSequentialDiscard(
      requests,
      (request) => complete(request, core.exitSucceed(f(request)) as any)
    )
  ).identified("FromFunction", f)

/** @internal */
export const fromFunctionBatched = <A extends Request<never, any>>(
  f: (chunk: Array<A>) => Iterable<Request.Success<A>>
): RequestResolver<A> =>
  makeBatched((as: Array<A>) =>
    Effect.forEach(
      f(as),
      (res, i) => complete(as[i], core.exitSucceed(res) as any),
      { discard: true }
    )
  ).identified("FromFunctionBatched", f)

/** @internal */
export const fromEffect = <R, A extends Request<any, any>>(
  f: (a: A) => Effect<R, Request.Error<A>, Request.Success<A>>
): RequestResolver<A, R> =>
  makeBatched((requests: Array<A>) =>
    Effect.forEach(
      requests,
      (a) => Effect.flatMap(Effect.exit(f(a)), (e) => complete(a, e as any)),
      { concurrency: "unbounded", discard: true }
    )
  ).identified("FromEffect", f)

/** @internal */
export const fromEffectTagged = <
  A extends Request<any, any> & {
    readonly _tag: string
  }
>() =>
<
  Fns extends {
    readonly [Tag in A["_tag"]]: [Extract<A, { readonly _tag: Tag }>] extends [infer Req] ?
      Req extends Request<infer ReqE, infer ReqA> ? (requests: Array<Req>) => Effect<any, ReqE, Iterable<ReqA>>
      : never
      : never
  }
>(
  fns: Fns
): RequestResolver<
  A,
  ReturnType<Fns[keyof Fns]> extends Effect<infer R, infer _E, infer _A> ? R : never
> =>
  makeBatched<any, A>((requests: Array<A>) => {
    const grouped: Record<string, Array<A>> = {}
    const tags: Array<A["_tag"]> = []
    for (let i = 0, len = requests.length; i < len; i++) {
      if (tags.includes(requests[i]._tag)) {
        grouped[requests[i]._tag].push(requests[i])
      } else {
        grouped[requests[i]._tag] = [requests[i]]
        tags.push(requests[i]._tag)
      }
    }
    return Effect.forEach(
      tags,
      (tag) =>
        Effect.matchCauseEffect((fns[tag] as any)(grouped[tag]) as Effect<unknown, unknown, Array<any>>, {
          onFailure: (cause) =>
            Effect.forEach(grouped[tag], (req) => complete(req, core.exitFail(cause) as any), { discard: true }),
          onSuccess: (res) =>
            Effect.forEach(grouped[tag], (req, i) => complete(req, core.exitSucceed(res[i]) as any), { discard: true })
        }),
      { concurrency: "unbounded", discard: true }
    )
  }).identified("FromEffectTagged", fns)

/** @internal */
export const never: RequestResolver<never> = make(() => Effect.never).identified("Never")

/** @internal */
export const provideContext = dual<
  <R>(
    context: Context<R>
  ) => <A extends Request<any, any>>(
    self: RequestResolver<A, R>
  ) => RequestResolver<A>,
  <R, A extends Request<any, any>>(
    self: RequestResolver<A, R>,
    context: Context<R>
  ) => RequestResolver<A>
>(2, (self, context) =>
  mapInputContext(
    self,
    (_: Context<never>) => context
  ).identified("ProvideContext", self, context))

/** @internal */
export const race = dual<
  <R2, A2 extends Request<any, any>>(
    that: RequestResolver<A2, R2>
  ) => <R, A extends Request<any, any>>(
    self: RequestResolver<A, R>
  ) => RequestResolver<A | A2, R | R2>,
  <R, A extends Request<any, any>, R2, A2 extends Request<any, any>>(
    self: RequestResolver<A, R>,
    that: RequestResolver<A2, R2>
  ) => RequestResolver<A | A2, R | R2>
>(2, <R, A, R2, A2>(
  self: RequestResolver<A, R>,
  that: RequestResolver<A2, R2>
) =>
  new core.RequestResolverImpl((requests) =>
    Effect.race(
      self.runAll(requests as Array<Array<Request.Entry<A>>>),
      that.runAll(requests as Array<Array<Request.Entry<A2>>>)
    )
  ).identified("Race", self, that))
