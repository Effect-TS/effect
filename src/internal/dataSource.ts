import * as Cause from "../Cause"
import * as Chunk from "../Chunk"
import type * as Context from "../Context"
import * as Effect from "../Effect"
import type * as Either from "../Either"
import { dual, pipe } from "../Function"
import * as core from "../internal/core"
import { invokeWithInterrupt, zipWithOptions } from "../internal/fiberRuntime"
import { complete } from "../internal/request"
import * as RA from "../ReadonlyArray"
import type * as Request from "../Request"
import type * as RequestResolver from "../RequestResolver"

/** @internal */
export const make = <R, A>(
  runAll: (requests: Array<Array<A>>) => Effect.Effect<R, never, void>
): RequestResolver.RequestResolver<A, R> =>
  new core.RequestResolverImpl((requests) => runAll(requests.map((_) => _.map((_) => _.request))))

/** @internal */
export const makeWithEntry = <R, A>(
  runAll: (requests: Array<Array<Request.Entry<A>>>) => Effect.Effect<R, never, void>
): RequestResolver.RequestResolver<A, R> => new core.RequestResolverImpl((requests) => runAll(requests))

/** @internal */
export const makeBatched = <R, A extends Request.Request<any, any>>(
  run: (requests: Array<A>) => Effect.Effect<R, never, void>
): RequestResolver.RequestResolver<A, R> =>
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
    before: Effect.Effect<R2, never, A2>,
    after: (a: A2) => Effect.Effect<R3, never, _>
  ) => <R, A>(
    self: RequestResolver.RequestResolver<A, R>
  ) => RequestResolver.RequestResolver<A, R | R2 | R3>,
  <R, A, R2, A2, R3, _>(
    self: RequestResolver.RequestResolver<A, R>,
    before: Effect.Effect<R2, never, A2>,
    after: (a: A2) => Effect.Effect<R3, never, _>
  ) => RequestResolver.RequestResolver<A, R | R2 | R3>
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
    self: RequestResolver.RequestResolver<A, R>
  ) => RequestResolver.RequestResolver<A, R>,
  <R, A>(
    self: RequestResolver.RequestResolver<A, R>,
    n: number
  ) => RequestResolver.RequestResolver<A, R>
