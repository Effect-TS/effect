import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Layer, Path, Schema } from "effect"
import { Etag, HttpPlatform, HttpRouter } from "effect/http"
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiTest,
  OpenApi
} from "effect/http-api"

const TestServices = Layer.mergeAll(
  Path.layer,
  Etag.layerWeak,
  HttpPlatform.layer
).pipe(Layer.provideMerge(FileSystem.layerNoop({})))

const fetchWith = async (
  app: Layer.Layer<
    never,
    never,
    HttpRouter.HttpRouter | Etag.Generator | FileSystem.FileSystem | HttpPlatform.HttpPlatform | Path.Path
  >,
  path: string
): Promise<Response> => {
  const { dispose, handler } = HttpRouter.toWebHandler(app.pipe(Layer.provide(TestServices)), {
    disableLogger: true
  })
  try {
    return await handler(new Request(`http://localhost${path}`))
  } finally {
    await dispose()
  }
}

class OutOfCredit extends HttpApiError.Problem<OutOfCredit>("OutOfCredit")(
  { type: "https://example.com/probs/out-of-credit", status: 403, title: "You do not have enough credit." },
  { balance: Schema.Number }
) {}

const PurchaseApi = HttpApi.make("Api").add(
  HttpApiGroup.make("test").add(
    HttpApiEndpoint.get("purchase", "/purchase", { success: Schema.String, error: OutOfCredit })
  )
)
const PurchaseGroup = HttpApiBuilder.group(
  PurchaseApi,
  "test",
  (handlers) => handlers.handle("purchase", () => Effect.fail(new OutOfCredit({ balance: 30 })))
)

describe("HttpApiError.Problem", () => {
  it("responds with the declared status and a problem+json body", async () => {
    const response = await fetchWith(HttpApiBuilder.layer(PurchaseApi).pipe(Layer.provide(PurchaseGroup)), "/purchase")
    assert.strictEqual(response.status, 403)
    assert.strictEqual(response.headers.get("content-type"), "application/problem+json")
    assert.deepStrictEqual(await response.json(), {
      type: "https://example.com/probs/out-of-credit",
      status: 403,
      title: "You do not have enough credit.",
      balance: 30
    })
  })

  it.layer(TestServices)("client", (it) => {
    it.effect("decodes the response into the class instance", () =>
      Effect.gen(function*() {
        const client = yield* HttpApiTest.groups(PurchaseApi, ["test"]).pipe(Effect.provide(PurchaseGroup))
        const error = yield* Effect.flip(client.test.purchase())
        assert.instanceOf(error, OutOfCredit)
        assert.strictEqual(error._tag, "OutOfCredit")
        assert.strictEqual(error.balance, 30)
      }))
  })

  it("lists application/problem+json under the status in the OpenAPI spec", () => {
    const content = OpenApi.fromApi(PurchaseApi).paths["/purchase"]?.get?.responses[403]?.content
    assert.isDefined(content?.["application/problem+json"])
  })
})

describe("HttpApiMiddleware.ProblemDetails", () => {
  const Group = HttpApiGroup.make("test").add(
    HttpApiEndpoint.get("list", "/list", { query: { page: Schema.String }, success: Schema.String })
  )
  const PlainApi = HttpApi.make("Api").add(Group)
  const ProblemApi = HttpApi.make("Api").add(Group).middleware(HttpApiMiddleware.ProblemDetails)
  const handlers = (api: typeof PlainApi | typeof ProblemApi) =>
    HttpApiBuilder.group(api, "test", (handlers) => handlers.handle("list", () => Effect.succeed("ok")))

  it("keeps the empty 400 without the middleware", async () => {
    const response = await fetchWith(HttpApiBuilder.layer(PlainApi).pipe(Layer.provide(handlers(PlainApi))), "/list")
    assert.strictEqual(response.status, 400)
    assert.strictEqual(await response.text(), "")
  })

  it("renders a generic problem+json 400 without details", async () => {
    const response = await fetchWith(
      HttpApiBuilder.layer(ProblemApi).pipe(
        Layer.provide(handlers(ProblemApi)),
        Layer.provide(HttpApiMiddleware.layerProblemDetails())
      ),
      "/list"
    )
    assert.strictEqual(response.status, 400)
    assert.strictEqual(response.headers.get("content-type"), "application/problem+json")
    assert.deepStrictEqual(await response.json(), {
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      detail: "Request validation failed"
    })
  })

  it("adds errors prefixed with the slot name when includeDetails is enabled", async () => {
    const response = await fetchWith(
      HttpApiBuilder.layer(ProblemApi).pipe(
        Layer.provide(handlers(ProblemApi)),
        Layer.provide(HttpApiMiddleware.layerProblemDetails({ includeDetails: true }))
      ),
      "/list"
    )
    assert.strictEqual(response.status, 400)
    const body = await response.json()
    assert.isArray(body.errors)
    assert.strictEqual(body.errors[0].path[0], "query")
    assert.isString(body.errors[0].message)
  })

  it("adds a problem+json 400 to the OpenAPI spec", () => {
    assert.isUndefined(OpenApi.fromApi(PlainApi).paths["/list"]?.get?.responses[400])
    const content = OpenApi.fromApi(ProblemApi).paths["/list"]?.get?.responses[400]?.content
    assert.isDefined(content?.["application/problem+json"])
  })
})

describe("HttpApiSchema.asProblem", () => {
  it("encodes a built-in error as a problem", async () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(
        HttpApiEndpoint.get("user", "/user", {
          success: Schema.String,
          error: HttpApiError.NotFound.pipe(HttpApiSchema.asProblem({ title: "Not Found" }))
        })
      )
    )
    const Group = HttpApiBuilder.group(
      Api,
      "test",
      (handlers) => handlers.handle("user", () => Effect.fail(new HttpApiError.NotFound()))
    )
    const response = await fetchWith(HttpApiBuilder.layer(Api).pipe(Layer.provide(Group)), "/user")
    assert.strictEqual(response.status, 404)
    assert.strictEqual(response.headers.get("content-type"), "application/problem+json")
    assert.deepStrictEqual(await response.json(), { type: "about:blank", title: "Not Found", status: 404 })
  })
})
