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
  Server
} from "../Server"

import * as A from "@matechs/core/Array"
import * as Ei from "@matechs/core/Either"
import * as NA from "@matechs/core/NonEmptyArray"
import * as T from "@matechs/core/next/Effect"
import { Augumented, DerivationContext } from "@matechs/core/next/Has"
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

export const derivationContext = new DerivationContext()

export const HasRouter = <K extends string>(has: Augumented<Server, K>) =>
  derivationContext.derive(has, (k) => T.has<Router>()<K>(k))

export const root = <K extends string>(has: Augumented<Server, K>) =>
  L.service(HasRouter(has)).fromManaged(
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

export const child = <K extends string>(has: Augumented<Server, K>) => (base: string) =>
  L.service(HasRouter(has)).fromManaged(
    pipe(
      M.makeExit_(
        T.accessServiceM(HasRouter(has))((s) =>
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
          T.accessServiceM(has)((s) =>
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

export const HasRouteInput = T.has<RouteInput>()()
export type HasRouteInput = T.HasType<typeof HasRouteInput>

export const getRouteInput = T.accessServiceM(HasRouteInput)(T.succeedNow)

export const params = <A>(morph: { decode: (i: unknown) => Ei.Either<MO.Errors, A> }) =>
  pipe(
    getRouteInput,
    T.chain(
      (i): T.AsyncE<ParametersDecoding, A> => {
        const decoded = morph.decode(i.params)

        switch (decoded._tag) {
          case "Right": {
            return T.succeedNow(decoded.right)
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

export function route<K extends string>(has: Augumented<Server, K>) {
  return <R>(
    method: HttpMethod,
    pattern: string,
    f: (next: FinalHandler) => RouteHandler<R>
  ) => {
    const matcher = match(pattern)

    const acquire = T.accessServiceM(HasRouter(has))((router) =>
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
        T.accessServiceM(has)((s) =>
          T.effectTotal(() => {
            s.removeHandler(handler)
          })
        )
      ),
      M.map(() => ({})),
      L.fromManagedEnv
    )
  }
}

export function use<K extends string>(has: Augumented<Server, K>) {
  return <R>(pattern: string, f: (next: FinalHandler) => RouteHandler<R>) => {
    const matcher = match(pattern)

    const acquire = T.accessServiceM(HasRouter(has))((router) =>
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
        T.accessServiceM(has)((s) =>
          T.effectTotal(() => {
            s.removeHandler(handler)
          })
        )
      ),
      M.map(() => ({})),
      L.fromManagedEnv
    )
  }
}

export type Middleware<R> = <R1>(_: RouteHandler<R1>) => RouteHandler<R & R1>

export const middleware = <R>(
  f: (_: RouteHandler<unknown>) => RouteHandler<R>
): Middleware<R> => (next) => f(next as any)
