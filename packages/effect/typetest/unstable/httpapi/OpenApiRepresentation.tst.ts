import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { describe, expect, it } from "tstyche"

describe("OpenApi representation consumer", () => {
  it("keeps the synchronous fromApi signature", () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(HttpApiEndpoint.get("health", "/health"))
    )

    expect(OpenApi.fromApi(Api)).type.toBe<OpenApi.OpenAPISpec>()
  })

  it("exposes the document version union and native QUERY operations", () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(HttpApiEndpoint.query("search", "/search"))
    )
    const spec = OpenApi.fromApi(Api)

    expect(spec.openapi).type.toBe<"3.1.0" | "3.2.0">()
    expect(spec.paths["/search"]?.query).type.toBe<OpenApi.OpenAPISpecOperation | undefined>()
    expect<"query">().type.toBeAssignableTo<OpenApi.OpenAPISpecMethodName>()
  })
})
