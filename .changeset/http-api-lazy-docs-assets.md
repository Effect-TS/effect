---
"effect": patch
---

Load the bundled Scalar and Swagger UI assets when `HttpApiScalar.layer` or `HttpApiSwagger.layer` is built instead of when `effect/http-api` is imported. Importing the module no longer evaluates about 5 MB of embedded JavaScript and CSS.
