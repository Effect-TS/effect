/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import type { Layer } from "effect/Layer"
import { Api } from "./HttpApi.js"
import { Router } from "./HttpApiBuilder.js"
import * as HttpServerResponse from "./HttpServerResponse.js"
import * as Html from "./internal/html.js"
import * as internal from "./internal/httpApiSwagger.js"
import * as OpenApi from "./OpenApi.js"

/**
 * Exported layer mounting Swagger/OpenAPI documentation UI.
 *
 * @param options.path  Optional mount path (default "/docs").
 *
 * @since 1.0.0
 * @category layers
 */
export const layer = (options?: {
  readonly path?: `/${string}` | undefined
}): Layer<never, never, Api> =>
  Router.use((router) =>
    Effect.gen(function*() {
      const { api } = yield* Api
      const spec = OpenApi.fromApi(api)
      const response = HttpServerResponse.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${Html.escape(spec.info.title)} Documentation</title>
  <style>${internal.css}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script id="swagger-spec" type="application/json">
    ${Html.escapeJson(spec)}
  </script>
  <script>
    ${internal.javascript}
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        spec: JSON.parse(document.getElementById("swagger-spec").textContent),
        dom_id: '#swagger-ui',
      });
    };
  </script>
</body>
</html>`)
      yield* router.get(options?.path ?? "/docs", Effect.succeed(response))
    })
  )
