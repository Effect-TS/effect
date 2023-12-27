import * as HttpC from "@effect/platform-node/HttpClient"
import * as Http from "@effect/platform-node/HttpServer"
import * as Client from "@effect/rpc-http/Client"
import * as Router from "@effect/rpc-http/Router"
import * as RS from "@effect/rpc-http/Schema"
import * as _ from "@effect/rpc-http/Server"
import * as S from "@effect/schema/Schema"
import { Layer } from "effect"
import * as Effect from "effect/Effect"
import { createServer } from "http"
import { assert, describe, it } from "vitest"

const schema = RS.make({
  greet: {
    input: S.string,
    output: S.string,
    error: S.never
  },

  headers: {
    output: S.record(S.string, S.string)
  }
})

const router = Router.make(schema, {
  greet: (name) => Effect.succeed(`Hello, ${name}!`),
  headers: Effect.map(Http.request.ServerRequest, (request) => request.headers)
})

const HttpLive = Http.server.serve(_.make(router))
const ServerLive = Http.server.layer(createServer, { port: 0 })
const serverPort = Http.server.Server.pipe(Effect.map((_) => (_.address as Http.server.TcpAddress).port))

describe("Server", () => {
  it("e2e", () =>
    Effect.gen(function*(_) {
      const port = yield* _(serverPort)

      yield* _(Effect.fork(Layer.launch(HttpLive)))
      yield* _(Effect.yieldNow())

      const client = Client.make(
        schema,
        HttpC.client.fetch().pipe(
          HttpC.client.mapRequest(HttpC.request.prependUrl(`http://localhost:${port}`)),
          HttpC.client.mapRequest(HttpC.request.setHeader("x-foo", "bar"))
        )
      )

      const headers = yield* _(client.headers)
      assert.strictEqual(headers["x-foo"], "bar")
    }).pipe(
      Effect.provide(ServerLive),
      Effect.runPromise
    ), 10000)
})
