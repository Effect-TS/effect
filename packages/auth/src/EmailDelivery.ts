/**
 * Email rendering, delivery outcomes, and link landing utilities.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * The send may have been accepted. This does not authorize a retry.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  EmailAcceptanceUnknown,
  /**
   * Already-rendered private content. Unwrap bodies only at the provider boundary.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  EmailContent,
  /**
   * Application-supplied transport. Success means provider acceptance, not inbox delivery. Do not
   * retry internally. Defects and interruption must remain failed effects. Sender identity, provider
   * configuration and provider error mapping belong here.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  EmailDelivery,
  /**
   * Schema for a recipient and the rendered email content sent to that recipient.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  EmailMessage,
  /**
   * The provider definitely did not accept the message. No provider diagnostics escape.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  EmailNotAccepted
} from "./internal/emailDelivery/service.ts"

export {
  /**
   * Landing GET is static consumer UI: it must not call issue/attempt/complete or redirect. Consumers
   * choose their CSP script hashes/nonces if adding client code.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  linkLandingHeaders,
  /**
   * Parses a one-time email credential from a client-side URL fragment.
   *
   * **Details**
   *
   * Client-only extraction, without authentication side effects. Caller removes the fragment
   * immediately with history.replaceState, then waits for an intentional action before same-origin
   * CSRF-protected POST. Only reference/token are accepted; flow, binder and return target come from
   * the originating client's private state.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  parseLinkFragment
} from "./internal/emailDelivery/link.ts"
export {
  /**
   * Optional wording/localization override. Link construction and secret policy stay in Auth. Returned
   * bodies are private. Custom renderers must escape content when producing HTML.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  EmailRenderer,
  /**
   * Auth prepares the credential presentation before rendering or sending email.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  EmailTemplate
} from "./internal/emailDelivery/render.ts"
