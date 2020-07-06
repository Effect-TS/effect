import * as S from "./server"

import * as T from "@matechs/core/Eff/Effect"
import * as L from "@matechs/core/Eff/Layer"
import { pipe } from "@matechs/core/Function"
import * as MO from "@matechs/morphic"

export const HasServer = T.has<S.Server>()()

const serverConfig = L.service(S.config(HasServer)).pure(
  new S.ServerConfig(8080, "0.0.0.0")
)

//
// Person Post Endpoint
//

const personPostParams = MO.make((F) => F.interface({ id: F.string() }))

const personPostBody = MO.make((F) => F.interface({ name: F.string() }))

const personPostResponse = MO.make((F) =>
  F.interface({ id: F.string(), name: F.string() })
)

const personPost = S.route(HasServer)(
  "POST",
  "/person/:id",
  pipe(
    S.params(personPostParams)(({ id }) =>
      S.body(personPostBody)(({ name }) => S.response(personPostResponse)({ id, name }))
    ),
    T.catchAll((e) => {
      switch (e._tag) {
        case "JsonDecoding": {
          return S.accessRouteInputM((i) =>
            T.effectTotal(() => {
              i.res.statusCode = 400
              i.res.setHeader("Content-Type", "application/json")
              i.res.write(JSON.stringify({ error: "invalid json body" }))
              i.res.end()
            })
          )
        }
        default: {
          return e.render()
        }
      }
    })
  )
)

const middle = S.use(HasServer)(
  "/home",
  pipe(
    T.timed(S.accessRouteInputM((i) => i.next(i.req, i.res))),
    T.chain(([ms]) =>
      T.effectTotal(() => {
        console.log(`request took: ${ms} ms`)
      })
    )
  )
)

const homeGet = S.route(HasServer)(
  "GET",
  "/home",
  T.accessServiceM(S.config(HasServer))((config) =>
    S.accessRouteInputM((input) =>
      T.effectTotal(() => {
        input.res.write(`good: ${config.host}:${config.port}`)
        input.res.end()
      })
    )
  )
)

const homePost = S.route(HasServer)(
  "POST",
  "/home",
  S.getBody((b) =>
    S.accessRouteInputM((input) =>
      T.effectTotal(() => {
        input.res.write(b)
        input.res.end()
      })
    )
  )
)

const appLayer = pipe(
  L.all(middle, personPost, homeGet, homePost),
  L.using(S.server(HasServer)),
  L.using(serverConfig)
)

const cancel = pipe(T.never, T.provideSomeLayer(appLayer), T.runMain)

process.on("SIGINT", () => {
  cancel()
})
