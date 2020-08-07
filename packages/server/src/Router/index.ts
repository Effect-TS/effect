import { pipe } from "fp-ts/lib/pipeable"
import { match } from "path-to-regexp"

import {
  defaultErrorHandler,
  FinalHandler,
  Handler,
  HasRequestContext,
  HasRequestState,
  HttpError,
  ParametersDecoding,
  Server,
  RequestState,
  RequestContext
} from "../Server"

import * as A from "@matechs/core/Array"
import * as Ei from "@matechs/core/Either"
import * as NA from "@matechs/core/NonEmptyArray"
import * as T from "@matechs/core/next/Effect"
import * as Has from "@matechs/core/next/Has"
import * as L from "@matechs/core/next/Layer"
import * as M from "@matechs/core/next/Managed"
import * as MO from "@matechs/morphic"

export class Router {
  readonly _tag = "Router"

  private handlers = new Array<Handler>()

  constructor(readonly parent?: Router) {}

  addHandler(h: Handler) {
    this.handlers.push(h)
  }

  removeHandler(h: Handler) {
    this.handlers = this.handlers.filter((h1) => h1 !== h)
  }

  finalHandler(
    next: FinalHandler,
    rest: readonly Handler[] = this.handlers
  ): T.Effect<
    unknown,
    T.DefaultEnv & HasRequestState & HasRequestContext,
    never,
    void
  > {
    if (A.isNonEmpty(rest)) {
      return NA.head(rest)(this.finalHandler(next, NA.tail(rest)))
    } else {
      return next
    }
  }

  handler: Handler = (next) => this.finalHandler(next)
}

export const HasRouter = Has.has<Router>()

export const root = (has: Has.Augumented<Server>) =>
  L.service(HasRouter).fromManaged(
    pipe(
      M.makeExit_(
        T.accessServiceM(has)((s) =>
          T.effectTotal(() => {
            const router = new Router()
            const handler = router.handler
            s.addHandler(handler)
            return [router, handler] as const
          })
        ),
        (r) =>
          T.accessServiceM(has)((s) =>
            T.effectTotal(() => {
              s.removeHandler(r[1])
            })
          )
      ),
      M.map(([r]) => r)
    )
  )

export const child = (base: string) =>
  L.service(HasRouter).fromManaged(
    pipe(
      M.makeExit_(
        T.accessServiceM(HasRouter)((s) =>
          T.effectTotal(() => {
            const router = new Router(s)
            const handler: Handler = (next) =>
              T.accessServiceM(HasRequestContext)((rc) => {
                if (rc.url && match(base)(rc.url) !== false) {
                  return router.handler(next)
                } else {
                  return next
                }
              })
            s.addHandler(handler)
            return [router, handler] as const
          })
        ),
        (r) =>
          T.accessServiceM(HasRouter)((s) =>
            T.effectTotal(() => {
              s.removeHandler(r[1])
            })
          )
      ),
      M.map(([r]) => r)
    )
  )

export class RouteInput {
  constructor(readonly params: unknown) {}
}

export const HasRouteInput = Has.has<RouteInput>()
export type HasRouteInput = Has.HasType<typeof HasRouteInput>

export const getRouteInput = T.accessServiceM(HasRouteInput)(T.succeed)

export const params = <A>(morph: { decode: (i: unknown) => Ei.Either<MO.Errors, A> }) =>
  pipe(
    getRouteInput,
    T.chain(
      (i): T.AsyncE<ParametersDecoding, A> => {
        const decoded = morph.decode(i.params)

        switch (decoded._tag) {
          case "Right": {
            return T.succeed(decoded.right)
          }
          case "Left": {
            return T.fail(new ParametersDecoding(decoded.left))
          }
        }
      }
    )
  )

export type HttpMethod =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"
  | "PATCH"

export type RouteHandler<R> = T.AsyncRE<
  R & HasRouteInput & HasRequestState & HasRequestContext,
  HttpError,
  void
>

export type RouteHandlerE<R, E> = T.AsyncRE<
  R & HasRouteInput & HasRequestState & HasRequestContext,
  E,
  void
>

export function route<R>(
  method: HttpMethod,
  pattern: string,
  f: (next: FinalHandler) => RouteHandler<R>
) {
  const matcher = match(pattern)

  const acquire = T.accessServiceM(HasRouter)((router) =>
    T.access((r: R) => {
      const handler: Handler = (next) =>
        T.accessServiceM(HasRequestContext)((rc) =>
          T.suspend(() => {
            if (rc.url && rc.req.method && rc.req.method === method) {
              const matchResult = matcher(rc.url)

              if (matchResult === false) {
                return next
              } else {
                return pipe(
                  f(next),
                  defaultErrorHandler,
                  T.provideService(HasRouteInput)(new RouteInput(matchResult.params)),
                  T.provideService(HasRequestContext)(rc),
                  T.provideSome((h: HasRequestState) => ({ ...r, ...h }))
                )
              }
            } else {
              return next
            }
          })
        )

      router.addHandler(handler)

      return {
        handler
      }
    })
  )

  return pipe(
    M.makeExit_(acquire, ({ handler }) =>
      T.accessServiceM(HasRouter)((s) =>
        T.effectTotal(() => {
          s.removeHandler(handler)
        })
      )
    ),
    M.map(() => ({})),
    L.fromManagedEnv
  )
}

export function use<R>(pattern: string, f: (next: FinalHandler) => RouteHandler<R>) {
  const matcher = match(pattern)

  const acquire = T.accessServiceM(HasRouter)((router) =>
    T.access((r: R) => {
      const handler: Handler = (next) =>
        T.accessServiceM(HasRequestContext)((rc) =>
          T.suspend(() => {
            if (rc.url && rc.req.method) {
              const matchResult = matcher(rc.url)

              if (matchResult === false) {
                return next
              } else {
                return pipe(
                  f(next),
                  defaultErrorHandler,
                  T.provideService(HasRouteInput)(new RouteInput(matchResult.params)),
                  T.provideService(HasRequestContext)(rc),
                  T.provideSome((h: HasRequestState) => ({ ...r, ...h }))
                )
              }
            } else {
              return next
            }
          })
        )

      router.addHandler(handler)

      return {
        handler
      }
    })
  )

  return pipe(
    M.makeExit_(acquire, ({ handler }) =>
      T.accessServiceM(HasRouter)((s) =>
        T.effectTotal(() => {
          s.removeHandler(handler)
        })
      )
    ),
    M.map(() => ({})),
    L.fromManagedEnv
  )
}

export type Middleware<R, E> = <R1, E1>(
  _: RouteHandlerE<R1, E1>
) => RouteHandlerE<R & R1, E | E1>

export const middleware = <R, E = never>(
  f: <R1, E1>(
    _: RouteHandlerE<R1, E1>
  ) => T.Effect<
    unknown,
    R & Has.Has<RouteInput> & Has.Has<RequestState> & Has.Has<RequestContext> & R1,
    E1 | E,
    void
  >
): Middleware<R, E> => f
