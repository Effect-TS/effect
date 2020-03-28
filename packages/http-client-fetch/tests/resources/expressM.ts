import { effect as T, managed as M } from "@matechs/effect";
import express from "express";
import { left, right } from "fp-ts/lib/Either";
import { Server } from "http";

export const expressM = (port: number) =>
  M.bracket(
    T.async<Error, { app: express.Express; server: Server }>((r) => {
      const app = express();

      const server = app.listen(port, (err) => {
        if (err) {
          r(left(err));
        } else {
          r(
            right({
              app,
              server,
            })
          );
        }
      });

      return (cb) => {
        server.close((err) => {
          cb(err);
        });
      };
    }),
    ({ server }) =>
      T.async((r) => {
        server.close((err) => {
          if (err) {
            r(left(err));
          } else {
            r(right(undefined));
          }
        });

        return (cb) => {
          cb();
        };
      })
  );
