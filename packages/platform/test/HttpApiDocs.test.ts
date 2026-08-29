import { HttpApi, HttpApiScalar, HttpApiSwagger, HttpLayerRouter, OpenApi } from "@effect/platform"
import { assert, describe, test } from "@effect/vitest"

describe("HttpApi docs", () => {
  test("escapes quotes in Scalar description attributes", async () => {
    const api = HttpApi.make("Api").annotate(OpenApi.Description, `A "quoted" and 'single-quoted' description`)
    const { handler } = HttpLayerRouter.toWebHandler(
      HttpApiScalar.layerHttpLayerRouter({ api, path: "/docs" })
    )

    const response = await handler(new Request("http://localhost/docs"))
    const body = await response.text()

    assert.include(body, `content="A &quot;quoted&quot; and &#39;single-quoted&#39; description"`)
  })

  test("escapes script end tag variants in Swagger JSON", async () => {
    const variants = ["</script ", "</script/", "</script\n", "</script\t"]
    const api = HttpApi.make("Api").annotate(OpenApi.Description, variants.join("|"))
    const { handler } = HttpLayerRouter.toWebHandler(
      HttpApiSwagger.layerHttpLayerRouter({ api, path: "/docs" })
    )

    const response = await handler(new Request("http://localhost/docs"))
    const body = await response.text()

    for (const variant of ["\\u003c/script ", "\\u003c/script/", "\\u003c/script\\n", "\\u003c/script\\t"]) {
      assert.include(body, variant)
    }
  })
})
