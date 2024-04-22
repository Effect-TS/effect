import { FileSystem, HttpClient, HttpServer, Path } from "@effect/platform"
import * as Endpoint from "@effect/platform/Http/Endpoint"
import { Schema } from "@effect/schema"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"

class GetUserById extends Schema.TaggedRequest<GetUserById>()(
  "GetUserById",
  Schema.Never,
  Schema.Any,
  {
    id: Endpoint.PathParam("id", Schema.NumberFromString),
    page: Schema.optional(Endpoint.Header("x-page", Schema.NumberFromString)),
    body: Endpoint.BodyJson(Schema.Struct({
      name: Schema.String,
      age: Schema.Number
    })),
    cached: Schema.optional(Endpoint.UrlParam("cached", Schema.Literal("true", "false")))
  },
  Endpoint.annotations({
    path: "/users/:id",
    method: "POST"
  })
) {}

const EnvLive = FileSystem.layerNoop({}).pipe(
  Layer.merge(Path.layer)
)

describe("Endpoint", () => {
  describe("encodeRequest", () => {
    it.effect("correctly encodes a request", () =>
      Effect.gen(function*(_) {
        const request = yield* _(
          Endpoint.encodeRequest(
            new GetUserById({
              id: 123,
              page: 1,
              cached: "true",
              body: {
                name: "John",
                age: 30
              }
            })
          )
        )
        assert.deepStrictEqual(
          request,
          HttpClient.request.post("/users/123", {
            headers: {
              "x-page": "1"
            },
            urlParams: {
              cached: "true"
            },
            body: HttpClient.body.unsafeJson({
              name: "John",
              age: 30
            })
          })
        )
      }))
  })

  describe("decodeRequest", () => {
    it.effect("correctly decodes a request", () =>
      Effect.gen(function*(_) {
        const decode = Endpoint.decodeRequest(GetUserById)
        const effect = decode(
          HttpServer.request.fromWeb(
            new Request("http://localhost:3000/api/123", {
              method: "POST",
              body: JSON.stringify({
                name: "John",
                age: 30
              }),
              headers: {
                "x-page": "1"
              }
            })
          ),
          {
            searchParams: {
              cached: "true"
            },
            params: {
              id: "123"
            }
          } as any
        )
        const request = yield* _(effect)
        assert.deepStrictEqual(
          request,
          new GetUserById({
            id: 123,
            page: 1,
            body: {
              name: "John",
              age: 30
            },
            cached: "true"
          })
        )
      }).pipe(Effect.scoped, Effect.provide(EnvLive)))
  })
})
