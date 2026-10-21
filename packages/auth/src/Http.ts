/**
 * HTTP handlers for authentication actions, credentials, and OAuth callbacks.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Browser transport policy. Domain cookies require Secure and trust every subdomain. Never host
   * user- or AI-generated content there; audit dangling DNS, verify sessions server-side and retain
   * Origin/CSRF admission on mutations.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AuthHttpOptions,
  /**
   * Creates a layer of HTTP handlers for configured authentication actions.
   *
   * **Details**
   *
   * Mount the shared auth actions and OAuth callbacks with their configured services. Supply
   * application-owned persistence and account services through Layer.provide.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  layer,
  /**
   * Creates HTTP handlers for configured authentication actions.
   *
   * **Details**
   *
   * Build handlers and middleware for custom HTTP composition. Use layer for standalone mounting.
   * Mutation admission checks Origin and CSRF before effects. Generated operation handlers
   * independently require JSON; custom protected workflows choose their encoding. The application owns
   * session policy, persistence and profile lookup.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  make
} from "./internal/http/authHttp.ts"
export type {
  /**
   * Callback path, provider identifier, accepted query parameters, and response rendering for an OAuth
   * HTTP callback.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  OAuthCallbackOptions,
  /**
   * Provider definitions and callback handling settings for mounting OAuth authentication over HTTP.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  OAuthOptions
} from "./internal/http/oauth.ts"
