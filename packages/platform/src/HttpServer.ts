/**
 * @since 1.0.0
 */
import * as app from "./Http/App.js"
import * as body from "./Http/Body.js"
import * as headers from "./Http/Headers.js"
import * as middleware from "./Http/Middleware.js"
import * as multipart from "./Http/Multipart.js"
import * as multiplex from "./Http/Multiplex.js"
import * as router from "./Http/Router.js"
import * as error from "./Http/ServerError.js"
import * as request from "./Http/ServerRequest.js"
import * as response from "./Http/ServerResponse.js"
import * as urlParams from "./Http/UrlParams.js"

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
   * - Docs: [Http/Multipart](https://effect-ts.github.io/effect/platform/Http/Multipart.ts.html)
   * - Module: `@effect/platform/Http/Multipart`
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
   * - Docs: [Http/ServerRequest](https://effect-ts.github.io/effect/platform/Http/ServerRequest.ts.html)
   * - Module: `@effect/platform/Http/ServerRequest`
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
   * - Docs: [Http/UrlParams](https://effect-ts.github.io/effect/platform/Http/UrlParams.ts.html)
   * - Module: `@effect/platform/Http/UrlParams`
   */
  urlParams
}
