import { FileSystem, HttpClient, HttpServer as Http, Path } from "@effect/platform"
import { Schema } from "@effect/schema"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"

const PositiveInt = Schema.NumberFromString.pipe(Schema.positive(), Schema.int())

const Pagination = Schema.Struct({
  page: Schema.optional(Http.endpoint.Header("x-page", PositiveInt), { default: () => 1 })
})

class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String
}) {}

class GetUserById extends Schema.TaggedRequest<GetUserById>()(
  "GetUserById",
  Schema.Never,
  User,
  {
    id: Http.endpoint.PathParam("id", Schema.NumberFromString),
    pagination: Pagination,
    body: Http.endpoint.BodyJson(Schema.Struct({
      name: Schema.String,
      age: Schema.Number
    })),
    search: Http.endpoint.UrlParams(Schema.Struct({
      cached: Schema.optional(Schema.Literal("true", "false"))
    }))
  },
  Http.endpoint.annotations({
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
          Http.endpoint.toClientRequest(
            new GetUserById({
              id: 123,
              pagination: {
                page: 1
              },
              search: {
                cached: "true"
              },
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
        const decode = Http.endpoint.parse(GetUserById).decodeServerRequest
        const effect = decode(
          Http.request.fromWeb(
            new Request("http://localhost:3000/api/123", {
              method: "POST",
              body: JSON.stringify({
                name: "John",
                age: 30
              }),
              headers: {
                "x-page": "2"
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
            pagination: {
              page: 2
            },
            body: {
              name: "John",
              age: 30
            },
            search: {
              cached: "true"
            }
          })
        )
      }).pipe(Effect.scoped, Effect.provide(EnvLive)))
  })

  describe("parse", () => {
    it("parses", () => {
      const parsed = Http.endpoint.parse(GetUserById)
      // TODO
      console.log(parsed)
    })
  })
})
