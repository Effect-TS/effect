import * as EX from "../src"

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"

const program = EX.withApp(
  T.Do()
    .do(
      EX.route(
        "get",
        "/",
        T.pure(
          EX.routeResponse(200)({
            message: "OK"
          })
        )
      )
    )
    .bind("server", EX.bind(8081))
    .return((s) => s.server)
)

T.run(
  T.provide(EX.express)(program),
  Ex.fold(
    (server) => {
      process.on("SIGINT", () => {
        server.close((err) => {
          process.exit(err ? 2 : 0)
        })
      })
      process.on("SIGTERM", () => {
        server.close((err) => {
          process.exit(err ? 2 : 0)
        })
      })
    },
    (e) => console.error(e),
    (e) => console.error(e),
    () => console.error("interrupted")
  )
)
