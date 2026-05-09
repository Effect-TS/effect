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
  | "saturn"
  | "kepler"
  | "mars"
  | "deepSpace"
  | "laserwave"
  | "none"

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
  proxyUrl?: string
  /** Whether to show the sidebar */
  showSidebar?: boolean
  /**
   * Whether to show models in the sidebar, search, and content.
   *
   * Default: `false`
   */
  hideModels?: boolean
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

const makeHandler = (options: {
  readonly api: HttpApi.HttpApi.Any
  readonly source: {
    readonly _tag: "Cdn"
    readonly version?: string | undefined
  } | {
    readonly _tag: "Inline"
    readonly source: string
  }
  readonly scalar?: ScalarConfig
}) => {
  const spec = OpenApi.fromApi(options.api as any)

  const source = options?.source

  const scalarConfig = {
    _integration: "html",
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
    source._tag === "Cdn"
      ? `<script src="${`https://cdn.jsdelivr.net/npm/@scalar/api-reference@${
        source.version ?? "latest"
      }/dist/browser/standalone.min.js`}" crossorigin></script>`
      : `<script>${source.source}</script>`
  }
  </body>
</html>`)

  return Effect.succeed(response)
}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options?: {
  readonly path?: `/${string}` | undefined
  readonly scalar?: ScalarConfig
}): Layer.Layer<never, never, Api> =>
  Router.use(Effect.fnUntraced(function*(router) {
    const { api } = yield* Api
    const handler = makeHandler({
      ...options,
      api,
      source: {
        _tag: "Inline",
        source: internal.javascript
      }
    })
    yield* router.get(options?.path ?? "/docs", handler)
  }))

/**
 * @since 1.0.0
 * @category layers
 */
export const layerCdn = (options?: {
  readonly path?: `/${string}` | undefined
  readonly scalar?: ScalarConfig
  readonly version?: string | undefined
}): Layer.Layer<never, never, Api> =>
  Router.use(Effect.fnUntraced(function*(router) {
    const { api } = yield* Api
    const handler = makeHandler({
      ...options,
      api,
      source: {
        _tag: "Cdn",
        version: options?.version
      }
    })
    yield* router.get(options?.path ?? "/docs", handler)
  }))

/**
 * @since 1.0.0
 * @category layers
 */
export const layerHttpLayerRouter: (
  options: {
    readonly api: HttpApi.HttpApi.Any
    readonly path: `/${string}`
    readonly scalar?: ScalarConfig
  }
) => Layer.Layer<
  never,
  never,
  HttpLayerRouter.HttpRouter
> = Effect.fnUntraced(function*(options: {
  readonly api: HttpApi.HttpApi.Any
  readonly path: `/${string}`
  readonly scalar?: ScalarConfig
}) {
  const router = yield* HttpLayerRouter.HttpRouter
  const handler = makeHandler({
    ...options,
    source: {
      _tag: "Inline",
      source: internal.javascript
    }
  })
  yield* router.add("GET", options.path, handler)
}, Layer.effectDiscard)

/**
 * @since 1.0.0
 * @category layers
 */
export const layerHttpLayerRouterCdn: (
  options: {
    readonly api: HttpApi.HttpApi.Any
    readonly path: `/${string}`
    readonly version?: string | undefined
    readonly scalar?: ScalarConfig
  }
) => Layer.Layer<
  never,
  never,
  HttpLayerRouter.HttpRouter
> = Effect.fnUntraced(function*(options: {
  readonly api: HttpApi.HttpApi.Any
  readonly path: `/${string}`
  readonly version?: string | undefined
  readonly scalar?: ScalarConfig
}) {
  const router = yield* HttpLayerRouter.HttpRouter
  const handler = makeHandler({
    ...options,
    source: {
      _tag: "Cdn",
      version: options?.version
    }
  })
  yield* router.add("GET", options.path, handler)
}, Layer.effectDiscard)
