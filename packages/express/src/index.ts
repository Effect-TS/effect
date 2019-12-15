import newExpress from "express";
import { effect as T } from "@matechs/effect";
import * as EX from "express";
import * as bodyParser from "body-parser";
import { Server } from "http";

export const expressAppEnv: unique symbol = Symbol();

export interface HasExpress {
  [expressAppEnv]: {
    app: EX.Express;
  };
}

export type Method = "post" | "get" | "put" | "patch" | "delete";

export const expressEnv: unique symbol = Symbol();

export interface Express {
  [expressEnv]: {
    withApp<R, E, A>(op: T.Effect<R & HasExpress, E, A>): T.Effect<R, E, A>;
    route<R, E, A>(
      method: Method,
      path: string,
      f: (req: EX.Request) => T.Effect<R, RouteError<E>, RouteResponse<A>>
    ): T.Effect<R & HasExpress, T.NoErr, void>;
    bind(
      port: number,
      hostname?: string
    ): T.Effect<HasExpress, T.NoErr, Server>;
  };
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

export const express: Express = {
  [expressEnv]: {
    route<R, E, A>(
      method: Method,
      path: string,
      f: (req: EX.Request) => T.Effect<R, RouteError<E>, RouteResponse<A>>
    ): T.Effect<R & HasExpress, T.NoErr, void> {
      return T.accessM((r: R & HasExpress) =>
        T.sync(() => {
          r[expressAppEnv].app[method](path, bodyParser.json(), (req, res) => {
            T.runToPromiseExit(T.provideAll(r)(f(req))).then(o => {
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
    withApp<R, E, A>(op: T.Effect<R & HasExpress, E, A>): T.Effect<R, E, A> {
      return T.provideR((r: R) => ({
        ...r,
        [expressAppEnv]: { ...r[expressAppEnv], app: newExpress() }
      }))(op);
    },
    bind(
      port: number,
      hostname?: string
    ): T.Effect<HasExpress, T.NoErr, Server> {
      return T.accessM(({ [expressAppEnv]: { app } }: HasExpress) =>
        T.sync(() => app.listen(port, hostname || "0.0.0.0"))
      );
    }
  }
};

export function withApp<R, E, A>(
  op: T.Effect<R & HasExpress, E, A>
): T.Effect<Express & R, E, A> {
  return T.accessM(({ [expressEnv]: express }: Express) => express.withApp(op));
}

export function route<R, E, A>(
  method: Method,
  path: string,
  f: (req: EX.Request) => T.Effect<R, RouteError<E>, RouteResponse<A>>
): T.Effect<R & HasExpress & Express, T.NoErr, void> {
  return T.accessM(({ [expressEnv]: express }: Express) =>
    express.route(method, path, f)
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
): T.Effect<HasExpress & Express & R, E, A> {
  return T.accessM(({ [expressAppEnv]: express }: HasExpress) =>
    f(express.app)
  );
}

export function accessApp<A>(
  f: (app: EX.Express) => A
): T.Effect<HasExpress & Express, T.NoErr, A> {
  return T.access(({ [expressAppEnv]: express }: HasExpress) => f(express.app));
}

export type ExpressEnv = HasExpress & Express;
