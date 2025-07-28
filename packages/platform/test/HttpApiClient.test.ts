import { describe, expect, it } from "@effect/vitest"

import {
  HttpApi,
  HttpApiBuilder,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiMiddleware
} from "@effect/platform"
import { Deferred, Effect, Layer, Random, Schema } from "effect"

const HelloWorldEndpoint = HttpApiEndpoint.get("hello-world")`/`.addSuccess(Schema.String)
const RandomNumberEndpoint = HttpApiEndpoint.get("random-number")`/random`
  .addSuccess(Schema.Number)
  .addError(HttpApiError.InternalServerError)

class MyApi extends HttpApi.make("MyApi").add(
  HttpApiGroup.make("group", { topLevel: true }).add(HelloWorldEndpoint).add(RandomNumberEndpoint)
) {}

const MockGreetingsHandler = HttpApiBuilder.handler(
  MyApi,
  "group",
  "hello-world",
  Effect.fn(function*({ request: _request }) {
    return "Hello, World!"
  })
)

const MockRandomNumberHandler = HttpApiBuilder.handler(
  MyApi,
  "group",
  "random-number",
  Effect.fn(function*({ request: _request }) {
    return yield* Random.nextIntBetween(1, 1000000)
  })
)

const HttpApiGroupMocked = HttpApiBuilder.group(
  MyApi,
  "group",
  (handlers) => handlers.handle("hello-world", MockGreetingsHandler).handle("random-number", MockRandomNumberHandler)
)

describe("Should create mock HttpApi clients with handlers", () => {
  it.scoped("Setting random on the group layer", () =>
    Effect.gen(function*() {
      const rng = Layer.setRandom(Random.fixed([2]))
      const fixedGroupHandler = HttpApiGroupMocked.pipe(Layer.merge(rng))
      const client = yield* HttpApiClient.makeMocked(MyApi, Layer.empty, fixedGroupHandler)
      const result = yield* client["random-number"]()
      expect(result).toEqual(2)
    }))

  it.scoped("Setting random on the handler effect", () =>
    Effect.gen(function*() {
      const rng = Layer.setRandom(Random.fixed([4]))
      const fixedGroupHandler = HttpApiBuilder.group(MyApi, "group", (handlers) =>
        handlers
          .handle("hello-world", MockGreetingsHandler)
          .handle("random-number", (request) => Effect.provide(MockRandomNumberHandler(request), rng)))
      const client = yield* HttpApiClient.makeMocked(MyApi, Layer.empty, fixedGroupHandler)
      const result = yield* client["random-number"]()
      expect(result).toEqual(4)
    }))

  it.scoped("Middleware", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number>()
      class Middleware extends HttpApiMiddleware.Tag<Middleware>()("middleware") {}
      class MyApiWithMiddleware extends MyApi.middleware(Middleware) {}
      const MiddlewareLive = Layer.succeed(Middleware, Deferred.succeed(deferred, 6))
      const client = yield* HttpApiClient.makeMocked(
        MyApiWithMiddleware,
        MiddlewareLive,
        HttpApiGroupMocked
      )
      yield* client["hello-world"]()
      const result = yield* Deferred.await(deferred)
      expect(result).toEqual(6)
    }))
})
