import newKoa from "koa";
import { effect as T } from "@matechs/effect";
import * as KOA from "koa";
import { Server } from "http";
import { pipe } from "fp-ts/lib/pipeable";
import { sequenceS } from "fp-ts/lib/Apply";
import { array } from "fp-ts/lib/Array";
import { left, right } from "fp-ts/lib/Either";

export const koaAppEnv = "@matechs/koa/koaAppURI";

export interface HasKoa {
  [koaAppEnv]: {
    app: KOA;
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
  route<R, E, A>(
    method: Method,
    path: string,
    f: (req: KOA.Request) => T.Effect<R, RouteError<E>, RouteResponse<A>>
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

export const koa: Koa = {
  [koaEnv]: {
    route<R, E, A>(
      method: Method,
      path: string,
      f: (req: KOA.Request) => T.Effect<R, RouteError<E>, RouteResponse<A>>
    ): T.Effect<R & HasKoa, T.NoErr, void> {
      return T.accessM((r: R & HasKoa) =>
        T.sync(() => {
          r[koaAppEnv].app[method](path, newKoa.json(), (req, res) => {
            T.runToPromiseExit(T.provideAll(r)(f(req))).then((o) => {
              switch (o._tag) {
                case "Done":
                  res.status(o.value.status).send(o.value.body);
                  return;
                case "Raise":
                  res.status(o.error.status).send(o.error.body);
                  return;
                case "Interrupt":
                  res.status(500).send({
                    status: "interrupted"
                  });
                  return;
                case "Abort":
                  res.status(500).send({
                    status: "aborted",
                    with: o.abortedWith
                  });
                  return;
              }
            });
          });
        })
      );
    },
    withApp<R, E, A>(op: T.Effect<R & HasKoa, E, A>): T.Effect<R, E, A> {
      return T.provideR((r: R) => ({
        ...r,
        [koaAppEnv]: { ...r[koaAppEnv], app: newKoa() }
      }))(op);
    },
    bind(port: number, hostname?: string): T.Effect<HasKoa, T.NoErr, Server> {
      return T.accessM(({ [koaAppEnv]: { app } }: HasKoa) =>
        T.orAbort(
          T.async<unknown, Server>((res) => {
            const s = app.listen(port, hostname || "0.0.0.0", (err) => {
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

export const requestContextEnv = "@matechs/koa/requestContextURI";

export interface RequestContext {
  [requestContextEnv]: {
    request: KOA.Request;
  };
}

export function route<R, E, A>(
  method: Method,
  path: string,
  handler: T.Effect<R, RouteError<E>, RouteResponse<A>>
): T.Effect<T.Erase<R, RequestContext> & HasKoa & Koa, T.NoErr, void> {
  return T.accessM(({ [koaEnv]: koa }: Koa) =>
    koa.route(method, path, (x) =>
      T.provideR((r: R & HasKoa & Koa) => ({
        ...r,
        [requestContextEnv]: {
          request: x
        }
      }))(handler)
    )
  );
}

export function bind(
  port: number,
  hostname?: string
): T.Effect<HasKoa & Koa, T.NoErr, Server> {
  return T.accessM(({ [koaEnv]: koa }: Koa) => koa.bind(port, hostname));
}

export function accessAppM<R, E, A>(
  f: (app: KOA.Koa) => T.Effect<R, E, A>
): T.Effect<HasKoa & R, E, A> {
  return T.accessM(({ [koaAppEnv]: koa }: HasKoa) => f(koa.app));
}

export function accessReqM<R, E, A>(
  f: (req: KOA.Request) => T.Effect<R, E, A>
): T.Effect<RequestContext & R, E, A> {
  return T.accessM(({ [requestContextEnv]: { request } }: RequestContext) => f(request));
}

export function accessReq<A>(f: (req: KOA.Request) => A): T.Effect<RequestContext, never, A> {
  return T.access(({ [requestContextEnv]: { request } }: RequestContext) => f(request));
}

export function accessApp<A>(f: (app: KOA.Koa) => A): T.Effect<HasKoa, T.NoErr, A> {
  return T.access(({ [koaAppEnv]: koa }: HasKoa) => f(koa.app));
}

export type KoaEnv = HasKoa & Koa;

export type ChildEnv = KoaEnv & RequestContext;
