import * as http from "http"

import * as connect from "connect"
import * as Exp from "express"

import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import { pipe, identity } from "@matechs/core/Function"
import * as L from "@matechs/core/Layer"
import * as M from "@matechs/core/Managed"

//
// @category definition
//

export const ExpressURI = "@matechs/express/ExpressURI"

export interface Express {
  [ExpressURI]: {
    accessServer: T.Sync<http.Server>
    accessApp: T.Sync<Exp.Express>
  }
}

export const RequestContextURI = "@matechs/express/RequestContextURI"

export interface RequestContext {
  [RequestContextURI]: {
    request: Exp.Request
  }
}

export type Method = "post" | "get" | "put" | "patch" | "delete"

export interface RouteError<E> {
  status: number
  body: E
}

export interface RouteResponse<A> {
  status: number
  body: A
}

//
// @category api
//

export const accessApp = <A>(f: (_: Exp.Express) => A) =>
  T.accessM((_: Express) => T.map_(_[ExpressURI].accessApp, f))

export const accessAppM = <S, R, E, A>(f: (app: Exp.Express) => T.Effect<S, R, E, A>) =>
  T.chain_(accessApp(identity), f)

export const accessServer = <A>(f: (_: http.Server) => A) =>
  T.accessM((_: Express) => T.map_(_[ExpressURI].accessServer, f))

export const accessServerM = <S, R, E, A>(
  f: (_: http.Server) => T.Effect<S, R, E, A>
) => T.accessM((_: Express) => T.chain_(accessServer(identity), f))

export const accessReq = <A>(f: (req: Exp.Request) => A) =>
  T.access(({ [RequestContextURI]: { request } }: RequestContext) => f(request))

export const accessReqM = <S, R, E, A>(f: (req: Exp.Request) => T.Effect<S, R, E, A>) =>
  T.chain_(accessReq(identity), f)

export function routeError(status: number) {
  return <E>(body: E): RouteError<E> => ({
    status,
    body
  })
}

export function routeResponse(status: number) {
  return <A>(body: A): RouteResponse<A> => ({
    status,
    body
  })
}

export const route = <S = never, R = unknown, E = never, A = unknown>(
  method: Method,
  path: string,
  f: T.Effect<S, R, RouteError<E>, RouteResponse<A>>,
  ...rest: connect.NextHandleFunction[]
): T.SyncR<T.Erase<R, RequestContext> & Express, void> =>
  accessAppM((app) =>
    T.access((r: R) => {
      app[method](path, ...(rest.length === 0 ? [Exp.json()] : rest), (req, res) => {
        T.run(
          pipe(
            f,
            T.provide({
              ...r,
              [RequestContextURI]: {
                request: req
              }
            })
          ),
          (o) => {
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
          }
        )
      })
    })
  )

//
// @category implementation
//

export interface ExpressConfig {
  port: number
  hostname?: string
}

export interface BindError {
  _tag: "BindError"
  error: Error
}

export interface CloseError {
  _tag: "CloseError"
  error: Error
}

const managedExpress = ({ hostname, port }: ExpressConfig) =>
  M.bracket(
    T.uninterruptibleAsync<BindError, { express: Exp.Express; server: http.Server }>(
      (resolve) => {
        const express = Exp.default()

        const server = express.listen(port, hostname || "0.0.0.0", (err) => {
          if (err) {
            resolve(
              E.left<BindError>({
                _tag: "BindError",
                error: err
              })
            )
          } else {
            resolve(
              E.right({
                server,
                express
              })
            )
          }
        })
      }
    ),
    ({ server }) =>
      T.uninterruptibleAsync<CloseError, void>((resolve) => {
        server.close((err) => {
          if (err) {
            resolve(
              E.left({
                _tag: "CloseError",
                error: err
              })
            )
          } else {
            resolve(E.right(undefined))
          }
        })
      })
  )

export type ExpressError = BindError | CloseError

export const Express = (
  port: number,
  hostname?: string
): L.AsyncE<ExpressError, Express> =>
  pipe(
    { port, hostname },
    managedExpress,
    L.useManaged(({ express, server }) =>
      L.fromValue<Express>({
        [ExpressURI]: {
          accessApp: T.sync(() => express),
          accessServer: T.sync(() => server)
        }
      })
    )
  )
