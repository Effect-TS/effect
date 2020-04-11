import KoaApp from "koa";
import { effect as T, managed as M } from "@matechs/effect";
import * as KOA from "koa";
import koaBodyParser from "koa-bodyparser";
import KoaRouter from "koa-router";
import KC from "koa-compose";
import { Server } from "http";
import { pipe } from "fp-ts/lib/pipeable";
import { array } from "fp-ts/lib/Array";
import { left, right } from "fp-ts/lib/Either";
import { Do } from "fp-ts-contrib/lib/Do";

export const koaAppEnv = "@matechs/koa/koaAppURI";
export interface HasKoa {
  [koaAppEnv]: {
    app: KoaApp;
  };
}

export const koaRouterEnv = "@matechs/koa/routerURI";
export interface HasRouter {
  [koaRouterEnv]: {
    router: KoaRouter;
    parent?: KoaRouter;
  };
}

export const serverEnv = "@matechs/koa/serverURI";
export interface HasServer {
  [serverEnv]: {
    server: Server;
    onClose: Array<T.UIO<void>>;
  };
}

export const middleURI = "@matechs/koa/middleURI";

export interface HasMiddle {
  [middleURI]: {
    middlewares: Array<KOA.Middleware<KOA.ParameterizedContext<any, any>>>;
  };
}

export type Method = "post" | "get" | "put" | "patch" | "delete";

export const koaEnv = "@matechs/koa/koaURI";

export interface KoaOps {
  withApp<R, E, A>(op: T.Effect<R & HasKoa, E, A>): T.Effect<R, E, A>;
  withRouter<R, E, A>(op: T.Effect<R & HasMiddle & HasRouter, E, A>): T.Effect<R & HasKoa, E, A>;
  withSubRouter<R, E, A>(
    path: string,
    op: T.Effect<R & HasRouter, E, A>
  ): T.Effect<R & HasRouter, E, A>;
  route<R, E, A>(
    method: Method,
    path: string,
    f: (ctx: KOA.ParameterizedContext) => T.Effect<R, RouteError<E>, RouteResponse<A>>
  ): T.Effect<R & HasRouter, T.NoErr, void>;
  bind(port: number, hostname?: string): T.Effect<HasKoa, T.NoErr, Server>;
}

export interface Koa {
  [koaEnv]: KoaOps;
}

export interface RouteError<E> {
  status: number;
  body: E;
}

export function routeError<E>(status: number, body: E): RouteError<E> {
  return {
    status,
    body
  };
}

export interface RouteResponse<A> {
  status: number;
  body: A;
}

export function routeResponse<A>(status: number, body: A): RouteResponse<A> {
  return {
    status,
    body
  };
}

export const provideKoa = T.provideS<Koa>({
  [koaEnv]: {
    route<R, E, A>(
      method: Method,
      path: string,
      f: (ctx: KOA.ParameterizedContext) => T.Effect<R, RouteError<E>, RouteResponse<A>>
    ): T.Effect<R & HasRouter, T.NoErr, void> {
      return T.accessM((r: R & HasRouter) =>
        T.sync(() => {
          const router = r[koaRouterEnv].router;
          router[method](path, koaBodyParser(), (ctx) =>
            T.runToPromiseExit(T.provideAll(r)(f(ctx))).then((o) => {
              switch (o._tag) {
                case "Done":
                  ctx.status = o.value.status;
                  ctx.body = o.value.body;
                  return;
                case "Raise":
                  ctx.status = o.error.status;
                  ctx.body = o.error.body;
                  return;
                case "Interrupt":
                  ctx.status = 500;
                  ctx.body = {
                    status: "interrupted"
                  };
                  return;
                case "Abort":
                  ctx.status = 500;
                  ctx.body = {
                    status: "aborted",
                    with: o.abortedWith
                  };
                  return;
              }
            })
          );
        })
      );
    },
    withApp<R, E, A>(op: T.Effect<R & HasKoa, E, A>): T.Effect<R, E, A> {
      return T.provideR((r: R) => ({
        ...r,
        [koaAppEnv]: { ...r[koaAppEnv], app: new KoaApp() }
      }))(op);
    },
    withRouter<R, E, A>(op: T.Effect<R & HasMiddle & HasRouter, E, A>): T.Effect<R & HasKoa, E, A> {
      return T.provideR((r: R & HasKoa): R & HasMiddle & HasKoa & HasRouter => ({
        ...r,
        [koaRouterEnv]: { ...r[koaRouterEnv], router: new KoaRouter<any, {}>() },
        [middleURI]: {
          middlewares: []
        }
      }))(
        Do(T.effect)
          .bind("result", op)
          .do(
            T.accessM(
              ({
                [koaRouterEnv]: { router },
                [koaAppEnv]: { app },
                [middleURI]: { middlewares }
              }: HasRouter & HasKoa & HasMiddle) =>
                T.sync(() => {
                  app.use(KC(middlewares));
                  app.use(router.allowedMethods());
                  app.use(router.routes());
                })
            )
          )
          .return((r) => r.result)
      );
    },
    withSubRouter<R, E, A>(
      path: string,
      op: T.Effect<R & HasRouter, E, A>
    ): T.Effect<R & HasRouter, E, A> {
      return T.provideR((r: R & HasRouter) => ({
        ...r,
        [koaRouterEnv]: {
          ...r[koaRouterEnv],
          parent: r[koaRouterEnv].router,
          router: new KoaRouter<any, {}>()
        }
      }))(
        Do(T.effect)
          .bind("result", op)
          .do(
            T.accessM(({ [koaRouterEnv]: { parent, router } }: HasRouter) =>
              T.sync(() => {
                parent!.use(path, router.allowedMethods());
                parent!.use(path, router.routes());
              })
            )
          )
          .return((r) => r.result)
      );
    },
    bind(port: number, hostname?: string): T.Effect<HasKoa, T.NoErr, Server> {
      return T.accessM(({ [koaAppEnv]: { app } }: HasKoa) =>
        T.orAbort(
          T.async<unknown, Server>((res) => {
            const s = app.listen(port, hostname || "0.0.0.0", (err?: unknown) => {
              if (err) {
                res(left(err));
              } else {
                res(right(s));
              }
            });

            return (cb) => {
              s.close((e) => {
                cb(e);
              });
            };
          })
        )
      );
    }
  }
});

