import { Server } from "http"

import KoaApp from "koa"
import * as KOA from "koa"
import koaBodyParser from "koa-bodyparser"
import KC from "koa-compose"
import KoaRouter, { RouterContext } from "koa-router"

import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import { pipe } from "@matechs/core/Function"
import * as M from "@matechs/core/Managed"

export const koaAppEnv = "@matechs/koa/koaAppURI"
export interface HasKoa {
  [koaAppEnv]: {
    app: KoaApp
  }
}

export const koaRouterEnv = "@matechs/koa/routerURI"
export interface HasRouter {
  [koaRouterEnv]: {
    router: KoaRouter
    parent?: KoaRouter
  }
}

export const serverEnv = "@matechs/koa/serverURI"
export interface HasServer {
  [serverEnv]: {
    server: Server
    onClose: Array<T.Async<void>>
  }
}

export const middleURI = "@matechs/koa/middleURI"

export interface HasMiddle {
  [middleURI]: {
    middlewares: Array<KOA.Middleware<KOA.ParameterizedContext<any, any>>>
  }
}

export type Method = "post" | "get" | "put" | "patch" | "delete"

export const koaEnv = "@matechs/koa/koaURI"

export interface KoaOps {
  withApp<S, R, E, A>(op: T.Effect<S, R & HasKoa, E, A>): T.Effect<S, R, E, A>
  withRouter<S, R, E, A>(
    op: T.Effect<S, R & HasMiddle & HasRouter, E, A>
  ): T.Effect<S, R & HasKoa, E, A>
  withSubRouter<S, R, E, A>(
    path: string,
    op: T.Effect<S, R & HasRouter, E, A>
  ): T.Effect<S, R & HasRouter, E, A>
  route<S, R, E, A>(
    method: Method,
    path: string,
    f: (
      ctx: KOA.ParameterizedContext
    ) => T.Effect<S, R, RouteError<E>, RouteResponse<A>>
  ): T.SyncR<R & HasRouter, void>
  bind(port: number, hostname?: string): T.AsyncR<HasKoa, Server>
}

