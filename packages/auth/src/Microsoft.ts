/**
 * OAuth provider configuration and identity schemas for Microsoft.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates a Microsoft authentication provider definition.
   *
   * **Details**
   *
   * Sign in with Microsoft Entra ID through the shared OIDC implementation. Defaults to tenant common,
   * the openid and profile scopes, client_secret_basic, S256 PKCE and advertised RS256. Profile is
   * always requested because oid requires it. The durable subject is oid:tid when the token issuer
   * equals the configured authority, and tid:oid:tid when it does not. Never use email or the pairwise
   * sub. MicrosoftUserProfile is carried through ID-token projection. Entra does not advertise RFC
   * 9207 iss or S256; the HTTP host must give it a distinct callback, and the preset supplies the
   * missing PKCE advertisement for this issuer's endpoints. Photo requires an application-owned Graph
   * call. Credentials are captured when the host builds its Layer; supply HttpClient and crypto in
   * that Scope.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  provider,
  /**
   * Configuration for the Microsoft authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderOptions,
  /**
   * Client registration and callback settings for the Microsoft authentication provider.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ProviderRegistration
} from "./internal/oauth/providers/microsoft/provider.ts"

export {
  /**
   * Entra ID profile claims from the verified ID token. oid and tid identify the user; email and
   * preferred_username never become the durable subject. picture is absent here: Graph photo is a
   * separate application-owned request.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  MicrosoftUserProfile
} from "./internal/oauth/providers/microsoft/profile.ts"
