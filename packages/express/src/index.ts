import newExpress from "express";
import * as T from "@matechs/effect";
import * as EX from "express";
import * as bodyParser from "body-parser";
import { isLeft } from "fp-ts/lib/Either";
import { Server } from "http";

export interface HasExpress {
  express: {
    app: EX.Express;
  };
}

export type Method = "post" | "get" | "put" | "patch" | "delete";

export interface Express {
  express: {
    withApp<R, E, A>(op: T.Effect<R & HasExpress, E, A>): T.Effect<R, E, A>;
    route<R, E, RES>(
      method: Method,
      path: string,
      f: (req: EX.Request) => T.Effect<R, E, RES>
    ): T.Effect<R & HasExpress, T.NoErr, void>;
    bind(
      port: number,
      hostname?: string
    ): T.Effect<HasExpress, T.NoErr, Server>;
  };
}

export const express: Express = {
  express: {
    route<R, E, RES>(
      method: Method,
      path: string,
      f: (req: EX.Request) => T.Effect<R, E, RES>
    ): T.Effect<R & HasExpress, T.NoErr, void> {
      return T.accessM((r: R & HasExpress) =>
        T.liftIO(() => {
          r.express.app[method](path, bodyParser.json(), (req, res) => {
            T.run(T.provide(r)(f(req)))().then(o => {
              if (isLeft(o)) {
                res.status(500).send(o.left);
              } else {
                res.send(o.right);
              }
            });
          });
        })
      );
    },
    withApp<R, E, A>(op: T.Effect<R & HasExpress, E, A>): T.Effect<R, E, A> {
      return T.provide<HasExpress>({ express: { app: newExpress() } })(op);
    },
    bind(
      port: number,
      hostname?: string
    ): T.Effect<HasExpress, T.NoErr, Server> {
      return T.accessM(({ express: { app } }: HasExpress) =>
        T.liftIO(() => {
          return app.listen(port, hostname);
        })
      );
    }
  }
};

export function withApp<R, E, A>(
  op: T.Effect<R & HasExpress, E, A>
): T.Effect<Express & R, E, A> {
  return T.accessM(({ express }: Express) => express.withApp(op));
}

export function route<R, E, RES>(
  method: Method,
  path: string,
  f: (req: EX.Request) => T.Effect<R, E, RES>
): T.Effect<R & HasExpress & Express, T.NoErr, void> {
  return T.accessM(({ express }: Express) => express.route(method, path, f));
}

export function bind(
  port: number,
  hostname?: string
): T.Effect<HasExpress & Express, T.NoErr, Server> {
  return T.accessM(({ express }: Express) => express.bind(port, hostname));
}
