/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import type { Layer } from "effect/Layer"
import { Api } from "./HttpApi.js"
import { Router } from "./HttpApiBuilder.js"
import * as HttpServerResponse from "./HttpServerResponse.js"
import * as Html from "./internal/html.js"
import * as internal from "./internal/httpApiScalar.js"
import * as OpenApi from "./OpenApi.js"

/**
 * @since 1.0.0
 * @category model
 */
export type ScalarThemeId =
  | "alternate"
  | "default"
  | "moon"
  | "purple"
  | "solarized"
  | "bluePlanet"
  | "deepSpace"
  | "saturn"
  | "kepler"
  | "mars"
  | "none"

/**
 * @since 1.0.0
 * @category model
 *
 * cdn: `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${source.version}/dist/browser/standalone.min.js`
 */
export type ScalarScriptSource =
  | string
  | { type: "default" }
  | {
    type: "cdn"
    version?: "latest" | (string & {})
  }

/**
 * @see https://github.com/scalar/scalar/blob/main/documentation/configuration.md
 *
 * @since 1.0.0
 * @category model
 */
export type ScalarConfig = {
  /** A string to use one of the color presets */
  theme?: ScalarThemeId
  /** The layout to use for the references */
  layout?: "modern" | "classic"
  /** URL to a request proxy for the API client */
  proxy?: string
  /** Whether the spec input should show */
  isEditable?: boolean
  /** Whether to show the sidebar */
  showSidebar?: boolean
  /**
   * Whether to show models in the sidebar, search, and content.
   *
   * Default: `false`
   */
  hideModels?: boolean
  /**
   * Whether to show the “Download OpenAPI Document” button
   *
   * Default: `false`
   */
  hideDownloadButton?: boolean
  /**
   * Whether to show the “Test Request” button
   *
   * Default: `false`
   */
  hideTestRequestButton?: boolean
  /**
   * Whether to show the sidebar search bar
   *
   * Default: `false`
   */
  hideSearch?: boolean
  /** Whether dark mode is on or off initially (light mode) */
  darkMode?: boolean
  /** forceDarkModeState makes it always this state no matter what*/
  forceDarkModeState?: "dark" | "light"
  /** Whether to show the dark mode toggle */
  hideDarkModeToggle?: boolean
  /**
   * Path to a favicon image
   *
   * Default: `undefined`
   * Example: '/favicon.svg'
   */
  favicon?: string
  /** Custom CSS to be added to the page */
  customCss?: string
  /**
   * The baseServerURL is used when the spec servers are relative paths and we are using SSR.
   * On the client we can grab the window.location.origin but on the server we need
   * to use this prop.
   *
   * Default: `undefined`
   * Example: 'http://localhost:3000'
   */
  baseServerURL?: string
  /**
   * We’re using Inter and JetBrains Mono as the default fonts. If you want to use your own fonts, set this to false.
   *
   * Default: `true`
   */
  withDefaultFonts?: boolean
  /**
   * By default we only open the relevant tag based on the url, however if you want all the tags open by default then set this configuration option :)
   *
   * Default: `false`
   */
  defaultOpenAllTags?: boolean
}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options?: {
  readonly path?: `/${string}` | undefined
  readonly source?: ScalarScriptSource
  readonly scalar?: ScalarConfig
}): Layer<never, never, Api> =>
  Router.use((router) =>
    Effect.gen(function*() {
      const { api } = yield* Api
      const spec = OpenApi.fromApi(api)

      const source = options?.source
      const defaultScript = internal.javascript
      const src: string | null = source
        ? typeof source === "string"
          ? source
          : source.type === "cdn"
          ? `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${
            source.version ?? "latest"
          }/dist/browser/standalone.min.js`
          : null
        : null

      const scalarConfig = {
        _integration: "http",
        ...options?.scalar
      }

      const response = HttpServerResponse.html(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${Html.escape(spec.info.title)}</title>
    ${
        !spec.info.description
          ? ""
          : `<meta name="description" content="${Html.escape(spec.info.description)}"/>`
      }
    ${
        !spec.info.description
          ? ""
          : `<meta name="og:description" content="${Html.escape(spec.info.description)}"/>`
      }
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" type="application/json">
      ${Html.escapeJson(spec)}
    </script>
    <script>
      document.getElementById('api-reference').dataset.configuration = JSON.stringify(${Html.escapeJson(scalarConfig)})
    </script>
    ${
        src
          ? `<script src="${src}" crossorigin></script>`
          : `<script>${defaultScript}</script>`
      }
  </body>
</html>`)
      yield* router.get(options?.path ?? "/docs", Effect.succeed(response))
    })
  )
