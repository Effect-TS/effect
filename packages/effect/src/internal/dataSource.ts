import * as Cause from "../Cause.js"
import * as Chunk from "../Chunk.js"
import type * as Context from "../Context.js"
import * as Effect from "../Effect.js"
import type * as Either from "../Either.js"
import { dual, pipe } from "../Function.js"
import * as RA from "../ReadonlyArray.js"
import type * as Request from "../Request.js"
import type * as RequestResolver from "../RequestResolver.js"
import * as core from "./core.js"
import { invokeWithInterrupt, zipWithOptions } from "./fiberRuntime.js"
import { complete } from "./request.js"

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
        ? core.die(new Cause.IllegalArgumentException("RequestResolver.batchN: n must be at least 1"))
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
  f: (chunk: Array<A>) => Iterable<Request.Request.Success<A>>
): RequestResolver.RequestResolver<A> =>
  makeBatched((as: Array<A>) =>
    Effect.forEach(
      f(as),
      (res, i) => complete(as[i], core.exitSucceed(res) as any),
      { discard: true }
    )
  ).identified("FromFunctionBatched", f)

/** @internal */
export const fromEffect = <R, A extends Request.Request<any, any>>(
  f: (a: A) => Effect.Effect<R, Request.Request.Error<A>, Request.Request.Success<A>>
): RequestResolver.RequestResolver<A, R> =>
  makeBatched((requests: Array<A>) =>
    Effect.forEach(
      requests,
      (a) => Effect.flatMap(Effect.exit(f(a)), (e) => complete(a, e as any)),
      { concurrency: "unbounded", discard: true }
    )
  ).identified("FromEffect", f)

/** @internal */
export const fromEffectTagged = <
  A extends Request.Request<any, any> & {
    readonly _tag: string
  }
>() =>
<
  Fns extends {
    readonly [Tag in A["_tag"]]: [Extract<A, { readonly _tag: Tag }>] extends [infer Req] ?
      Req extends Request.Request<infer ReqE, infer ReqA> ?
        (requests: Array<Req>) => Effect.Effect<any, ReqE, Iterable<ReqA>>
      : never
      : never
  }
>(
  fns: Fns
): RequestResolver.RequestResolver<
  A,
  ReturnType<Fns[keyof Fns]> extends Effect.Effect<infer R, infer _E, infer _A> ? R : never
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
        Effect.matchCauseEffect((fns[tag] as any)(grouped[tag]) as Effect.Effect<unknown, unknown, Array<any>>, {
          onFailure: (cause) =>
            Effect.forEach(grouped[tag], (req) => complete(req, core.exitFail(cause) as any), { discard: true }),
          onSuccess: (res) =>
            Effect.forEach(grouped[tag], (req, i) => complete(req, core.exitSucceed(res[i]) as any), { discard: true })
        }),
      { concurrency: "unbounded", discard: true }
    )
  }).identified("FromEffectTagged", fns)

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
