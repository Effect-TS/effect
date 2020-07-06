import * as S from "./server"

import * as T from "@matechs/core/Eff/Effect"
import * as L from "@matechs/core/Eff/Layer"
import { pipe } from "@matechs/core/Function"
import * as MO from "@matechs/morphic"

export const HasServer = T.has<S.Server>()()

const serverConfig = L.service(S.config(HasServer)).pure(
  new S.ServerConfig(8080, "0.0.0.0")
)

const appLayer = pipe(
  L.all(
    S.use(HasServer)("/home", () => (req, res, next) =>
      pipe(
        T.timed(next(req, res)),
        T.chain(([ms]) =>
          T.effectTotal(() => {
            console.log(`request took: ${ms} ms`)
          })
        )
      )
    ),
    S.route(HasServer)(
      "POST",
      "/person/:id",
      pipe(
        S.params(MO.make((F) => F.interface({ id: F.string() })))(({ id }) =>
          S.body(MO.make((F) => F.interface({ name: F.string() })))(
            ({ name }) => (_, res) =>
              T.effectTotal(() => {
                res.write(`id: ${id}\n`)
                res.write(`name: ${name}\n`)
                res.end()
              })
          )
        ),
        S.handleError((e) => (req, res) => {
          switch (e._tag) {
            case "JsonDecoding": {
              return T.effectTotal(() => {
                res.statusCode = 400
                res.setHeader("Content-Type", "application/json")
                res.write(JSON.stringify({ error: "invalid json body" }))
                res.end()
              })
            }
            default: {
              return e.render(req, res)
            }
          }
        })
      )
    ),
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
          res.write(b)
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
