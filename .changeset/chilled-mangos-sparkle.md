---
"@effect/platform": patch
---

`HttpApiClient.group` & `HttpApiClient.endpoint` have been added
This makes it possible to create `HttpApiClient` for some part of the `HttpApi`
This eliminates the need to provide all the dependencies for the entire `HttpApi` - but only those necessary for its specific part to work
