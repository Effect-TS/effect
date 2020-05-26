import { Server } from "http"

import { NextHandleFunction } from "connect"
import newExpress, * as EX from "express"

import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import * as F from "@matechs/core/Function"
import * as M from "@matechs/core/Managed"

export const expressAppEnv = "@matechs/express/expressAppURI"

export interface HasExpress {
  [expressAppEnv]: {
    app: EX.Express
  }
}

export const serverEnv = "@matechs/express/serverURI"

export interface HasServer {
  [serverEnv]: {
    server: Server
    onClose: Array<T.Async<void>>
  }
}

export type Method = "post" | "get" | "put" | "patch" | "delete"

export const expressEnv = "@matechs/express/expressURI"

export interface ExpressOps {
  withApp<S, R, E, A>(op: T.Effect<S, R & HasExpress, E, A>): T.Effect<S, R, E, A>
  route<S, R, E, A>(
    method: Method,
    path: string,
    f: (req: EX.Request) => T.Effect<S, R, RouteError<E>, RouteResponse<A>>,
    ...rest: NextHandleFunction[]
  ): T.SyncR<R & HasExpress, void>
  bind(port: number, hostname?: string): T.AsyncRE<HasExpress, Error, Server>
}

export interface Express {
  [expressEnv]: ExpressOps
}

export interface RouteError<E> {
  status: number
  body: E
}

export function routeError(status: number) {
  return <E>(body: E): RouteError<E> => ({
    status,
    body
  })
}

export interface RouteResponse<A> {
  status: number
  body: A
}

export function routeResponse(status: number) {
  return <A>(body: A): RouteResponse<A> => ({
    status,
    body
  })
}

export const express: Express = {
  [expressEnv]: {
    route<S, R, E, A>(
      method: Method,
      path: string,
      f: (req: EX.Request) => T.Effect<S, R, RouteError<E>, RouteResponse<A>>,
      ...rest: NextHandleFunction[]
    ): T.SyncR<R & HasExpress, void> {
      return T.accessM((r: R & HasExpress) =>
        T.sync(() => {
          r[expressAppEnv].app[method](path, ...rest, (req, res) => {
            T.runToPromiseExit(T.provide(r)(f(req))).then((o) => {
              switch (o._tag) {
                case "Done":
                  res.status(o.value.status).send(o.value.body)
                  return
                case "Raise":
                  res.status(o.error.status).send(o.error.body)
                  return
                case "Interrupt":
                  res.status(500).send({
                    status: "interrupted"
                  })
                  return
                case "Abort":
                  res.status(500).send({
                    status: "aborted",
                    with: o.abortedWith
                  })
                  return
              }
            })
          })
        })
      )
    },
    withApp<S, R, E, A>(op: T.Effect<S, R & HasExpress, E, A>): T.Effect<S, R, E, A> {
      return T.provide<HasExpress>({
        [expressAppEnv]: { app: newExpress() }
      })(op)
    },
    bind(port: number, hostname?: string): T.AsyncRE<HasExpress, Error, Server> {
      return T.accessM(({ [expressAppEnv]: { app } }: HasExpress) =>
        T.async<Error, Server>((res) => {
          const s = app.listen(port, hostname || "0.0.0.0", (err) => {
            if (err) {
              res(E.left(err))
            } else {
              res(E.right(s))
            }
          })

          return (cb) => {
            s.close((e) => {
              e ? cb(e) : cb()
            })
          }
        })
      )
    }
  }
}

export function withApp<S, R, E, A>(
  op: T.Effect<S, R & HasExpress, E, A>
): T.Effect<S, Express & R, E, A> {
  return T.accessM(({ [expressEnv]: express }: Express) => express.withApp(op))
}

export const requestContextEnv = "@matechs/express/requestContextURI"

export interface RequestContext {
  [requestContextEnv]: {
    request: EX.Request
  }
}

export function route<S, R, E, A>(
  method: Method,
  path: string,
  handler: T.Effect<S, R, RouteError<E>, RouteResponse<A>>,
  middle: NextHandleFunction[] = [EX.json()]
): T.SyncR<T.Erase<R, RequestContext> & HasExpress & Express, void> {
  return T.accessM(({ [expressEnv]: express }: Express) =>
    express.route(
      method,
      path,
      (x) =>
        T.provide<RequestContext>({
          [requestContextEnv]: {
            request: x
          }
        })(handler),
      ...middle
    )
  )
}

export function bind(
  port: number,
  hostname?: string
): T.AsyncRE<HasExpress & Express, Error, Server> {
  return T.accessM(({ [expressEnv]: express }: Express) => express.bind(port, hostname))
}

export function accessAppM<S, R, E, A>(
  f: (app: EX.Express) => T.Effect<S, R, E, A>
): T.Effect<S, HasExpress & R, E, A> {
  return T.accessM(({ [expressAppEnv]: express }: HasExpress) => f(express.app))
}

export function accessReqM<S, R, E, A>(
  f: (req: EX.Request) => T.Effect<S, R, E, A>
): T.Effect<S, RequestContext & R, E, A> {
  return T.accessM(({ [requestContextEnv]: { request } }: RequestContext) => f(request))
}

export function accessReq<A>(f: (req: EX.Request) => A): T.SyncR<RequestContext, A> {
  return T.access(({ [requestContextEnv]: { request } }: RequestContext) => f(request))
}

export function accessApp<A>(f: (app: EX.Express) => A): T.SyncR<HasExpress, A> {
  return T.access(({ [expressAppEnv]: express }: HasExpress) => f(express.app))
}

export type ExpressEnv = HasExpress & Express

export type ChildEnv = ExpressEnv & RequestContext

export const managedExpress = (
  port: number,
  hostname?: string
): M.AsyncRE<Express, Error, HasServer & HasExpress> =>
  M.bracket(
    withApp(
      T.map_(
        T.sequenceT(bind(port, hostname), accessApp(F.identity)),
        ([server, app]): HasServer & HasExpress => ({
          [serverEnv]: {
            server,
            onClose: []
          },
          [expressAppEnv]: {
            app
          }
        })
      )
    ),
    (_) =>
      T.uninterruptible(
        T.chain_(T.result(T.sequenceArray(_[serverEnv].onClose)), () =>
          T.async<Error, void>((res) => {
            _[serverEnv].server.close((err) => {
              if (err) {
                res(E.left(err))
              } else {
                res(E.right(undefined))
              }
            })
            return () => {
              //
            }
          })
        )
      )
  )
