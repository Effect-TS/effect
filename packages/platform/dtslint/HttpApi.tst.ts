import type { HttpApiError } from "@effect/platform"
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { describe, expect, it } from "tstyche"

const group1 = HttpApiGroup.make("Group1").add(
  HttpApiEndpoint.get("Endpoint1")`/`
)
const group2 = HttpApiGroup.make("Group2").add(
  HttpApiEndpoint.get("Endpoint2")`/`
)
const api = HttpApi.make("TestApi").add(group1).add(group2)

describe("HttpApi", () => {
  it("add", () => {
    expect<typeof api>().type.toBe<
      HttpApi.HttpApi<
        "TestApi",
        | HttpApiGroup.HttpApiGroup<"Group1", HttpApiEndpoint.HttpApiEndpoint<"Endpoint1", "GET">, never>
        | HttpApiGroup.HttpApiGroup<"Group2", HttpApiEndpoint.HttpApiEndpoint<"Endpoint2", "GET">, never>,
        HttpApiError.HttpApiDecodeError
      >
    >()
    expect(api.add(HttpApiGroup.make("NewGroup"))).type.toBe<
      HttpApi.HttpApi<
        "TestApi",
        | HttpApiGroup.HttpApiGroup<"Group1", HttpApiEndpoint.HttpApiEndpoint<"Endpoint1", "GET">, never>
        | HttpApiGroup.HttpApiGroup<"Group2", HttpApiEndpoint.HttpApiEndpoint<"Endpoint2", "GET">, never>
        | HttpApiGroup.HttpApiGroup<"NewGroup", never, never>,
        HttpApiError.HttpApiDecodeError
      >
    >()
  })

  it("HttpApi.Groups", () => {
    expect<HttpApi.HttpApi.Groups<typeof api>>().type.toBe<
      | HttpApiGroup.HttpApiGroup<"Group1", HttpApiEndpoint.HttpApiEndpoint<"Endpoint1", "GET">, never>
      | HttpApiGroup.HttpApiGroup<"Group2", HttpApiEndpoint.HttpApiEndpoint<"Endpoint2", "GET">, never>
    >()
    expect<HttpApiGroup.HttpApiGroup.Name<HttpApi.HttpApi.Groups<typeof api>>>().type.toBe<"Group1" | "Group2">()
  })

  it("HttpApi.EndpointsWithGroupName", () => {
    expect<HttpApi.HttpApi.EndpointsWithGroupName<typeof api, "Group1">>().type.toBe<
      HttpApiEndpoint.HttpApiEndpoint<"Endpoint1", "GET">
    >()
    expect<HttpApi.HttpApi.EndpointsWithGroupName<typeof api, "Group2">>().type.toBe<
      HttpApiEndpoint.HttpApiEndpoint<"Endpoint2", "GET">
    >()
    expect<HttpApiEndpoint.HttpApiEndpoint.Name<HttpApi.HttpApi.EndpointsWithGroupName<typeof api, "Group1">>>().type
      .toBe<
        "Endpoint1"
      >()
    expect<HttpApiEndpoint.HttpApiEndpoint.Name<HttpApi.HttpApi.EndpointsWithGroupName<typeof api, "Group2">>>().type
      .toBe<
        "Endpoint2"
      >()
  })

  it("HttpApi.ExtractHandlerType", () => {
    expect<HttpApi.HttpApi.ExtractHandlerType<typeof api, "Group1", "Endpoint1">>()
      .type.toBe<
      HttpApiEndpoint.HttpApiEndpoint.Handler<HttpApiEndpoint.HttpApiEndpoint<"Endpoint1", "GET">, never, never>
    >()
    expect<HttpApi.HttpApi.ExtractHandlerType<typeof api, "Group2", "Endpoint2">>()
      .type.toBe<
      HttpApiEndpoint.HttpApiEndpoint.Handler<HttpApiEndpoint.HttpApiEndpoint<"Endpoint2", "GET">, never, never>
    >()
  })
})
