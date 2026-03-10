---
"@effect/platform": patch
---

add helper types for HttpApi

Examples:

```ts
const group1 = HttpApiGroup.make("Group1").add(
  HttpApiEndpoint.get("Endpoint1")`/`
)
const group2 = HttpApiGroup.make("Group2").add(
  HttpApiEndpoint.get("Endpoint2")`/`
)
const api = HttpApi.make("TestApi").add(group1).add(group2)

//      ┌─── | HttpApiGroup<"Group1", HttpApiEndpoint<"Endpoint1", "GET">, never>
//      |    | HttpApiGroup<"Group2", HttpApiEndpoint<"Endpoint2", "GET">, never>
//      ▼
type groups = HttpApi.HttpApi.Groups<typeof api>

//      ┌─── HttpApiEndpoint<"Endpoint1", "GET">
//      ▼
type endpoints = HttpApi.HttpApi.EndpointsWithGroupName<typeof api, "Group1">

//      ┌─── HttpApiEndpoint.Handler<HttpApiEndpoint<"Endpoint1", "GET">, never, never>
//      ▼
type handler = HttpApi.HttpApi.ExtractHandlerType<
  typeof api,
  "Group1",
  "Endpoint1",
  never,
  never
>
```

the latter is useful when you want to extract the handler type of a specific endpoint within a group.
