import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiGroup, HttpLayerRouter, HttpServer } from "@effect/platform"
import { describe, test } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Effect, Layer, Schema } from "effect"

describe("HttpLayerRouter", () => {
  describe("addHttpApi", () => {
    test("two registered APIs use their own error schemas (regression #6243)", async () => {
      const Api1 = HttpApi.make("Api1").add(
        HttpApiGroup.make("group1").add(
          HttpApiEndpoint.get("endpoint1")`/1`.addError(Schema.transformLiteral("BAD", "x"))
        )
      )
      const Handlers1 = HttpApiBuilder.group(
        Api1,
        "group1",
        (_) => _.handle("endpoint1", () => Effect.fail("x" as const))
      )
      const Routes1 = HttpLayerRouter.addHttpApi(Api1).pipe(
        Layer.provide(Layer.mergeAll(Handlers1))
      )

      const Api2 = HttpApi.make("Api2").add(
        HttpApiGroup.make("group2").add(
          HttpApiEndpoint.get("endpoint2")`/2`.addError(Schema.transformLiteral("GOOD", "x"))
        )
      )
      const Handlers2 = HttpApiBuilder.group(
        Api2,
        "group2",
        (_) => _.handle("endpoint2", () => Effect.fail("x" as const))
      )
      const Routes2 = HttpLayerRouter.addHttpApi(Api2).pipe(
        Layer.provide(Layer.mergeAll(Handlers2))
      )

      const AllRoutes = Layer.mergeAll(Routes1, Routes2)
      const { handler } = HttpLayerRouter.toWebHandler(
        AllRoutes.pipe(Layer.provide(HttpServer.layerContext))
      )

      const response1 = await handler(new Request("http://localhost:3000/1"))
      const body1 = await response1.text()
      strictEqual(body1, "\"BAD\"", "Api1's endpoint must use Api1's error schema")

      const response2 = await handler(new Request("http://localhost:3000/2"))
      const body2 = await response2.text()
      strictEqual(body2, "\"GOOD\"", "Api2's endpoint must use Api2's error schema, not Api1's")
    })

    test("single registered API still encodes errors using its own schema", async () => {
      const Api = HttpApi.make("Api").add(
        HttpApiGroup.make("group").add(
          HttpApiEndpoint.get("endpoint")`/`.addError(Schema.transformLiteral("OK", "x"))
        )
      )
      const Handlers = HttpApiBuilder.group(Api, "group", (_) => _.handle("endpoint", () => Effect.fail("x" as const)))
      const Routes = HttpLayerRouter.addHttpApi(Api).pipe(
        Layer.provide(Layer.mergeAll(Handlers))
      )

      const { handler } = HttpLayerRouter.toWebHandler(
        Routes.pipe(Layer.provide(HttpServer.layerContext))
      )

      const response = await handler(new Request("http://localhost:3000/"))
      const body = await response.text()
      strictEqual(body, "\"OK\"")
    })
  })
})
