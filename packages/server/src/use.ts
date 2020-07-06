import { makeServer, RequestError, Server, ServerConfig } from "./"

import * as T from "@matechs/core/Eff/Effect"
import * as L from "@matechs/core/Eff/Layer"
import { pipe } from "@matechs/core/Function"
import * as MO from "@matechs/morphic"
import { HKT2 } from "@matechs/morphic-alg/utils/hkt"
import { AlgebraNoUnion } from "@matechs/morphic/batteries/program"
import { Codec, failure, success } from "@matechs/morphic/model"

export const S = makeServer(T.has<Server>()())

const serverConfig = L.service(S.config).pure(new ServerConfig(8080, "0.0.0.0"))

//
// Person Post Endpoint
//

const personPostParams = MO.make((F) => F.interface({ id: F.string() }))

const personPostBody = MO.make((F) => F.interface({ name: F.string() }))

const personPostResponse = MO.make((F) =>
  F.interface({ id: F.string(), name: F.string() })
)

const customErrorMessage = MO.make((F) => F.interface({ error: F.string() }))

const customErrorHandler = T.catchAll((e: RequestError) => {
  switch (e._tag) {
    case "JsonDecoding": {
      return pipe(
        customErrorMessage,
        S.response({ error: "invalid json body" }),
        T.first(S.status(400))
      )
    }
    default: {
      return e.render()
    }
  }
})

export const personPost = S.route(
  "POST",
  "/person/:id",
  pipe(
    personPostParams,
    S.params(({ id }) =>
      pipe(
        personPostBody,
        S.body(({ name }) => S.response_(personPostResponse, { id, name }))
      )
    ),
    customErrorHandler
  )
)

export const middle = S.use(
  "/(.*)",
  pipe(
    S.next,
    T.timed,
    T.chain(([ms]) =>
      S.accessRouteInputM((i) =>
        T.effectTotal(() => {
          console.log(`request took: ${ms} ms (${i.query})`)
        })
      )
    )
  )
)

export const homeGet = S.route(
  "GET",
  "/home/a",
  S.accessConfigM((config) =>
    S.accessRouteInputM((input) =>
      T.effectTotal(() => {
        input.res.write(`good: ${config.host}:${config.port}`)
        input.res.end()
      })
    )
  )
)

export const homePost = S.route(
  "POST",
  "/home/b",
  S.getBody((b) =>
    pipe(
      MO.make((F) =>
        F.partial({
          q: numberString(F)
        })
      ),
      S.query((q) =>
        S.accessRouteInputM((input) =>
          T.effectTotal(() => {
            input.res.write(b)
            input.res.write(JSON.stringify(q))
            input.res.end()
          })
        )
      )
    )
  )
)

//
// App Layer with all the routes & the server
//

const home = pipe(L.all(homeGet, homePost), L.using(S.child("/home/(.*)")))

const appLayer = pipe(
  L.all(home, middle, personPost),
  L.using(S.server),
  L.using(serverConfig)
)

const cancel = pipe(T.never, T.provideSomeLayer(appLayer), T.runMain)

process.on("SIGINT", () => {
  cancel()
})

function numberString<G, Env>(F: AlgebraNoUnion<G, Env>): HKT2<G, Env, string, number> {
  return F.unknownE(F.number(), {
    conf: {
      [MO.ModelURI]: () =>
        new Codec(
          "numberString",
          (i, c) => {
            if (typeof i === "string") {
              try {
                const n = parseFloat(i)

                if (isNaN(n)) {
                  return failure(i, c)
                }

                return success(n)
              } catch {
                return failure(i, c)
              }
            } else {
              return failure(i, c)
            }
          },
          (u) => (u as number).toString()
        )
    }
  }) as HKT2<G, Env, string, number>
}
