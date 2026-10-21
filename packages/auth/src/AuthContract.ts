/**
 * Typed contracts for authentication actions and their HTTP projections.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Defines the schema and behavior of one public method, independently of its implementation. Inputs
   * use the schema's encoded form, matching operation.invoke.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  action,
  /**
   * Named definitions used to construct an authentication action contract.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ActionDefinitions,
  /**
   * Declared failure type returned by an authentication action.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type ActionError,
  /**
   * Encoded input accepted by an authentication action.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type ActionInput,
  /**
   * Public action data is shared by local, HTTP and reactive callers. Private request fields are
   * supplied by the server when the implementation executes.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ActionOptions,
  /**
   * Decoded success value returned by an authentication action.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type ActionSuccess,
  /**
   * Authentication action contract with route and execution metadata.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyAuthAction,
  /**
   * Shared authentication contract containing claims, namespaces, actions, and session schemas.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AnyAuthContract,
  /**
   * Named authentication actions exposed by a contract.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AuthActions,
  /**
   * Reuses a pure operation contract for a named action. Request credential fields are removed from
   * the public schema and restored only by the local request adapter.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  fromOperation,
  /**
   * Creates a browser-safe contract for named authentication actions.
   *
   * **Details**
   *
   * A browser-safe contract. The action callback only receives schemas; it never receives server
   * configuration, keys, persistence or service implementations.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  make
} from "./internal/operations/actions.ts"

export {
  /**
   * Creates the public password sign-in action contract.
   *
   * **Details**
   *
   * Public password action, usable with sign-in-only and management installations.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  signIn as passwordSignIn
} from "./internal/password/methods/contracts.ts"

export {
  /**
   * Identifies the callback capability explicitly, including its private binding and single-use
   * contract. The public action name may be chosen by the app.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  completeSignIn as oauthCompleteSignIn,
  /**
   * Lists the authenticated subject's login identities, independently of API grants.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  listLinkedAccounts as oauthListLinkedAccounts,
  /**
   * Creates the action that confirms deferred OAuth registration.
   *
   * **Details**
   *
   * Opt-in completion is first-confirmed only; every replay returns RegistrationAccepted.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  register as oauthRegister,
  /**
   * Creates the action that starts a fresh OAuth sign-in attempt.
   *
   * **Details**
   *
   * Start a fresh attempt. IDs and the default callback are resolved on the server; credentials are
   * delivered by the request boundary. This action is not replayable.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  signIn as oauthSignIn
} from "./internal/oauth/contracts.ts"

export {
  /**
   * Creates a native HTTP API group from named authentication actions.
   *
   * **Details**
   *
   * Native HttpApi projection of the named transport. Public envelopes are exact; private credentials
   * remain cookies/headers, and private reveals retain their envelope. Server handlers use the same
   * bounded operation decoder before schema projection.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  httpGroup
} from "./internal/http/authContract.ts"
