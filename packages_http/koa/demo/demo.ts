import * as KOA from "../src"

import * as RM from "./randomMessage"

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"
import * as M from "@matechs/core/Managed"

const routeA = KOA.route(
  "get",
  "/",
  T.pure(
    KOA.routeResponse(200)({
      message: "OK"
    })
  )
)

const routeB = KOA.route(
  "get",
  "/random-message",
  T.Do().bind("message", RM.hitMe()).return(KOA.routeResponse(200))
)

const routeC = KOA.route(
  "get",
  "/",
  T.pure(
    KOA.routeResponse(200)({
      message: "sub-OK"
    })
  )
)

const routeD = KOA.route(
  "get",
  "/random-message",
  T.Do()
    .bind("message", RM.hitMe())
    .return(({ message }) => KOA.routeResponse(200)({ message: `sub-${message}` }))
)

const mainR = T.sequenceT(routeA, routeB)
const subR = pipe(T.sequenceT(routeC, routeD), KOA.withSubRouter("/sub"))

const program = pipe(
  T.sequenceT(
    mainR,
    subR,
    KOA.middleware((ctx, next) => {
      ctx.set("X-Request-Id", "my-id")
      return next()
    })
  ),
  // keep process waiting
  T.chainTap(() => T.never),
  M.provide(KOA.managedKoa(8081)),
  T.fork
)

T.run(
  pipe(program, RM.provideRandomMessage, KOA.provideKoa),
  Ex.fold(
    (server) => {
      process.on("SIGINT", () => {
        T.runToPromise(server.interrupt).then((x) => {
          process.exit(Ex.isInterrupt(x) && x.errors ? 2 : 0)
        })
      })
      process.on("SIGTERM", () => {
        T.runToPromise(server.interrupt).then((x) => {
          process.exit(Ex.isInterrupt(x) && x.errors ? 2 : 0)
        })
      })
    },
    (e) => console.error(e),
    (e) => console.error(e),
    () => console.error("interrupted")
  )
)
