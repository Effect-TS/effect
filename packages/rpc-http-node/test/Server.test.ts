import * as HttpC from "@effect/platform/HttpClient"
import * as Client from "@effect/rpc-http-node/Client"
import * as Router from "@effect/rpc-http-node/Router"
import * as _ from "@effect/rpc-http-node/Server"
import * as RpcSchema from "@effect/rpc/Schema"
import * as S from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Http from "node:http"
import { describe, expect, it } from "vitest"

const schema = RpcSchema.make({
  greet: {
    input: S.string,
    output: S.string,
    error: S.never
  }
})

const router = Router.make(schema, {
  greet: (name) => Effect.succeed(`Hello, ${name}!`)
})

const handler = _.make(router)

describe("Server", () => {
  it("e2e", () =>
    pipe(
      Effect.acquireRelease(
        Effect.async<never, never, Http.Server>((resume) => {
          const server = Http.createServer((req, res) => Effect.runFork(handler(req, res)))
          server.listen(() => resume(Effect.succeed(server)))
        }),
        (server) => Effect.sync(() => server.close())
      ),
      Effect.map((server) => {
        const port = (server.address() as any).port as number
        return Client.make(
          schema,
          HttpC.client.fetch().pipe(
            HttpC.client.mapRequest(HttpC.request.prependUrl(`http://127.0.0.1:${port}`))
          )
        )
      }),
      Effect.flatMap((client) => client.greet("World")),
      Effect.tap((greeting) => Effect.sync(() => expect(greeting).toBe("Hello, World!"))),
      Effect.scoped,
      Effect.runPromise
    ))
})
