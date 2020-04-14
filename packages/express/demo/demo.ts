import { effect as T, exit as E } from "@matechs/effect";
import * as EX from "../src";
import { Do } from "fp-ts-contrib/lib/Do";

const program = EX.withApp(
  Do(T.effect)
    .do(
      EX.route(
        "get",
        "/",
        T.pure(
          EX.routeResponse(200, {
            message: "OK"
          })
        )
      )
    )
    .bind("server", EX.bind(8081))
    .return((s) => s.server)
);

T.run(
  T.provideS(EX.express)(program),
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
