---
"@effect/platform": patch
---

`OpenApi.Transform` annotation has been added

This customization point allows you to transform the generated specification in an arbitrary way

```ts
class Api extends HttpApi.empty
  .annotateContext(OpenApi.annotations({
    title: "API",
    summary: "test api summary",
    transform: (openApiSpec) => ({
      ...openApiSpec,
      tags: [...openApiSpec.tags ?? [], {
        name: "Tag from OpenApi.Transform annotation"
      }]
    })
  }))
```
