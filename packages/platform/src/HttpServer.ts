/**
 * @since 1.0.0
 */
import * as app from "./Http/App.js"
import * as body from "./Http/Body.js"
import * as formData from "./Http/FormData.js"
import * as headers from "./Http/Headers.js"
import * as middleware from "./Http/Middleware.js"
import * as router from "./Http/Router.js"
import * as error from "./Http/ServerError.js"
import * as request from "./Http/ServerRequest.js"
import * as response from "./Http/ServerResponse.js"
import * as urlParams from "./Http/UrlParams.js"

export {
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/App](https://effect-ts.github.io/platform/platform/Http/App.html)
   * - Module: `@effect/platform/Http/App`
   */
  app,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Body](https://effect-ts.github.io/platform/platform/Http/Body.html)
   * - Module: `@effect/platform/Http/Body`
   */
  body,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/ServerError](https://effect-ts.github.io/platform/platform/Http/ServerError.html)
   * - Module: `@effect/platform/Http/ServerError`
   */
  error,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/FormData](https://effect-ts.github.io/platform/platform/Http/FormData.html)
   * - Module: `@effect/platform/Http/FormData`
   */
  formData,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Headers](https://effect-ts.github.io/platform/platform/Http/Headers.html)
   * - Module: `@effect/platform/Http/Headers`
   */
  headers,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Middleware](https://effect-ts.github.io/platform/platform/Http/Middleware.html)
   * - Module: `@effect/platform/Http/Middleware`
   */
  middleware,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/ServerRequest](https://effect-ts.github.io/platform/platform/Http/ServerRequest.html)
   * - Module: `@effect/platform/Http/ServerRequest`
   */
  request,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/ServerResponse](https://effect-ts.github.io/platform/platform/Http/ServerResponse.html)
   * - Module: `@effect/platform/Http/ServerResponse`
   */
  response,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Router](https://effect-ts.github.io/platform/platform/Http/Router.html)
   * - Module: `@effect/platform/Http/Router`
   */
  router,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/UrlParams](https://effect-ts.github.io/platform/platform/Http/UrlParams.html)
   * - Module: `@effect/platform/Http/UrlParams`
   */
  urlParams
}
