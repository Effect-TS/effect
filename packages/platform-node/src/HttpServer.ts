/**
 * @since 1.0.0
 */
import * as app from "@effect/platform/Http/App"
import * as body from "@effect/platform/Http/Body"
import * as headers from "@effect/platform/Http/Headers"
import * as middleware from "@effect/platform/Http/Middleware"
import * as router from "@effect/platform/Http/Router"
import * as error from "@effect/platform/Http/ServerError"
import * as response from "@effect/platform/Http/ServerResponse"
import * as urlParams from "@effect/platform/Http/UrlParams"
import * as etag from "./Http/Etag.js"
import * as formData from "./Http/FormData.js"
import * as server from "./Http/Server.js"
import * as request from "./Http/ServerRequest.js"

export {
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/App](https://effect-ts.github.io/platform/platform/Http/App.ts.html)
   * - Module: `@effect/platform/Http/App`
   */
  app,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Body](https://effect-ts.github.io/platform/platform/Http/Body.ts.html)
   * - Module: `@effect/platform/Http/Body`
   */
  body,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/ServerError](https://effect-ts.github.io/platform/platform/Http/ServerError.ts.html)
   * - Module: `@effect/platform/Http/ServerError`
   */
  error,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Etag](https://effect-ts.github.io/platform/platform-node/Http/Etag.ts.html)
   * - Module: `@effect/platform-node/Http/Etag`
   */
  etag,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/FormData](https://effect-ts.github.io/platform/platform-node/Http/FormData.ts.html)
   * - Module: `@effect/platform-node/Http/FormData`
   */
  formData,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Headers](https://effect-ts.github.io/platform/platform/Http/Headers.ts.html)
   * - Module: `@effect/platform/Http/Headers`
   */
  headers,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Middleware](https://effect-ts.github.io/platform/platform/Http/Middleware.ts.html)
   * - Module: `@effect/platform/Http/Middleware`
   */
  middleware,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/ServerRequest](https://effect-ts.github.io/platform/platform-node/Http/ServerRequest.ts.html)
   * - Module: `@effect/platform-node/Http/ServerRequest`
   */
  request,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/ServerResponse](https://effect-ts.github.io/platform/platform/Http/ServerResponse.ts.html)
   * - Module: `@effect/platform/Http/ServerResponse`
   */
  response,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Router](https://effect-ts.github.io/platform/platform/Http/Router.ts.html)
   * - Module: `@effect/platform/Http/Router`
   */
  router,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Server](https://effect-ts.github.io/platform/platform-node/Http/Server.ts.html)
   * - Module: `@effect/platform-node/Http/Server`
   */
  server,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/UrlParams](https://effect-ts.github.io/platform/platform/Http/UrlParams.ts.html)
   * - Module: `@effect/platform/Http/UrlParams`
   */
  urlParams
}
