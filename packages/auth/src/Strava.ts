/**
 * OAuth provider configuration and identity schemas for Strava.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Declares permissions separately from provider secrets.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  accessProfile
} from "./internal/oauth/providers/strava/access.ts"
export type {
  /**
   * Configuration for the Strava authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  ProviderOptions
} from "./internal/oauth/providers/strava/models.ts"
export {
  /**
   * Schema for the Strava athlete identity and profile fields returned after authorization.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  Athlete
} from "./internal/oauth/providers/strava/profile.ts"
export {
  /**
   * Creates a Strava authentication provider definition.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider
} from "./internal/oauth/providers/strava/provider.ts"
