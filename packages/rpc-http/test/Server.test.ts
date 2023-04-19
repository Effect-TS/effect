import * as Effect from "@effect/io/Effect"
import * as S from "@effect/schema/Schema"
import * as RS from "@effect/rpc/Schema"
import * as Server from "@effect/rpc/Server"
import * as _ from "@effect/rpc-http/Server"
import { describe, it, expect } from "vitest"

const schema = RS.make({
  greet: {
    input: S.string,
    output: S.string,
    error: S.never,
  },

  headers: {
    output: S.record(S.string, S.string),
  },
})

const router = Server.router(schema, {
  greet: (name) => Effect.succeed(`Hello, ${name}!`),

  headers: Effect.map(_.HttpRequest, (request) =>
    Object.fromEntries(request.headers),
  ),
})

const handler = _.make(router)

describe("Server", () => {
  it("handler/", () => {
    const result = Effect.runSync(
      handler({
        url: "/",
        headers: new Headers({ "x-foo": "bar" }),
        body: [
          {
            _tag: "headers",
            spanName: "RpcClient.headers",
            spanId: "123",
            traceId: "native",
          },
        ],
      }),
    )

    expect(result).toEqual([{ _tag: "Right", right: { "x-foo": "bar" } }])
  })
})
