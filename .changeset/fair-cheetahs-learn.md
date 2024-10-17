---
"@effect/platform": minor
---

HttpApi second revision

- `HttpApi`, `HttpApiGroup` & `HttpApiEndpoint` now use a chainable api instead
  of a pipeable api.
- `HttpApiMiddleware` module has been added, with a updated way of defining
  security middleware.
- You can now add multiple success schemas
- Error schemas now support `HttpApiSchema` encoding apis

For more information, see the [README](https://github.com/Effect-TS/effect/blob/main/packages/platform/README.md#http-api).
