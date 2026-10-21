/**
 * Composable authentication, sessions, identities, OAuth and JOSE for Effect.
 *
 * @stability unstable
 * @since 4.1.0
 */

/**
 * JOSE keys, compact signatures, encryption, JWTs, and key sets.
 *
 * @stability unstable
 * @category re-exports
 * @since 4.1.0
 */
export * as Jose from "./jose/index.ts"

// Runtime adapters and convenience entrypoints stay opt-in.
// @barrel(!(Contracts|Strategies|Twilio|WorkerdPasswordlessServices|WorkerdServices).ts): Auto-generated exports. Do not edit manually.

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Apple from "./Apple.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Atlassian from "./Atlassian.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Atom from "./Atom.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Auth from "./Auth.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Auth0 from "./Auth0.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as AuthContract from "./AuthContract.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as BrowserLogin from "./BrowserLogin.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as BrowserLoginContract from "./BrowserLoginContract.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Client from "./Client.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Cognito from "./Cognito.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Dropbox from "./Dropbox.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Email from "./Email.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as EmailDelivery from "./EmailDelivery.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Figma from "./Figma.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as GitHub from "./GitHub.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as GitLab from "./GitLab.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Google from "./Google.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Hooks from "./Hooks.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Http from "./Http.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as HuggingFace from "./HuggingFace.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Identity from "./Identity.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Keycloak from "./Keycloak.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Kick from "./Kick.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Line from "./Line.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Linear from "./Linear.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Microsoft from "./Microsoft.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Notion from "./Notion.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as OAuth from "./OAuth.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as OAuthProxy from "./OAuthProxy.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as OAuthScope from "./OAuthScope.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as OAuthServer from "./OAuthServer.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Okta from "./Okta.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as OpenIdConnect from "./OpenIdConnect.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as OperationHttp from "./OperationHttp.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as OperationHttpClient from "./OperationHttpClient.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as OperationHttpServer from "./OperationHttpServer.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Operations from "./Operations.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Passkey from "./Passkey.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as PasskeyContract from "./PasskeyContract.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Password from "./Password.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Persistence from "./Persistence.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as PhoneOtp from "./PhoneOtp.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Proofs from "./Proofs.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Railway from "./Railway.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Roblox from "./Roblox.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Schema from "./Schema.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as SessionContract from "./SessionContract.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Sessions from "./Sessions.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Slack from "./Slack.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as SmsDelivery from "./SmsDelivery.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Strava from "./Strava.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Totp from "./Totp.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as TotpContract from "./TotpContract.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Vercel from "./Vercel.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as WebCrypto from "./WebCrypto.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as X from "./X.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Zitadel from "./Zitadel.ts"

/**
 * @stability unstable
 * @since 4.1.0
 */
export * as Zoom from "./Zoom.ts"
