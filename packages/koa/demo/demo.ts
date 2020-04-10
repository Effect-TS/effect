import { effect as T, exit as E } from "@matechs/effect";
import * as KOA from "../src";
import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";
import { sequenceT } from "fp-ts/lib/Apply";
import * as RM from "./randomMessage";

const program = KOA.withApp(
  Do(T.effect)
    .do(
      KOA.withRouter(
        sequenceT(T.effect)(
          KOA.route(
            "get",
            "/",
            T.pure(
              KOA.routeResponse(200, {
                message: "OK"
              })
            )
          ),
          KOA.route(
            "get",
            "/random-message",
            Do(T.effect)
              .bind("message", RM.hitMe())
              .return(({ message }) => KOA.routeResponse(200, { message }))
          ),
          KOA.withSubRouter(
            "/sub",
            sequenceT(T.effect)(
              KOA.route(
                "get",
                "/",
                T.pure(
                  KOA.routeResponse(200, {
                    message: "sub-OK"
                  })
                )
              ),
              KOA.route(
                "get",
                "/random-message",
                Do(T.effect)
                  .bind("message", RM.hitMe())
                  .return(({ message }) => KOA.routeResponse(200, { message: `sub-${message}` }))
              )
            )
          )
        )
      )
    )
    .bind("server", KOA.bind(8081))
    .return((s) => s.server)
);

const envLive = pipe(T.noEnv, T.mergeEnv(KOA.koa));

T.run(
  T.provideAll(envLive)(pipe(program, RM.provideRandomMessage)),
  E.fold(
    (server) => {
      process.on("SIGINT", () => {
        server.close((err) => {
          process.exit(err ? 2 : 0);
        });
      });
      process.on("SIGTERM", () => {
        server.close((err) => {
          process.exit(err ? 2 : 0);
        });
      });
    },
    (e) => console.error(e),
    (e) => console.error(e),
    () => console.error("interrupted")
  )
);
