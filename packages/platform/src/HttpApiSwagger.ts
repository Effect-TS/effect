/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import type { Layer } from "effect/Layer"
import { HttpApi } from "./HttpApi.js"
import { Router } from "./HttpApiBuilder.js"
import * as HttpServerResponse from "./HttpServerResponse.js"
import * as internal from "./internal/apiSwagger.js"
import * as OpenApi from "./OpenApi.js"

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options?: {
  readonly path?: `/${string}` | undefined
}): Layer<never, never, HttpApi.Service> =>
  Router.use((router) =>
    Effect.gen(function*() {
      const api = yield* HttpApi
      const spec = OpenApi.fromApi(api)
      const response = HttpServerResponse.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${spec.info.title} Documentation</title>
  <style>${internal.css}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script>
    ${internal.javascript}
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        spec: ${JSON.stringify(spec)},
        dom_id: '#swagger-ui',
      });
    };
  </script>
</body>
</html>`)
      yield* router.get(options?.path ?? "/docs", Effect.succeed(response))
    })
  )
