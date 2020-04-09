import { effect as T, exit as E } from "@matechs/effect";
import * as KOA from "../src";
import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";

const program = KOA.withApp(
  Do(T.effect)
    .do(
      KOA.router(R => Do(T.effect)
        .do(R.route(
          "get",
          "/",
          T.pure(
            KOA.routeResponse(200, {
              message: "OK"
            })
          )))
        .do(R.route(
          "get",
          "/test2",
          T.pure(
            KOA.routeResponse(200, {
              message: "OK"
            })
          ))
        )
        .return(() => void 0)
      )
    )
    .bind("server", KOA.bind(8081))
    .return(s => s.server)
);

const envLive = pipe(T.noEnv, T.mergeEnv(KOA.koa));

T.run(
  T.provideAll(envLive)(program),
  E.fold(
    server => {
      process.on("SIGINT", () => {
        server.close(err => {
          process.exit(err ? 2 : 0);
        });
      });
      process.on("SIGTERM", () => {
        server.close(err => {
          process.exit(err ? 2 : 0);
        });
      });
    },
    e => console.error(e),
    e => console.error(e),
    () => console.error("interrupted")
  )
);
