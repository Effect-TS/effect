import * as H from "../src"

import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"
import * as T from "@matechs/core/next/Effect"
import * as L from "@matechs/core/next/Layer"
import * as MO from "@matechs/morphic"
import { Codec, failure, success } from "@matechs/morphic/model"

//
// Custom codec
//

export const numberString = MO.make((F) =>
  MO.customCodec(F.number())(
    () =>
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
        (n) => n.toString()
      )
  )(F)
)

//
// Server config
//

export const serverConfig = L.service(H.hasConfig).pure(
  H.serverConfig({
    host: "0.0.0.0",
    port: 8080
  })
)

export const internalServerConfig = L.service(H.hasConfig).pure(
  H.serverConfig({
    host: "127.0.0.1",
    port: 8081
  })
)

export const currentUser = H.makeState<O.Option<string>>(O.none)

//
// Cors Middleware
//

export const cors = H.middleware((next) =>
  pipe(
    H.getRequestContext,
    T.tap(({ req, res }) =>
      T.effectTotal(() => {
        res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*")
      })
    ),
    T.chain(() => next)
  )
)

//
// Custom Error Handler
//

export const customErrorResponse = H.response(
  MO.make((F) => F.interface({ error: F.string() }))
)

export const customErrorHandler = T.catchAll((e: H.RequestError) => {
  switch (e._tag) {
    case "JsonDecoding": {
      return pipe(
        customErrorResponse({ error: "invalid json body" }),
        T.first(H.status(400))
      )
    }
    default: {
      return e.render()
    }
  }
})

//
// Auth Middleware
//

export const authMiddleware = H.use("(.*)", (next) =>
  pipe(
    T.of,
    T.tap(() => currentUser.set(O.some("test"))),
    T.bind("next", () => T.timed(next)),
    T.bind("routeInput", () => H.getRequestContext),
    T.chain(({ next: [ms], routeInput: { query } }) =>
      T.effectTotal(() => {
        console.log(`request took: ${ms} ms (${query})`)
      })
    )
  )
)

//
// Person Post Endpoint
//

export const getPersonPostParams = H.params(
  MO.make((F) => F.interface({ id: F.string() }))
)

export const getPersonPostBody = H.body(
  MO.make((F) => F.interface({ name: F.string() }))
)

export const personPostResponse = H.response(
  MO.make((F) => F.interface({ id: F.string(), name: F.string() }))
)

export const personPost = H.route("POST", "/person/:id", () =>
  pipe(
    T.of,
    T.bind("params", () => getPersonPostParams),
    T.bind("body", () => getPersonPostBody),
    T.chain(({ body: { name }, params: { id } }) => personPostResponse({ id, name })),
    customErrorHandler
  )
)

//
// Home Child Router
//

export const homeChildRouter = H.child("/home/(.*)")

//
// Home /a GET
//

export const homeGet = H.route("GET", "/home/a", () =>
  pipe(
    T.of,
    T.bind("config", () => H.getServerConfig),
    T.bind("routeInput", () => H.getRequestContext),
    T.chain(({ config, routeInput: { res } }) =>
      T.effectTotal(() => {
        res.write(`good: ${config.host}:${config.port}`)
        res.end()
      })
    )
  )
)

//
// Home /b POST
//

export const getHomePostQuery = H.query(
  MO.make((F) =>
    F.partial({
      q: numberString(F)
    })
  )
)

export const homePost = H.route("POST", "/home/b", () =>
  pipe(
    T.of,
    T.bind("body", () => H.getBodyBuffer),
    T.bind("query", () => getHomePostQuery),
    T.bind("user", () => currentUser.get),
    T.bind("input", () => H.getRequestContext),
    T.tap(({ body, input: { res }, query, user }) =>
      T.effectTotal(() => {
        res.write(body)
        res.write(JSON.stringify(query))
        res.write(JSON.stringify(user))
        res.end()
      })
    )
  )
)

//
// Internal server route
//

export const internalRoute = H.route("GET", "/", () =>
  pipe(
    H.getRequestContext,
    T.chain((rc) =>
      T.effectTotal(() => {
        rc.res.statusCode = 200
        rc.res.write(JSON.stringify({ internal: true }))
        rc.res.end()
      })
    ),
    cors
  )
)

//
// App Layer with all the routes, middlewared, the server & the server config
//

export const home = L.using(homeChildRouter)(L.all(homeGet, homePost))

export const apiEnv = T.region<"api", H.ServerEnv>()
export const internalEnv = T.region<"internal", H.ServerEnv>()

export class Foo {
  readonly _tag = "Foo"
}

export const HasFoo = T.has(Foo)

export const appServerLayer = pipe(
  L.all(home, personPost),
  L.using(authMiddleware),
  L.using(H.use("(.*)", cors)),
  L.using(H.server),
  L.using(serverConfig),
  L.region(apiEnv)
)

export const internalServerLayer = pipe(
  internalRoute,
  L.using(H.server),
  L.using(internalServerConfig),
  L.region(internalEnv)
)

export const appLayer = pipe(L.all(appServerLayer, internalServerLayer), L.main)