export interface Koa {
  [koaEnv]: KoaOps
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

export const provideKoa = T.provide<Koa>({
  [koaEnv]: {
    route<S, R, E, A>(
      method: Method,
      path: string,
      f: (
        ctx: KOA.ParameterizedContext
      ) => T.Effect<S, R, RouteError<E>, RouteResponse<A>>
    ): T.SyncR<R & HasRouter, void> {
      return T.accessM((r: R & HasRouter) =>
        T.sync(() => {
          const { router } = r[koaRouterEnv]
          router[method](path, koaBodyParser(), (ctx) =>
            T.runToPromiseExit(T.provide(r)(f(ctx))).then((o) => {
              switch (o._tag) {
                case "Done":
                  ctx.status = o.value.status
                  ctx.body = o.value.body
                  return
                case "Raise":
                  ctx.status = o.error.status
                  ctx.body = o.error.body
                  return
                case "Interrupt":
                  ctx.status = 500
                  ctx.body = {
                    status: "interrupted"
                  }
                  return
                case "Abort":
                  ctx.status = 500
                  ctx.body = {
                    status: "aborted",
                    with: o.abortedWith
                  }
                  return
              }
            })
          )
        })
      )
    },
    withApp<S, R, E, A>(op: T.Effect<S, R & HasKoa, E, A>): T.Effect<S, R, E, A> {
      return T.provide<HasKoa>({ [koaAppEnv]: { app: new KoaApp() } })(op)
    },
    withRouter<S, R, E, A>(
      op: T.Effect<S, R & HasMiddle & HasRouter, E, A>
    ): T.Effect<S, R & HasKoa, E, A> {
      return T.accessM((r: R & HasKoa) =>
        T.provide<HasMiddle & HasRouter>({
          [koaRouterEnv]: { ...r[koaRouterEnv], router: new KoaRouter<any, {}>() },
          [middleURI]: {
            middlewares: []
          }
        })(
          T.Do()
            .bind("result", op)
            .do(
              T.accessM(
                ({
                  [koaAppEnv]: { app },
                  [koaRouterEnv]: { router },
                  [middleURI]: { middlewares }
                }: HasRouter & HasKoa & HasMiddle) =>
                  T.sync(() => {
                    app.use(KC(middlewares))
                    app.use(router.allowedMethods())
                    app.use(router.routes())
                  })
              )
            )
            .return((r) => r.result)
        )
      )
    },
    withSubRouter<S, R, E, A>(
      path: string,
      op: T.Effect<S, R & HasRouter, E, A>
    ): T.Effect<S, R & HasRouter, E, A> {
      return T.accessM((r: HasRouter) =>
        T.provide({
          [koaRouterEnv]: {
            parent: r[koaRouterEnv].router,
            router: new KoaRouter<any, {}>()
          }
        })(
          T.Do()
            .bind("result", op)
            .do(
              T.accessM(({ [koaRouterEnv]: { parent, router } }: HasRouter) =>
                T.sync(() => {
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  parent!.use(path, router.allowedMethods())
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  parent!.use(path, router.routes())
                })
              )
            )
            .return((r) => r.result)
        )
      )
    },
    bind(port: number, hostname?: string): T.AsyncR<HasKoa, Server> {
      return T.accessM(({ [koaAppEnv]: { app } }: HasKoa) =>
        T.orAbort(
          T.async<Error, Server>((res) => {
            const s = app.listen(port, hostname || "0.0.0.0", (err?: Error) => {
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
      )
    }
  }
})

export function withApp<S, R, E, A>(
  op: T.Effect<S, R & HasKoa, E, A>
): T.Effect<S, Koa & R, E, A> {
  return T.accessM(({ [koaEnv]: koa }: Koa) => koa.withApp(op))
}

function withRouter<S, R, E, A>(
  op: T.Effect<S, R & HasMiddle & HasRouter, E, A>
): T.Effect<S, Koa & HasKoa & R, E, A> {
  return T.accessM(({ [koaEnv]: koa }: Koa) => koa.withRouter(op))
}

export function withSubRouter(
  path: string
): <S, R, E, A>(op: T.Effect<S, R, E, A>) => T.Effect<S, Koa & HasRouter & R, E, A> {
  return (op) => T.accessM(({ [koaEnv]: koa }: Koa) => koa.withSubRouter(path, op))
}

export const contextEnv = "@matechs/koa/ContextURI"

export interface Context {
  [contextEnv]: {
    ctx: KOA.ParameterizedContext<any, any>
  }
}

export function route<S, R, E, A>(
  method: Method,
  path: string,
  handler: T.Effect<S, R, RouteError<E>, RouteResponse<A>>
): T.SyncR<T.Erase<R, Context> & Koa & HasRouter, void> {
  return T.accessM(({ [koaEnv]: koa }: Koa) =>
    koa.route(method, path, (x) =>
      T.provide<Context>({
        [contextEnv]: {
          ctx: x
        }
      })(handler)
    )
  )
}

export function bind(
  port: number,
  hostname?: string
): <S, R, E, A>(
  _: T.Effect<S, R & HasRouter & HasMiddle & HasServer, E, A>
) => T.AsyncRE<HasKoa & Koa & R, E, A> {
  return (op) =>
    T.chain_(
      T.accessM(({ [koaEnv]: koa }: Koa) => koa.bind(port, hostname)),
      (server) =>
        pipe(
          op,
          T.provide<HasServer>({
            [serverEnv]: {
              onClose: [],
              server
            }
          }),
          withRouter
        )
    )
}

export const managedKoa = (port: number, hostname?: string) =>
  M.bracket(
    withApp(
      bind(
        port,
        hostname
      )(T.accessEnvironment<HasRouter & HasServer & HasKoa & HasMiddle>())
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

export function accessServerM<S, R, E, A>(
  f: (app: Server) => T.Effect<S, R, E, A>
): T.Effect<S, HasServer & R, E, A> {
  return T.accessM(({ [serverEnv]: koa }: HasServer) => f(koa.server))
}

export function accessServer<A>(f: (app: Server) => A): T.SyncR<HasServer, A> {
  return T.access(({ [serverEnv]: koa }: HasServer) => f(koa.server))
}

export function accessAppM<S, R, E, A>(
  f: (app: KOA) => T.Effect<S, R, E, A>
): T.Effect<S, HasKoa & R, E, A> {
  return T.accessM(({ [koaAppEnv]: koa }: HasKoa) => f(koa.app))
}

export function accessMiddlewareReqM<
  StateT = KOA.DefaultState,
  CustomT = KOA.DefaultContext
>(): <S, R, E, A>(
  f: (ctx: KOA.ParameterizedContext<StateT, CustomT>) => T.Effect<S, R, E, A>
) => T.Effect<S, Context & R, E, A> {
  return (f) => T.accessM(({ [contextEnv]: { ctx } }: Context) => f(ctx))
}

export function accessReqM<StateT = any, CustomT = {}>(): <S, R, E, A>(
  f: (ctx: RouterContext<StateT, CustomT>) => T.Effect<S, R, E, A>
) => T.Effect<S, Context & R, E, A> {
  return (f) => T.accessM(({ [contextEnv]: { ctx } }: Context) => f(ctx))
}

export function accessMiddlewareReq<
  StateT = KOA.DefaultState,
  CustomT = KOA.DefaultContext
>(): <A>(
  f: (ctx: KOA.ParameterizedContext<StateT, CustomT>) => A
) => T.SyncR<Context, A> {
  return (f) => T.access(({ [contextEnv]: { ctx } }: Context) => f(ctx))
}

export function accessReq<StateT = any, CustomT = {}>(): <A>(
  f: (ctx: RouterContext<StateT, CustomT>) => A
) => T.SyncR<Context, A> {
  return (f) => T.access(({ [contextEnv]: { ctx } }: Context) => f(ctx))
}

export function accessApp<A>(f: (app: KOA) => A): T.SyncR<HasKoa, A> {
  return T.access(({ [koaAppEnv]: koa }: HasKoa) => f(koa.app))
}

export function middleware<StateT = KOA.DefaultState, CustomT = KOA.DefaultContext>(
  middle: KOA.Middleware<KOA.ParameterizedContext<StateT, CustomT>>
): T.SyncR<HasMiddle, void> {
  return T.access((_: HasMiddle) => {
    _[middleURI].middlewares.push(middle)
  })
}

export function middlewareM<S, R, E, A>(
  middle: (cont: T.Async<void>) => T.Effect<S, R, E, A>
): T.SyncR<HasMiddle & T.Erase<R, Context>, void> {
  return T.access((_: HasMiddle & R) => {
    _[middleURI].middlewares.push((ctx, next) =>
      pipe(
        middle(T.orAbort(T.suspended(() => T.fromPromise(next)))),
        T.provide(_),
        T.provide<Context>({
          [contextEnv]: {
            ctx
          }
        }),
        T.runToPromise
      )
    )
  })
}

export type KoaEnv = HasKoa & Koa

export type ChildEnv = KoaEnv & Context
