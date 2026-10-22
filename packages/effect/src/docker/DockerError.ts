/**
 * The single error type of `effect/docker`.
 *
 * Every operation fails with a {@link DockerError} whose `reason` says what
 * went wrong: an Engine response mapped by its status (following moby's own
 * table), a connection failure, a response that failed to decode, or a
 * client-side check such as {@link OptionNotSupported}.
 * Function types are never narrowed per operation; each function's
 * documentation lists the reasons it typically produces instead.
 *
 * Callers match with `Effect.catchReason`, `Effect.catchReasons` and
 * `Effect.unwrapReason`, and retry with a `Schedule` guided by `isRetryable`.
 * Nothing in `effect/docker` retries or times out on its own.
 *
 * **Example** (Checking that the Engine is reachable)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { DockerSystem } from "effect/docker"
 *
 * const isReachable = DockerSystem.DockerSystem.use((system) => system.ping).pipe(
 *   Effect.as(true),
 *   Effect.catchReason("DockerError", "ConnectionFailed", () => Effect.succeed(false))
 * )
 * ```
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Data from "../Data.ts"
import { hasProperty } from "../Predicate.ts"
import type * as SchemaIssue from "../SchemaIssue.ts"

const TypeId = "~effect/docker/DockerError"

/**
 * Returns `true` when a value is a `DockerError`.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.6
 */
export const isDockerError = (u: unknown): u is DockerError => hasProperty(u, TypeId)

/**
 * The error every `effect/docker` operation fails with.
 *
 * **Details**
 *
 * The `reason` holds the specific failure. `isRetryable` is `true` only for
 * {@link ConnectionFailed} (unless it names a misconfiguration), {@link TooManyRequests}
 * and {@link Unavailable}.
 * The original error (an `HttpClientError` or a Schema issue) is kept as the
 * `cause`.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class DockerError extends Data.TaggedError("DockerError")<{
  readonly reason: DockerErrorReason
}> {
  constructor(props: {
    readonly reason: DockerErrorReason
  }) {
    if ("cause" in props.reason && props.reason.cause !== undefined) {
      super({ ...props, cause: props.reason.cause } as any)
    } else {
      super(props)
    }
  }

  /**
   * Marks this value as a `DockerError` for runtime guards.
   *
   * @stability unstable
   * @since 4.0.6
   */
  readonly [TypeId] = TypeId

  /**
   * Whether retrying the operation may succeed.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return this.reason.isRetryable
  }

  override get message(): string {
    const reason = this.reason
    return "status" in reason
      ? `${reason._tag} (${reason.status} ${reason.operation}): ${reason.message}`
      : reason.message
  }
}

// -----------------------------------------------------------------------------
// Engine responses
// -----------------------------------------------------------------------------

/**
 * The fields of an Engine response that isn't a success.
 *
 * **Details**
 *
 * `message` is the JSON `message` of the body, otherwise the trimmed body
 * text. `operation` names the operation that sent the request, as its span
 * does (`docker.Containers.inspect`).
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export interface ResponseFields {
  readonly status: number
  readonly message: string
  readonly operation: string
}

/**
 * The Engine answered 400: the request or one of its parameters is invalid.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class BadRequest extends Data.TaggedError("BadRequest")<ResponseFields> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
}

/**
 * The Engine or a registry answered 401. The client never re-authenticates.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class Unauthorized extends Data.TaggedError("Unauthorized")<ResponseFields> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
}

/**
 * The Engine answered 403.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class Forbidden extends Data.TaggedError("Forbidden")<ResponseFields> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
}

/**
 * The Engine answered 404: the container, image, network, volume or exec
 * doesn't exist, or the Engine has no such route.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class NotFound extends Data.TaggedError("NotFound")<ResponseFields> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
}

/**
 * The Engine answered 409, for example removing a running container or
 * creating a container whose name is taken.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class Conflict extends Data.TaggedError("Conflict")<ResponseFields> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
}

/**
 * The Engine answered 412.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class PreconditionFailed extends Data.TaggedError("PreconditionFailed")<ResponseFields> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
}

/**
 * The Engine answered 429, typically a registry rate limit on pull.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class TooManyRequests extends Data.TaggedError("TooManyRequests")<ResponseFields> {
  /**
   * Whether retrying may succeed: always for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return true
  }
}

/**
 * The Engine answered 500.
 *
 * **Details**
 *
 * Not retryable: Docker uses 500 for permanent failures such as "port is
 * already allocated".
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class ServerError extends Data.TaggedError("ServerError")<ResponseFields> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
}

/**
 * The Engine answered 501.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class NotImplemented extends Data.TaggedError("NotImplemented")<ResponseFields> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
}

/**
 * The Engine answered 503. A Swarm endpoint's 503 is {@link SwarmUnavailable}
 * instead.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class Unavailable extends Data.TaggedError("Unavailable")<ResponseFields> {
  /**
   * Whether retrying may succeed: always for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return true
  }
}

/**
 * A Swarm endpoint answered 503: the node can't serve Swarm requests in its
 * current state.
 *
 * **Details**
 *
 * The Engine answers 503 when the node isn't in a Swarm, is a worker, is
 * locked, is already a member (`init`, `join`), has expired certificates, or
 * is still joining in the background after a `join` timed out; `message`
 * says which. Unlike {@link Unavailable}, retrying doesn't help until the
 * node's state changes. `DockerSystem`'s `ping` reports that state as
 * `swarm` without a Swarm request.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class SwarmUnavailable extends Data.TaggedError("SwarmUnavailable")<ResponseFields> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
}

/**
 * The Engine answered with a status outside moby's table (anything other than
 * a success, a redirect, or 400, 401, 403, 404, 409, 412, 429, 500, 501, 503).
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class UnexpectedStatus extends Data.TaggedError("UnexpectedStatus")<ResponseFields> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
}

// -----------------------------------------------------------------------------
// other reasons
// -----------------------------------------------------------------------------

/**
 * Connecting to the Engine failed, or the connection dropped mid-request or
 * mid-stream.
 *
 * **Details**
 *
 * `target` is the Engine's address, `unix:///path` or `tcp://host:port`,
 * without any TLS material. `hint` is a best-effort explanation (a missing
 * socket, permission denied, a TLS/plain mismatch). A missing hint is not an
 * error.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class ConnectionFailed extends Data.TaggedError("ConnectionFailed")<{
  readonly cause: unknown
  readonly target: string
  readonly hint?: string | undefined
  /** The hint names a misconfiguration a retry can't fix: permission denied, or TLS. */
  readonly permanent?: boolean | undefined
}> {
  /**
   * Whether retrying may succeed: unless the hint names a misconfiguration
   * (permission denied, or TLS).
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return this.permanent !== true
  }
  override get message() {
    const detail = causeMessages(this.cause)
    return `Failed to connect to the Engine at ${this.target}${detail === "" ? "" : `: ${detail}`}${
      this.hint ? ` (${this.hint})` : ""
    }`
  }
}

/**
 * The messages of an error and its causes, outermost first. An
 * `HttpClientError`'s own message only names the request, so its runtime
 * error's messages stand in for it.
 */
const causeMessages = (u: unknown): string => {
  const messages: Array<string> = []
  for (let i = 0; i < 8 && u instanceof Error; i++) {
    const tag = (u as { readonly _tag?: unknown })._tag
    if (tag !== "HttpClientError" && u.message !== "" && messages.at(-1) !== u.message) messages.push(u.message)
    u = u.cause
  }
  return messages.join(": ")
}

/**
 * A response, or an element of a stream, failed to decode.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class InvalidResponse extends Data.TaggedError("InvalidResponse")<{
  readonly issue: SchemaIssue.Issue | string
  /** The method that received it, such as `docker.Containers.inspect`. */
  readonly operation: string
  readonly cause?: unknown
}> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
  override get message() {
    const detail = typeof this.issue === "string"
      ? this.issue
      : this.cause instanceof Error
      ? this.cause.message
      : String(this.issue)
    return `Invalid response from ${this.operation}: ${detail}`
  }
}

