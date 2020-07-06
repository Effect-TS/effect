import * as http from "http"

import { pipe } from "fp-ts/lib/pipeable"
import { match } from "path-to-regexp"

import {
  Server,
  Handler,
  FinalHandler,
  HttpError,
  defaultErrorHandler,
  HasRouteInput,
  RouteInput
} from "./server"

import * as A from "@matechs/core/Array"
import * as T from "@matechs/core/Eff/Effect"
import { DerivationContext, Augumented, HasURI } from "@matechs/core/Eff/Has"
import * as L from "@matechs/core/Eff/Layer"
import * as M from "@matechs/core/Eff/Managed"
import * as NA from "@matechs/core/NonEmptyArray"

export class Router<K> {
  readonly _tag = "Router"

  private handlers = new Array<Handler>()

  constructor(readonly has: Augumented<Server, K>, readonly parent?: Router<K>) {}

  addHandler(h: Handler) {
    this.handlers.push(h)
  }

  removeHandler(h: Handler) {
    this.handlers = this.handlers.filter((h1) => h1 !== h)
  }

  finalHandler(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: FinalHandler,
    rest: readonly Handler[] = this.handlers
  ): T.Effect<unknown, T.DefaultEnv, never, void> {
    if (A.isNonEmpty(rest)) {
      return NA.head(rest)(req, res, (reqR, resN) =>
        this.finalHandler(reqR, resN, next, NA.tail(rest))
      )
    } else {
      return next(req, res)
    }
  }

  handler: Handler = (req, res, next) => this.finalHandler(req, res, next)
}

export const derivationContext = new DerivationContext()

export const HasRouter = <K>(has: Augumented<Server, K>) =>
  derivationContext.derive(has, () => T.has<Router<K>>()<K>(has[HasURI].brand))

export const rootRouter = <K>(has: Augumented<Server, K>) =>
  L.service(HasRouter(has)).fromManaged(
    pipe(
      M.makeExit_(
        T.accessServiceM(has)((s) =>
          T.effectTotal(() => {
            const router = new Router(has)
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

export const childRouter = (base: string) => <K>(has: Augumented<Server, K>) =>
  L.service(HasRouter(has)).fromManaged(
    pipe(
      M.makeExit_(
        T.accessServiceM(HasRouter(has))((s) =>
          T.effectTotal(() => {
            const router = new Router(has, s)
            const handler: Handler = (req, res, next) => {
              if (req.url && match(base)(req.url) !== false) {
                return router.handler(req, res, next)
              } else {
                return next(req, res)
              }
            }
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

export type RouteHandler<R> = T.AsyncRE<R & HasRouteInput, HttpError, void>

export function route<K>(has: Augumented<Server, K>) {
  return <R>(method: HttpMethod, pattern: string, f: RouteHandler<R>) => {
    const matcher = match(pattern)

    const acquire = T.accessServiceM(HasRouter(has))((router) =>
      T.access((r: R & T.DefaultEnv) => {
        const handler: Handler = (req, res, next) => {
          if (req.url && req.method && req.method === method) {
            const matchResult = matcher(req.url)

            if (matchResult === false) {
              return next(req, res)
            } else {
              return pipe(
                f,
                defaultErrorHandler,
                T.provideService(HasRouteInput)(
                  new RouteInput(matchResult.params, req, res, next)
                ),
                T.provideAll(r)
              )
            }
          } else {
            return next(req, res)
          }
        }

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

export function use<K>(has: Augumented<Server, K>) {
  return <R>(pattern: string, f: RouteHandler<R>) => {
    const matcher = match(pattern)

    const acquire = T.accessServiceM(HasRouter(has))((router) =>
      T.access((r: R & T.DefaultEnv) => {
        const handler: Handler = (req, res, next) => {
          if (req.url && req.method) {
            const matchResult = matcher(req.url)

            if (matchResult === false) {
              return next(req, res)
            } else {
              return pipe(
                f,
                defaultErrorHandler,
                T.provideService(HasRouteInput)(
                  new RouteInput(matchResult.params, req, res, next)
                ),
                T.provideAll(r)
              )
            }
          } else {
            return next(req, res)
          }
        }

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
