/**
 * @since 1.0.0
 */
import * as etag from "@effect/platform-node-shared/Http/Etag"
import * as multipart from "@effect/platform-node-shared/Http/Multipart"
import * as server from "./Http/Server.js"
import * as request from "./Http/ServerRequest.js"

export {
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Etag](https://effect-ts.github.io/platform/platform-node-shared/Http/Etag.ts.html)
   * - Module: `@effect/platform-node-shared/Http/Etag`
   */
  etag,
  /**
   * @since 1.0.0
   *
   * - Docs: [Http/Multipart](https://effect-ts.github.io/platform/platform-node-shared/Http/Multipart.ts.html)
   * - Module: `@effect/platform-node-shared/Http/Multipart`
   */
  multipart,
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
   * - Docs: [Http/Server](https://effect-ts.github.io/platform/platform-node/Http/Server.ts.html)
   * - Module: `@effect/platform-node/Http/Server`
   */
  server
}
