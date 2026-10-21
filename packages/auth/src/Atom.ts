/**
 * Reactive authentication clients, subject lifetimes, and operation atoms.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Service that owns the current subject’s atom registry and replaces it when authentication changes.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  AuthAtomLifetime,
  /**
   * Current authenticated subject and the atom registry that owns its results.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AuthSubjectLifetime,
  /**
   * Creates a subject lifetime with a dedicated atom registry. The registry is disposed before the
   * next subject is published. Mount only `current` in `controlRegistry`; operation atoms belong to
   * the current subject registry. Acquire the lifetime in the host scope and provide it to the Atom
   * runtime.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeLifetime
} from "./internal/atom/authAtomLifetime.ts"
export {
  /**
   * Each workflow invocation owns one generation fence. Device work stays interruptible; its final
   * authentication call and subject publication settle together.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  AuthAtomWorkflow
} from "./internal/atom/authAtomWorkflow.ts"
export {
  /**
   * Atom type selected from an authentication action’s execution mode.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AuthActionAtom,
  /**
   * Runtime and client-layer settings for constructing authentication atoms.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type AuthAtomOptions,
  /**
   * Typed collection of atoms generated from an authentication action contract.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type AuthAtoms,
  /**
   * Creates importable authentication atoms without acquiring a client. The host registry owns one
   * client scope and replaces private account registries internally. Supply the same runtime factory
   * as other application queries to share invalidation.
   *
   * @stability unstable
   * @category layers
   * @since 4.1.0
   */
  make
} from "./internal/atom/client.ts"
export {
  /**
   * Creates an operation mutation atom in the current subject registry. A subject-changing mutation
   * disposes its old result and publishes the new lifetime; render from `lifetime.current` instead of
   * retaining that mutation’s success.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  mutation,
  /**
   * Creates a query atom in the current subject registry. Queries cannot contain private reveals;
   * declare matching reactivity keys on mutations that invalidate them.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  query,
  /**
   * Keys used to connect authentication mutations with reactive queries.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type ReactivityKeys,
  /**
   * Creates a fenced workflow that composes protocol operations and device effects. Each workflow is
   * fenced at entry, between consumer steps through `current`, and on completion.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  workflow
} from "./internal/atom/operations.ts"