/**
 * The Engine can't serve the minimum API version, 1.44. (A pinned version
 * below it fails `DockerConfig`'s layers instead.)
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class UnsupportedApiVersion extends Data.TaggedError("UnsupportedApiVersion")<{
  readonly engineVersion: string
  readonly minimum: string
}> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
  override get message() {
    return `The Engine serves API ${this.engineVersion}, but at least ${this.minimum} is required`
  }
}

/**
 * A request option or body field, or the operation itself, is newer than
 * the negotiated API version. The request was not sent.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class OptionNotSupported extends Data.TaggedError("OptionNotSupported")<{
  readonly option: string
  readonly requiredVersion: string
  readonly negotiatedVersion: string
}> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
  override get message() {
    return `${this.option} requires API ${this.requiredVersion}, but the negotiated version is ${this.negotiatedVersion}`
  }
}

/**
 * A string given as an image reference isn't one: it doesn't fit Docker's
 * reference grammar, its repository has upper-case letters, or it is an image
 * ID. Nothing was sent.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class InvalidReference extends Data.TaggedError("InvalidReference")<{
  readonly reference: string
  readonly issue: SchemaIssue.Issue
}> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
  override get message() {
    return `Invalid image reference ${JSON.stringify(this.reference)}: ${String(this.issue)}`
  }
}

/**
 * A stream reported an error in-band: a systemerr frame in logs, exec or
 * attach output, or a multiplexed stream that ends inside a frame. It is also
 * the reason when the entries given to `copyTo` (`DockerContainers`) fail to
 * encode as a tar archive, with the `TarError` as the `cause`.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class StreamFailed extends Data.TaggedError("StreamFailed")<{
  readonly message: string
  readonly cause?: unknown
}> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
}

/**
 * Something was written to the `stdin` of an exec or attach handle that was
 * created without stdin.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class StdinNotAttached extends Data.TaggedError("StdinNotAttached")<{}> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
  override get message() {
    return "stdin was not attached: create the exec with AttachStdin, or attach with stdin"
  }
}

/**
 * Registry credentials couldn't be resolved: a credential helper is missing,
 * failed, timed out, or answered malformed output. Such failures never turn
 * into an anonymous request.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export class CredentialsUnavailable extends Data.TaggedError("CredentialsUnavailable")<{
  readonly registry: string
  readonly helper?: string | undefined
  readonly message: string
  readonly cause?: unknown
}> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.6
   */
  get isRetryable(): boolean {
    return false
  }
}

/**
 * Every reason a {@link DockerError} can carry.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.6
 */
export type DockerErrorReason =
  | BadRequest
  | Unauthorized
  | Forbidden
  | NotFound
  | Conflict
  | PreconditionFailed
  | TooManyRequests
  | ServerError
  | NotImplemented
  | Unavailable
  | SwarmUnavailable
  | UnexpectedStatus
  | ConnectionFailed
  | InvalidResponse
  | UnsupportedApiVersion
  | OptionNotSupported
  | InvalidReference
  | StreamFailed
  | StdinNotAttached
  | CredentialsUnavailable
