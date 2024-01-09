/**
 * @since 1.0.0
 */
import * as etag from "@effect/platform-node/Http/Etag"
import * as multipart from "@effect/platform-node/Http/Multipart"
import * as app from "@effect/platform/Http/App"
import * as body from "@effect/platform/Http/Body"
import * as headers from "@effect/platform/Http/Headers"
import * as middleware from "@effect/platform/Http/Middleware"
import * as multiplex from "@effect/platform/Http/Multiplex"
import * as router from "@effect/platform/Http/Router"
import * as error from "@effect/platform/Http/ServerError"
import * as response from "@effect/platform/Http/ServerResponse"
import * as urlParams from "@effect/platform/Http/UrlParams"
import * as server from "./Http/Server.js"
import * as request from "./Http/ServerRequest.js"

export {
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/App](https://effect-ts.github.io/effect/platform/Http/App.ts.html)
   * - Module: `@effect/platform/Http/App`
   */
  app,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Body](https://effect-ts.github.io/effect/platform/Http/Body.ts.html)
   * - Module: `@effect/platform/Http/Body`
   */
  body,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/ServerError](https://effect-ts.github.io/effect/platform/Http/ServerError.ts.html)
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
   * - Docs: [Http/Headers](https://effect-ts.github.io/effect/platform/Http/Headers.ts.html)
   * - Module: `@effect/platform/Http/Headers`
   */
  headers,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Middleware](https://effect-ts.github.io/effect/platform/Http/Middleware.ts.html)
   * - Module: `@effect/platform/Http/Middleware`
   */
  middleware,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Multipart](https://effect-ts.github.io/platform/platform-node/Http/Multipart.ts.html)
   * - Module: `@effect/platform-node/Http/Multipart`
   */
  multipart,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Multiplex](https://effect-ts.github.io/effect/platform/Http/Multiplex.ts.html)
   * - Module: `@effect/platform/Http/Multiplex`
   */
  multiplex,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/ServerRequest](https://effect-ts.github.io/platform/platform-bun/Http/ServerRequest.ts.html)
   * - Module: `@effect/platform-bun/Http/ServerRequest`
   */
  request,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/ServerResponse](https://effect-ts.github.io/effect/platform/Http/ServerResponse.ts.html)
   * - Module: `@effect/platform/Http/ServerResponse`
   */
  response,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Router](https://effect-ts.github.io/effect/platform/Http/Router.ts.html)
   * - Module: `@effect/platform/Http/Router`
   */
  router,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Server](https://effect-ts.github.io/platform/platform-bun/Http/Server.ts.html)
   * - Module: `@effect/platform-bun/Http/Server`
   */
  server,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/UrlParams](https://effect-ts.github.io/effect/platform/Http/UrlParams.ts.html)
   * - Module: `@effect/platform/Http/UrlParams`
   */
  urlParams
}
