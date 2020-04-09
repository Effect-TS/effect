import KoaApp from "koa";
import { effect as T } from "@matechs/effect";
import * as KOA from "koa";
import koaBodyParser from "koa-bodyparser";
import KoaRouter from "koa-router";
import { Server } from "http";
import { pipe } from "fp-ts/lib/pipeable";
import { sequenceS } from "fp-ts/lib/Apply";
import { array } from "fp-ts/lib/Array";
import { left, right } from "fp-ts/lib/Either";
import { Do } from "fp-ts-contrib/lib/Do";

export const koaAppEnv = "@matechs/koa/koaAppURI";

export interface HasKoa {
  [koaAppEnv]: {
    app: KoaApp;
  };
}

export const serverEnv = "@matechs/koa/serverURI";

export interface HasServer {
  [serverEnv]: {
    server: Server;
    onClose: Array<T.UIO<void>>;
  };
}

export type Method = "post" | "get" | "put" | "patch" | "delete";

export const koaEnv = "@matechs/koa/koaURI";

export interface KoaOps {
  withApp<R, E, A>(op: T.Effect<R & HasKoa, E, A>): T.Effect<R, E, A>;
  router<R, E, A>(
    f: (dsl: {
      route(
        method: Method,
        path: string,
        action: T.Effect<R, RouteError<E>, RouteResponse<A>>
      ): T.Effect<R, E, void>;
    }) => T.Effect<R, E, void>
  ): T.Effect<R & HasKoa, T.NoErr, void>;
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

interface RouterDSL<R, E, A> {
  route(
    method: Method,
    path: string,
    action: T.Effect<R, RouteError<E>, RouteResponse<A>>
  ): T.Effect<R, E, void>;
}

export const koa: Koa = {
  [koaEnv]: {
    router<R, E, A>(
      f: (dsl: RouterDSL<R, E, A>) => T.Effect<R, T.NoErr, void>
    ): T.Effect<R & HasKoa, T.NoErr, void> {
      return Do(T.effect)
        .bindL("router", () => T.pure(new KoaRouter()))
        .bindL("dsl", ({ router }) => {
          const dsl = {
            // TODO: add subrouter support
            route(
              method: Method,
              path: string,
              handler: T.Effect<R, RouteError<E>, RouteResponse<A>>
            ) {
              return T.accessM((r: R) =>
                T.sync(() => {
                  const f = (ctx: KOA.ParameterizedContext) =>
                    T.accessM<R, R, RouteError<E>, RouteResponse<A>>(() =>
                      T.provideR((r: R) => ({
                        ...r,
                        [contextEnv]: {
                          ctx
                        }
                      }))(handler)
                    );
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
            }
          };
          return T.pure(dsl);
        })
        .doL(({ dsl }) => f(dsl))
        .doL(({ router }) =>
          T.accessM((r: R & HasKoa) =>
            T.sync(() => {
              r[koaAppEnv].app.use(router.allowedMethods());
              r[koaAppEnv].app.use(router.routes());
            })
          )
        )
        .return(() => void 0 as void);
    },
    withApp<R, E, A>(op: T.Effect<R & HasKoa, E, A>): T.Effect<R, E, A> {
      return T.provideR((r: R) => ({
        ...r,
        [koaAppEnv]: { ...r[koaAppEnv], app: new KoaApp() }
      }))(op);
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
};

export function withApp<R, E, A>(op: T.Effect<R & HasKoa, E, A>): T.Effect<Koa & R, E, A> {
  return T.accessM(({ [koaEnv]: koa }: Koa) => koa.withApp(op));
}

export function bracketWithApp(
  port: number,
  hostname?: string
): <R, E>(op: T.Effect<R & HasKoa & HasServer, E, any>) => T.Effect<Koa & R, E, never> {
  return (op) =>
    withApp(
      T.bracket(
        sequenceS(T.effect)({
          server: bind(port, hostname),
          onClose: T.pure<T.UIO<void>[]>([])
        }),
        ({ server, onClose }) =>
          T.asyncTotal((r) => {
            const c = setTimeout(() => {
              T.run(array.sequence(T.effect)(onClose), () => {
                server.close((e) => {
                  /* istanbul ignore if */
                  if (e) {
                    console.error("koa interruption failed");
                    console.error(e);
                  }
                  r(undefined);
                });
              });
            }, 100);
            return (cb) => {
              clearTimeout(c);
              cb();
            };
          }),
        ({ server, onClose }) =>
          pipe(
            op,
            T.provideS<HasServer>({
              [serverEnv]: {
                server,
                onClose
              }
            }),
            T.chain((_) => T.never)
          )
      )
    );
}

export const contextEnv = "@matechs/koa/ContextURI";

export interface Context {
  [contextEnv]: {
    ctx: KOA.ParameterizedContext;
  };
}

export function router<R, E, A>(
  f: (dsl: RouterDSL<R, E, A>) => T.Effect<R, E, void>
): T.Effect<T.Erase<R, Context> & HasKoa & Koa, T.NoErr, void> {
  return T.accessM(({ [koaEnv]: koa }: Koa) => koa.router<R, E, A>(f));
}

export function bind(port: number, hostname?: string): T.Effect<HasKoa & Koa, T.NoErr, Server> {
  return T.accessM(({ [koaEnv]: koa }: Koa) => koa.bind(port, hostname));
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

export type KoaEnv = HasKoa & Koa;

export type ChildEnv = KoaEnv & Context;