export function withApp<R, E, A>(op: T.Effect<R & HasKoa, E, A>): T.Effect<Koa & R, E, A> {
  return T.accessM(({ [koaEnv]: koa }: Koa) => koa.withApp(op));
}

function withRouter<R, E, A>(
  op: T.Effect<R & HasMiddle & HasRouter, E, A>
): T.Effect<Koa & HasKoa & R, E, A> {
  return T.accessM(({ [koaEnv]: koa }: Koa) => koa.withRouter(op));
}

export function withSubRouter(
  path: string
): <R, E, A>(op: T.Effect<R, E, A>) => T.Effect<Koa & HasRouter & R, E, A> {
  return (op) => T.accessM(({ [koaEnv]: koa }: Koa) => koa.withSubRouter(path, op));
}

export const contextEnv = "@matechs/koa/ContextURI";

export interface Context {
  [contextEnv]: {
    ctx: KOA.ParameterizedContext;
  };
}

export function route<R, E, A>(
  method: Method,
  path: string,
  handler: T.Effect<R, RouteError<E>, RouteResponse<A>>
): T.Effect<T.Erase<R, Context> & Koa & HasRouter, T.NoErr, void> {
  return T.accessM(({ [koaEnv]: koa }: Koa) =>
    koa.route(method, path, (x) =>
      T.provideR((r: R & Koa) => ({
        ...r,
        [contextEnv]: {
          ctx: x
        }
      }))(handler)
    )
  );
}

export function bind(
  port: number,
  hostname?: string
): <R, E, A>(
  _: T.Effect<R & HasRouter & HasMiddle & HasServer, E, A>
) => T.Effect<HasKoa & Koa & R, E, A> {
  return (op) =>
    T.effect.chain(
      T.accessM(({ [koaEnv]: koa }: Koa) => koa.bind(port, hostname)),
      (server) =>
        pipe(
          op,
          T.provideS<HasServer>({
            [serverEnv]: {
              onClose: [],
              server
            }
          }),
          withRouter
        )
    );
}

export const managedKoa = (port: number, hostname?: string) =>
  M.bracket(
    withApp(
      bind(port, hostname)(T.accessEnvironment<HasRouter & HasServer & HasKoa & HasMiddle>())
    ),
    (_) =>
      T.uninterruptible(
        T.effect.chain(T.result(array.sequence(T.effect)(_[serverEnv].onClose)), () =>
          T.async<Error, void>((res) => {
            _[serverEnv].server.close((err) => {
              if (err) {
                res(left(err));
              } else {
                res(right(undefined));
              }
            });
            return () => {
              //
            };
          })
        )
      )
  );

export function accessServerM<R, E, A>(
  f: (app: Server) => T.Effect<R, E, A>
): T.Effect<HasServer & R, E, A> {
  return T.accessM(({ [serverEnv]: koa }: HasServer) => f(koa.server));
}

export function accessServer<A>(f: (app: Server) => A): T.Effect<HasServer, never, A> {
  return T.access(({ [serverEnv]: koa }: HasServer) => f(koa.server));
}

export function accessAppM<R, E, A>(
  f: (app: KOA) => T.Effect<R, E, A>
): T.Effect<HasKoa & R, E, A> {
  return T.accessM(({ [koaAppEnv]: koa }: HasKoa) => f(koa.app));
}

export function accessReqM<R, E, A>(
  f: (ctx: KOA.ParameterizedContext) => T.Effect<R, E, A>
): T.Effect<Context & R, E, A> {
  return T.accessM(({ [contextEnv]: { ctx } }: Context) => f(ctx));
}

export function accessReq<A>(f: (ctx: KOA.ParameterizedContext) => A): T.Effect<Context, never, A> {
  return T.access(({ [contextEnv]: { ctx } }: Context) => f(ctx));
}

export function accessApp<A>(f: (app: KOA) => A): T.Effect<HasKoa, T.NoErr, A> {
  return T.access(({ [koaAppEnv]: koa }: HasKoa) => f(koa.app));
}

export function middleware(
  middle: KOA.Middleware<KOA.ParameterizedContext<any, any>>
): T.Effect<HasMiddle, never, void> {
  return T.access((_: HasMiddle) => {
    _[middleURI].middlewares.push(middle);
  });
}

export type KoaEnv = HasKoa & Koa;

export type ChildEnv = KoaEnv & Context;
