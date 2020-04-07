import newExpress from "express";
import { effect as T } from "@matechs/effect";
import * as EX from "express";
import { Server } from "http";
import { pipe } from "fp-ts/lib/pipeable";
import { sequenceS } from "fp-ts/lib/Apply";
import { array } from "fp-ts/lib/Array";
import { left, right } from "fp-ts/lib/Either";

export const expressAppEnv = "@matechs/express/expressAppURI";

export interface HasExpress {
  [expressAppEnv]: {
    app: EX.Express;
  };
}

export const serverEnv = "@matechs/express/serverURI";

export interface HasServer {
  [serverEnv]: {
    server: Server;
    onClose: Array<T.UIO<void>>;
  };
}

export type Method = "post" | "get" | "put" | "patch" | "delete";

export const expressEnv = "@matechs/express/expressURI";

export interface ExpressOps {
  withApp<R, E, A>(op: T.Effect<R & HasExpress, E, A>): T.Effect<R, E, A>;
  route<R, E, A>(
    method: Method,
    path: string,
    f: (req: EX.Request) => T.Effect<R, RouteError<E>, RouteResponse<A>>
  ): T.Effect<R & HasExpress, T.NoErr, void>;
  bind(port: number, hostname?: string): T.Effect<HasExpress, T.NoErr, Server>;
}

export interface Express {
  [expressEnv]: ExpressOps;
}

export interface RouteError<E> {
  status: number;
  body: E;
}

export function routeError<E>(status: number, body: E): RouteError<E> {
  return {
    status,
    body,
  };
}

export interface RouteResponse<A> {
  status: number;
  body: A;
}

export function routeResponse<A>(status: number, body: A): RouteResponse<A> {
  return {
    status,
    body,
  };
}

export const express: Express = {
  [expressEnv]: {
    route<R, E, A>(
      method: Method,
      path: string,
      f: (req: EX.Request) => T.Effect<R, RouteError<E>, RouteResponse<A>>
    ): T.Effect<R & HasExpress, T.NoErr, void> {
      return T.accessM((r: R & HasExpress) =>
        T.sync(() => {
          r[expressAppEnv].app[method](path, newExpress.json(), (req, res) => {
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
                    status: "interrupted",
                  });
                  return;
                case "Abort":
                  res.status(500).send({
                    status: "aborted",
                    with: o.abortedWith,
                  });
                  return;
              }
            });
          });
        })
      );
    },
    withApp<R, E, A>(op: T.Effect<R & HasExpress, E, A>): T.Effect<R, E, A> {
      return T.provideR((r: R) => ({
        ...r,
        [expressAppEnv]: { ...r[expressAppEnv], app: newExpress() },
      }))(op);
    },
    bind(
      port: number,
      hostname?: string
    ): T.Effect<HasExpress, T.NoErr, Server> {
      return T.accessM(({ [expressAppEnv]: { app } }: HasExpress) =>
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
    },
  },
};

export function withApp<R, E, A>(
  op: T.Effect<R & HasExpress, E, A>
): T.Effect<Express & R, E, A> {
  return T.accessM(({ [expressEnv]: express }: Express) => express.withApp(op));
}

export function bracketWithApp(
  port: number,
  hostname?: string
): <R, E>(
  op: T.Effect<R & HasExpress & HasServer, E, any>
) => T.Effect<Express & R, E, never> {
  return (op) =>
    withApp(
      T.bracket(
        sequenceS(T.effect)({
          server: bind(port, hostname),
          onClose: T.pure<T.UIO<void>[]>([]),
        }),
        ({ server, onClose }) =>
          T.asyncTotal((r) => {
            const c = setTimeout(() => {
              T.run(array.sequence(T.effect)(onClose), () => {
                server.close((e) => {
                  /* istanbul ignore if */
                  if (e) {
                    console.error("express interruption failed");
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
                onClose,
              },
            }),
            T.chain((_) => T.never)
          )
      )
    );
}

export const requestContextEnv = "@matechs/express/requestContextURI";

export interface RequestContext {
  [requestContextEnv]: {
    request: EX.Request;
  };
}

export function route<R, E, A>(
  method: Method,
  path: string,
  handler: T.Effect<R, RouteError<E>, RouteResponse<A>>
): T.Effect<T.Erase<R, RequestContext> & HasExpress & Express, T.NoErr, void> {
  return T.accessM(({ [expressEnv]: express }: Express) =>
    express.route(method, path, (x) =>
      T.provideR((r: R & HasExpress & Express) => ({
        ...r,
        [requestContextEnv]: {
          request: x,
        },
      }))(handler)
    )
  );
}

export function bind(
  port: number,
  hostname?: string
): T.Effect<HasExpress & Express, T.NoErr, Server> {
  return T.accessM(({ [expressEnv]: express }: Express) =>
    express.bind(port, hostname)
  );
}

export function accessAppM<R, E, A>(
  f: (app: EX.Express) => T.Effect<R, E, A>
): T.Effect<HasExpress & R, E, A> {
  return T.accessM(({ [expressAppEnv]: express }: HasExpress) =>
    f(express.app)
  );
}

export function accessReqM<R, E, A>(
  f: (req: EX.Request) => T.Effect<R, E, A>
): T.Effect<RequestContext & R, E, A> {
  return T.accessM(({ [requestContextEnv]: { request } }: RequestContext) =>
    f(request)
  );
}

export function accessReq<A>(
  f: (req: EX.Request) => A
): T.Effect<RequestContext, never, A> {
  return T.access(({ [requestContextEnv]: { request } }: RequestContext) =>
    f(request)
  );
}

export function accessApp<A>(
  f: (app: EX.Express) => A
): T.Effect<HasExpress, T.NoErr, A> {
  return T.access(({ [expressAppEnv]: express }: HasExpress) => f(express.app));
}

export type ExpressEnv = HasExpress & Express;

export type ChildEnv = ExpressEnv & RequestContext;
