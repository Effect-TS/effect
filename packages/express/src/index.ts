import newExpress from "express";
import { effect as T } from "@matechs/effect";
import * as EX from "express";
import * as bodyParser from "body-parser";
import { Server } from "http";
import * as G from "@matechs/graceful";
import { Do } from "fp-ts-contrib/lib/Do";
import { ExitTag } from "waveguide/lib/exit";

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
    ): T.Effect<HasExpress & G.Graceful, T.NoErr, Server>;
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
        T.sync(() => {
          r.express.app[method](path, bodyParser.json(), (req, res) => {
            T.runToPromiseExit(T.provideAll(r)(f(req))).then(o => {
              switch (o._tag) {
                case ExitTag.Done:
                  res.send(o.value);
                  return;
                case ExitTag.Raise:
                  res.status(500).send(o.error);
                  return;
                case ExitTag.Interrupt:
                  res.status(500).send({
                    status: "interrupted"
                  });
                  return;
                case ExitTag.Abort:
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
        express: { ...r["express"], app: newExpress() }
      }))(op);
    },
    bind(
      port: number,
      hostname?: string
    ): T.Effect<HasExpress & G.Graceful, T.NoErr, Server> {
      return T.accessM(({ express: { app } }: HasExpress) =>
        Do(T.effect)
          .bindL("s", () =>
            T.sync(() => {
              return app.listen(port, hostname || "0.0.0.0");
            })
          )
          .doL(({ s }) =>
            G.onExit(
              T.sync(() => {
                s.close();
              })
            )
          )
          .return(s => s.s)
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
): T.Effect<HasExpress & Express & G.Graceful, T.NoErr, Server> {
  return T.accessM(({ express }: Express) => express.bind(port, hostname));
}
