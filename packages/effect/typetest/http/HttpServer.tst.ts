import { Context, Effect } from "effect"
import type { Scope } from "effect"
import type { HttpServer } from "effect/http"
import { HttpServerResponse } from "effect/http"
import { describe, expect, it } from "tstyche"

class Config extends Context.Service<Config, { readonly enabled: boolean }>()("Config") {}

declare const server: HttpServer.HttpServer["Service"]

describe("HttpServer", () => {
  it("serve retains middleware services", () => {
    const middleware = <E, R>(app: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>) =>
      Effect.flatMap(Config, () => app)
    expect(server.serve(Effect.succeed(HttpServerResponse.empty()), middleware)).type.toBe<
      Effect.Effect<void, never, Config | Scope.Scope>
    >()
  })
})
