---
"@effect/openapi-generator": patch
---

Generated HttpApi groups now name each endpoint without its group prefix, so `balance.read` becomes `read` in the `balance` group, and keep the qualified OpenAPI operation id as its `OpenApi.Identifier`. Two operations that would get the same name in one group are refused with both routes in the error.
