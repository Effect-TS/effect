import { effect as T, managed as M, exit as E } from "@matechs/effect";
import * as KOA from "../src";
import { Do } from "fp-ts-contrib/lib/Do";
import { pipe } from "fp-ts/lib/pipeable";
import { sequenceT } from "fp-ts/lib/Apply";
import * as RM from "./randomMessage";

const routeA = KOA.route(
  "get",
  "/",
  T.pure(
    KOA.routeResponse(200, {
      message: "OK"
    })
  )
);

const routeB = KOA.route(
  "get",
  "/random-message",
  Do(T.effect)
    .bind("message", RM.hitMe())
    .return(({ message }) => KOA.routeResponse(200, { message }))
);

const routeC = KOA.route(
  "get",
  "/",
  T.pure(
    KOA.routeResponse(200, {
      message: "sub-OK"
    })
  )
);

const routeD = KOA.route(
  "get",
  "/random-message",
  Do(T.effect)
    .bind("message", RM.hitMe())
    .return(({ message }) => KOA.routeResponse(200, { message: `sub-${message}` }))
);

const mainR = sequenceT(T.effect)(routeA, routeB);
const subR = pipe(sequenceT(T.effect)(routeC, routeD), KOA.withSubRouter("/sub"));

const program = pipe(
  sequenceT(T.effect)(mainR, subR),
  // keep process waiting
  T.chainTap(() => T.never),
  M.provideS(KOA.managedKoa(8081)),
  T.fork
);

T.run(
  pipe(
    program,
    RM.provideRandomMessage,
    KOA.provideKoa((app) => app.use((ctx, next) => { ctx.set("X-Request-Id", "my-id"); return next() }))
  ),
  E.fold(
    (server) => {
      process.on("SIGINT", () => {
        T.runToPromise(server.interrupt).then(({ error }) => {
          process.exit(error ? 2 : 0);
        });
      });
      process.on("SIGTERM", () => {
        T.runToPromise(server.interrupt).then(({ error }) => {
          process.exit(error ? 2 : 0);
        });
      });
    },
    (e) => console.error(e),
    (e) => console.error(e),
    () => console.error("interrupted")
  )
);
