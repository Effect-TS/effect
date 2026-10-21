/**
 * Transport contracts for session operations and their HTTP routes.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Shared HttpApi security metadata and authenticated session service. The server implementation
   * requires the validated request supplied by AuthHttp.middleware. Keep this declaration beside the
   * application's shared API, outside server setup.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  makeSessionHttpContract
} from "./internal/http/sessionContract.ts"
export {
  /**
   * Canonical session contracts without installing session authority or strategy Layers.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  makeSessionContract
} from "./internal/sessions/contract.ts"
