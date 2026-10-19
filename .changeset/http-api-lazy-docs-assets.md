---
"effect": patch
---

Load the bundled Scalar and Swagger UI assets only when `HttpApiScalar.layer` or `HttpApiSwagger.layer` is built, so importing `effect/http-api` no longer evaluates about 5 MB of embedded JavaScript and CSS.
