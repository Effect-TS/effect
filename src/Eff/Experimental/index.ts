import { pipe } from "../../Function"
import * as T from "../Effect"
import * as L from "../Layer"

import * as S from "./server"

export const HasServer = T.has<S.Server>()()

const serverConfig = L.service(S.config(HasServer)).pure(
  new S.ServerConfig(8080, "0.0.0.0")
)

const appLayer = pipe(
  L.all(
    S.route(HasServer)("GET", "/home", () => (_, res) =>
      T.accessServiceM(S.config(HasServer))((c) =>
        T.effectTotal(() => {
          res.write(`good: ${c.host}:${c.port}`)
          res.end()
        })
      )
    ),
    S.route(HasServer)("POST", "/home", () =>
      S.getBody((b) => (_, res) =>
        T.effectTotal(() => {
          res.write(b.toString())
          res.end()
        })
      )
    )
  ),
  L.using(S.server(HasServer)),
  L.using(serverConfig)
)

const cancel = pipe(T.never, T.provideSomeLayer(appLayer), T.runMain)

process.on("SIGINT", () => {
  cancel()
})
