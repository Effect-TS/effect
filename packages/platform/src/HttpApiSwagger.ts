/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Api } from "./HttpApi.js"
import type * as HttpApi from "./HttpApi.js"
import { Router } from "./HttpApiBuilder.js"
import * as HttpLayerRouter from "./HttpLayerRouter.js"
import * as HttpServerResponse from "./HttpServerResponse.js"
import * as Html from "./internal/html.js"
import * as internal from "./internal/httpApiSwagger.js"
import * as OpenApi from "./OpenApi.js"

const makeHandler = (options: {
  readonly api: HttpApi.HttpApi.Any
}) => {
  const spec = OpenApi.fromApi(options.api as any)
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
  return Effect.succeed(response)
}

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
}): Layer.Layer<never, never, Api> =>
  Router.use((router) =>
    Effect.gen(function*() {
      const { api } = yield* Api
      const handler = makeHandler({ api })
      yield* router.get(options?.path ?? "/docs", handler)
    })
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layerHttpLayerRouter: (
  options: {
    readonly api: HttpApi.HttpApi.Any
    readonly path: `/${string}`
  }
) => Layer.Layer<
  never,
  never,
  HttpLayerRouter.HttpRouter
> = Effect.fnUntraced(function*(options: {
  readonly api: HttpApi.HttpApi.Any
  readonly path: `/${string}`
}) {
  const router = yield* HttpLayerRouter.HttpRouter
  const handler = makeHandler(options)
  yield* router.add("GET", options.path, handler)
}, Layer.effectDiscard)
