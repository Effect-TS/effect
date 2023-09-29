import * as _ from "@effect/rpc-http/Server"
import * as Router from "@effect/rpc/Router"
import * as RS from "@effect/rpc/Schema"
import * as S from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"

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

  headers: Effect.map(_.HttpRequest, (request) => Object.fromEntries(request.headers))
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
            traceId: "native"
          }
        ]
      })
    )

    expect(result).toEqual([{ _tag: "Success", value: { "x-foo": "bar" } }])
  })
})
