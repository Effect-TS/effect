import { assert, describe, it } from "@effect/vitest"
import { Effect, type Layer } from "effect"
import { HttpRouter } from "effect/http"
import { HttpApi, HttpApiScalar, HttpApiSwagger } from "effect/http-api"
import { vi } from "vitest"

const loadedAssets = vi.hoisted(() => [] as Array<string>)

vi.mock("../../src/http-api/internal/httpApiScalar.ts", (importOriginal) => {
  loadedAssets.push("scalar")
  return importOriginal()
})

vi.mock("../../src/http-api/internal/httpApiSwagger.ts", (importOriginal) => {
  loadedAssets.push("swagger")
  return importOriginal()
})

describe("HttpApi documentation assets", () => {
  it.effect("loads bundled UI assets only when an inline documentation layer is built", () =>
    Effect.gen(function*() {
      const Api = HttpApi.make("Docs")
      assert.deepStrictEqual(loadedAssets, [])

      const cdn = yield* render(HttpApiScalar.layerCdn(Api))
      assert.ok(cdn.includes(`<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/`))
      assert.deepStrictEqual(loadedAssets, [])

      const scalar = yield* render(HttpApiScalar.layer(Api))
      assert.ok(scalar.includes("window.Scalar.createApiReference"))
      assert.ok(!scalar.includes(`<script src=`))
      assert.deepStrictEqual(loadedAssets, ["scalar"])

      const swagger = yield* render(HttpApiSwagger.layer(Api))
      assert.ok(swagger.includes("SwaggerUIBundle"))
      assert.deepStrictEqual(loadedAssets, ["scalar", "swagger"])
    }))
})

const render = (layer: Layer.Layer<never, never, HttpRouter.HttpRouter>) =>
  Effect.acquireUseRelease(
    Effect.sync(() => HttpRouter.toWebHandler(layer, { disableLogger: true })),
    ({ handler }) =>
      Effect.promise(async () => {
        const response = await handler(new Request("http://test/docs"))
        assert.strictEqual(response.status, 200)
        return response.text()
      }),
    ({ dispose }) => Effect.promise(dispose)
  )
