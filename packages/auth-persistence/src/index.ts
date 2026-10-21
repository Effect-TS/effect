/**
 * SQL persistence for authentication workflows, sessions, and OAuth servers.
 *
 * @stability unstable
 * @since 4.1.0
 */

export {
  /**
   * Durable browser login attempts with single-use exchange and commit coordination.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  BrowserLoginPersistence
} from "./internal/browserLogin.ts"

export {
  /**
   * Failure indicating unsupported or invalid persistence configuration.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PersistenceConfigurationError
} from "./internal/configuration.ts"

export {
  /**
   * Failure indicating invalid database table, column, or row mappings.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PersistenceMappingError
} from "./internal/mappingError.ts"

export {
  /**
   * Durable encrypted OAuth callback attempts with expiration and single-use consumption.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  OAuthProxyPersistence
} from "./internal/oauthProxy.ts"

export {
  /**
   * Consent, authorization codes, refresh tokens, and grants for an OAuth authorization server.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  OAuthServerPersistence
} from "./internal/oauthServer.ts"

export {
  /**
   * Managed SQL persistence for authentication methods, identities, and sessions.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  AuthPersistence
} from "./internal/sqlPersistence.ts"

export {
  /**
   * Managed authentication storage table names and migration statements.
   *
   * @stability unstable
   * @category re-exports
   * @since 4.1.0
   */
  StorageTable
} from "./internal/storageTables.ts"

/**
 * Table-mapped persistence for OAuth sign-in, linked accounts, and retained grants.
 *
 * @stability unstable
 * @category re-exports
 * @since 4.1.0
 */
export * as OAuthPersistence from "./OAuthPersistence.ts"