>(2, <R, A>(
  self: RequestResolver.RequestResolver<A, R>,
  n: number
): RequestResolver.RequestResolver<A, R> =>
  new core.RequestResolverImpl(
    (requests) => {
      return n < 1
        ? core.die(Cause.IllegalArgumentException("RequestResolver.batchN: n must be at least 1"))
        : self.runAll(
          Array.from(Chunk.map(
            RA.reduce(
              requests,
              Chunk.empty<Chunk.Chunk<Request.Entry<A>>>(),
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
    f: (context: Context.Context<R0>) => Context.Context<R>
  ) => <A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<A, R>
  ) => RequestResolver.RequestResolver<A, R0>,
  <R, A extends Request.Request<any, any>, R0>(
    self: RequestResolver.RequestResolver<A, R>,
    f: (context: Context.Context<R0>) => Context.Context<R>
  ) => RequestResolver.RequestResolver<A, R0>
>(2, <R, A extends Request.Request<any, any>, R0>(
  self: RequestResolver.RequestResolver<A, R>,
  f: (context: Context.Context<R0>) => Context.Context<R>
) =>
  new core.RequestResolverImpl<R0, A>(
    (requests) =>
      core.mapInputContext(
        self.runAll(requests),
        (context: Context.Context<R0>) => f(context)
      ),
    Chunk.make("MapInputContext", self, f)
  ))

/** @internal */
export const eitherWith = dual<
  <
    A extends Request.Request<any, any>,
    R2,
    B extends Request.Request<any, any>,
    C extends Request.Request<any, any>
  >(
    that: RequestResolver.RequestResolver<B, R2>,
    f: (_: Request.Entry<C>) => Either.Either<Request.Entry<A>, Request.Entry<B>>
  ) => <R>(
    self: RequestResolver.RequestResolver<A, R>
  ) => RequestResolver.RequestResolver<C, R | R2>,
  <
    R,
    A extends Request.Request<any, any>,
    R2,
    B extends Request.Request<any, any>,
    C extends Request.Request<any, any>
  >(
    self: RequestResolver.RequestResolver<A, R>,
    that: RequestResolver.RequestResolver<B, R2>,
    f: (_: Request.Entry<C>) => Either.Either<Request.Entry<A>, Request.Entry<B>>
  ) => RequestResolver.RequestResolver<C, R | R2>
>(3, <
  R,
  A extends Request.Request<any, any>,
  R2,
  B extends Request.Request<any, any>,
  C extends Request.Request<any, any>
>(
  self: RequestResolver.RequestResolver<A, R>,
  that: RequestResolver.RequestResolver<B, R2>,
  f: (_: Request.Entry<C>) => Either.Either<Request.Entry<A>, Request.Entry<B>>
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
export const fromFunction = <A extends Request.Request<never, any>>(
  f: (request: A) => Request.Request.Success<A>
): RequestResolver.RequestResolver<A> =>
  makeBatched((requests: Array<A>) =>
    core.forEachSequentialDiscard(
      requests,
      (request) => complete(request, core.exitSucceed(f(request)) as any)
    )
  ).identified("FromFunction", f)

/** @internal */
export const fromFunctionBatched = <A extends Request.Request<never, any>>(
  f: (chunk: Array<A>) => Array<Request.Request.Success<A>>
): RequestResolver.RequestResolver<A> =>
  makeBatched((as: Array<A>) =>
    Effect.forEach(
      f(as),
      (res, i) => complete(as[i], core.exitSucceed(res) as any),
      { discard: true }
    )
  ).identified("FromFunctionBatched", f)

/** @internal */
export const fromFunctionEffect = <R, A extends Request.Request<any, any>>(
  f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
): RequestResolver.RequestResolver<A, R> =>
  makeBatched((requests: Array<A>) =>
    Effect.forEach(
      requests,
      (a) => Effect.flatMap(Effect.exit(f(a)), (e) => complete(a, e as any)),
      { concurrency: "unbounded", discard: true }
    )
  ).identified("FromFunctionEffect", f)

/** @internal */
export const never: RequestResolver.RequestResolver<never> = make(() => Effect.never).identified("Never")

/** @internal */
export const provideContext = dual<
  <R>(
    context: Context.Context<R>
  ) => <A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<A, R>
  ) => RequestResolver.RequestResolver<A>,
  <R, A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<A, R>,
    context: Context.Context<R>
  ) => RequestResolver.RequestResolver<A>
>(2, (self, context) =>
  mapInputContext(
    self,
    (_: Context.Context<never>) => context
  ).identified("ProvideContext", self, context))

/** @internal */
export const race = dual<
  <R2, A2 extends Request.Request<any, any>>(
    that: RequestResolver.RequestResolver<A2, R2>
  ) => <R, A extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<A, R>
  ) => RequestResolver.RequestResolver<A | A2, R | R2>,
  <R, A extends Request.Request<any, any>, R2, A2 extends Request.Request<any, any>>(
    self: RequestResolver.RequestResolver<A, R>,
    that: RequestResolver.RequestResolver<A2, R2>
  ) => RequestResolver.RequestResolver<A | A2, R | R2>
>(2, <R, A, R2, A2>(
  self: RequestResolver.RequestResolver<A, R>,
  that: RequestResolver.RequestResolver<A2, R2>
) =>
  new core.RequestResolverImpl((requests) =>
    Effect.race(
      self.runAll(requests as Array<Array<Request.Entry<A>>>),
      that.runAll(requests as Array<Array<Request.Entry<A2>>>)
    )
  ).identified("Race", self, that))
