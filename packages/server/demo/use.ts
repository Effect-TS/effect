import * as http from "../src"

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

export const mainServer = http.makeServer(T.has<http.Server>()("api"))
export const internalServer = http.makeServer(T.has<http.Server>()("internal"))

export const serverConfig = L.service(mainServer.hasConfig).pure(
  http.serverConfig({
    host: "0.0.0.0",
    port: 8080
  })
)

export const internalServerConfig = L.service(internalServer.hasConfig).pure(
  http.serverConfig({
    host: "127.0.0.1",
    port: 8081
  })
)

export const currentUser = http.makeState<O.Option<string>>(O.none)

//
// Cors Middleware
//

export const cors = http.middleware((next) =>
  pipe(
    http.getRequestContext,
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

export const customErrorResponse = http.response(
  MO.make((F) => F.interface({ error: F.string() }))
)

export const customErrorHandler = T.catchAll((e: http.RequestError) => {
  switch (e._tag) {
    case "JsonDecoding": {
      return pipe(
        customErrorResponse({ error: "invalid json body" }),
        T.first(http.status(400))
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

export const authMiddleware = mainServer.use("(.*)", (next) =>
  pipe(
    T.of,
    T.tap(() => currentUser.set(O.some("test"))),
    T.bind("next", () => T.timed(next)),
    T.bind("routeInput", () => http.getRequestContext),
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

export const getPersonPostParams = http.params(
  MO.make((F) => F.interface({ id: F.string() }))
)

export const getPersonPostBody = http.body(
  MO.make((F) => F.interface({ name: F.string() }))
)

export const personPostResponse = http.response(
  MO.make((F) => F.interface({ id: F.string(), name: F.string() }))
)

export const personPost = mainServer.route("POST", "/person/:id", () =>
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

export const homeChildRouter = mainServer.child("/home/(.*)")

//
// Home /a GET
//

export const homeGet = mainServer.route("GET", "/home/a", () =>
  pipe(
    T.of,
    T.bind("config", () => mainServer.getServerConfig),
    T.bind("routeInput", () => http.getRequestContext),
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

export const getHomePostQuery = http.query(
  MO.make((F) =>
    F.partial({
      q: numberString(F)
    })
  )
)

export const homePost = mainServer.route("POST", "/home/b", () =>
  pipe(
    T.of,
    T.bind("body", () => http.getBodyBuffer),
    T.bind("query", () => getHomePostQuery),
    T.bind("user", () => currentUser.get),
    T.bind("input", () => http.getRequestContext),
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

export const internalRoute = internalServer.route("GET", "/", () =>
  pipe(
    http.getRequestContext,
    T.chain((rc) =>
      T.effectTotal(() => {
        rc.res.statusCode = 200
        rc.res.write(JSON.stringify({ internal: true }))
        rc.res.end()
      })
    )
  )
)

//
// App Layer with all the routes, middlewared, the server & the server config
//

export const home = L.using(homeChildRouter)(L.all(homeGet, homePost))

export const appLayer = pipe(
  L.all(home, personPost, internalRoute),
  L.using(authMiddleware),
  L.using(mainServer.use("(.*)", cors)),
  L.using(L.all(mainServer.server, internalServer.server)),
  L.using(L.all(serverConfig, internalServerConfig)),
  L.main
)
