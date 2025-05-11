/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import type { Layer } from "effect/Layer"
import { Api } from "./HttpApi.js"
import { Router } from "./HttpApiBuilder.js"
import * as HttpServerResponse from "./HttpServerResponse.js"
import * as internal from "./internal/httpApiSwagger.js"
import * as OpenApi from "./OpenApi.js"

// Regex to find closing </script> tags in JSON to prevent breaking out of script context
const ESCAPE_SCRIPT_END = /<\/script>/gi
// Regex to find Unicode line terminators that are valid JSON but break JS string literals
const ESCAPE_LINE_TERMS = /[\u2028\u2029]/g

/**
 * Safely serialize an OpenAPI spec to a JSON string
 * and escape any sequences that could break <script> blocks.
 *
 * - Replaces `</script>` with `<\/script>` to avoid premature tag closing.
 * - Escapes U+2028 and U+2029 as literal \u2028 / \u2029.
 */
function escapeSpec(spec: OpenApi.OpenAPISpec): string {
  return JSON.stringify(spec)
    .replace(ESCAPE_SCRIPT_END, "<\\/script>")
    .replace(ESCAPE_LINE_TERMS, (c) => c === "\u2028" ? "\\u2028" : "\\u2029")
}

/**
 * HTML-escape text content to prevent injection in text nodes or attributes.
 */
function htmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
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
  <title>${htmlEscape(spec.info.title)} Documentation</title>
  <style>${internal.css}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script id="swagger-spec" type="application/json">
    ${escapeSpec(spec)}
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
