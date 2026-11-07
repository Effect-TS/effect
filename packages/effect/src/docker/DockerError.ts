/**
 * The single error type of `effect/docker`.
 *
 * Every operation fails with a {@link DockerError} whose `reason` says what
 * went wrong: an Engine response mapped by its status (following moby's own
 * table), a connection failure, a response that failed to decode, or a
 * client-side check such as {@link UnsupportedApiVersion}.
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
 * @since 4.0.7
 */
import * as Data from "../Data.ts"
import { hasProperty } from "../Predicate.ts"
import * as Schema from "../Schema.ts"
import type * as SchemaIssue from "../SchemaIssue.ts"
import { compareApiVersions } from "./internal/config.ts"

const TypeId = "~effect/docker/DockerError"

/**
 * Returns `true` when a value is a `DockerError`.
 *
 * @stability unstable
 * @category guards
 * @since 4.0.7
 */
export const isDockerError = (u: unknown): u is DockerError => hasProperty(u, TypeId)

/**
 * The error every `effect/docker` operation fails with.
 *
 * **Details**
 *
 * The `reason` holds the specific failure, and `operation` the innermost
 * operation that failed, as its span names it: a method that runs others
 * reports theirs, such as `docker.Exec.inspect` for `start` with an unknown
 * exec.
 * `isRetryable` is `true` only for {@link ConnectionFailed} (unless it names a
 * misconfiguration), {@link TooManyRequests} and {@link Unavailable}. The
 * original error (an `HttpClientError` or a Schema issue) is kept as the
 * `cause`.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.7
 */
export class DockerError extends Data.TaggedError("DockerError")<{
  readonly reason: DockerErrorReason
  /** The innermost operation that failed, as its span names it (`docker.Containers.inspect`). */
  readonly operation?: string | undefined
}> {
  constructor(props: {
    readonly reason: DockerErrorReason
    readonly operation?: string | undefined
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
   * @since 4.0.7
   */
  readonly [TypeId] = TypeId

  /**
   * Whether retrying the operation may succeed.
   *
   * @stability unstable
   * @since 4.0.7
   */
  get isRetryable(): boolean {
    return this.reason.isRetryable
  }

  override get message(): string {
    const { operation, reason } = this
    if ("status" in reason) {
      return `${reason._tag} (${reason.status}${operation === undefined ? "" : ` ${operation}`}): ${reason.message}`
    }
    return operation === undefined ? reason.message : `${operation}: ${reason.message}`
  }
}

// -----------------------------------------------------------------------------
// Engine responses
// -----------------------------------------------------------------------------

// Every class below is both a `DockerError` reason and the Schema that
// `DockerApi` declares the response with: on the wire, the Engine's
// `{ message }` JSON (or a proxy's text) under the class's status. `message` is
// the JSON `message` of the body, otherwise the trimmed body text.

/**
 * The Engine answered 400: the request or one of its parameters is invalid.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.7
 */
export class BadRequest extends Schema.TaggedError<BadRequest>()("BadRequest", { message: Schema.String }) {
  /**
   * The status the Engine answers with: 400.
   *
   * @stability unstable
   * @since 4.0.7
   */
  get status(): 400 {
    return 400
  }

  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
 * @since 4.0.7
 */
export class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", { message: Schema.String }) {
  /**
   * The status the Engine answers with: 401.
   *
   * @stability unstable
   * @since 4.0.7
   */
  get status(): 401 {
    return 401
  }

  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
 * @since 4.0.7
 */
export class Forbidden extends Schema.TaggedError<Forbidden>()("Forbidden", { message: Schema.String }) {
  /**
   * The status the Engine answers with: 403.
   *
   * @stability unstable
   * @since 4.0.7
   */
  get status(): 403 {
    return 403
  }

  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
 * @since 4.0.7
 */
export class NotFound extends Schema.TaggedError<NotFound>()("NotFound", { message: Schema.String }) {
  /**
   * The status the Engine answers with: 404.
   *
   * @stability unstable
   * @since 4.0.7
   */
  get status(): 404 {
    return 404
  }

  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
 * @since 4.0.7
 */
export class Conflict extends Schema.TaggedError<Conflict>()("Conflict", { message: Schema.String }) {
  /**
   * The status the Engine answers with: 409.
   *
   * @stability unstable
   * @since 4.0.7
   */
  get status(): 409 {
    return 409
  }

  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
 * @since 4.0.7
 */
export class PreconditionFailed
  extends Schema.TaggedError<PreconditionFailed>()("PreconditionFailed", { message: Schema.String })
{
  /**
   * The status the Engine answers with: 412.
   *
   * @stability unstable
   * @since 4.0.7
   */
  get status(): 412 {
    return 412
  }

  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
 * @since 4.0.7
 */
export class TooManyRequests
  extends Schema.TaggedError<TooManyRequests>()("TooManyRequests", { message: Schema.String })
{
  /**
   * The status the Engine answers with: 429.
   *
   * @stability unstable
   * @since 4.0.7
   */
  get status(): 429 {
    return 429
  }

  /**
   * Whether retrying may succeed: always for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
 * @since 4.0.7
 */
export class ServerError extends Schema.TaggedError<ServerError>()("ServerError", { message: Schema.String }) {
  /**
   * The status the Engine answers with: 500.
   *
   * @stability unstable
   * @since 4.0.7
   */
  get status(): 500 {
    return 500
  }

  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
 * @since 4.0.7
 */
export class NotImplemented extends Schema.TaggedError<NotImplemented>()("NotImplemented", { message: Schema.String }) {
  /**
   * The status the Engine answers with: 501.
   *
   * @stability unstable
   * @since 4.0.7
   */
  get status(): 501 {
    return 501
  }

  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
 * @since 4.0.7
 */
export class Unavailable extends Schema.TaggedError<Unavailable>()("Unavailable", { message: Schema.String }) {
  /**
   * The status the Engine answers with: 503.
   *
   * @stability unstable
   * @since 4.0.7
   */
  get status(): 503 {
    return 503
  }

  /**
   * Whether retrying may succeed: always for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
 * @since 4.0.7
 */
export class SwarmUnavailable
  extends Schema.TaggedError<SwarmUnavailable>()("SwarmUnavailable", { message: Schema.String })
{
  /**
   * The status the Engine answers with: 503.
   *
   * @stability unstable
   * @since 4.0.7
   */
  get status(): 503 {
    return 503
  }

  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
 * @since 4.0.7
 */
export class UnexpectedStatus extends Data.TaggedError("UnexpectedStatus")<{
  readonly status: number
  readonly message: string
}> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
 * @since 4.0.7
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
   * @since 4.0.7
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
 * @since 4.0.7
 */
export class InvalidResponse extends Data.TaggedError("InvalidResponse")<{
  readonly issue: SchemaIssue.Issue | string
  readonly cause?: unknown
}> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
    return `Invalid response: ${detail}`
  }
}

/**
 * The Engine doesn't serve API 1.52, the one API version the client speaks:
 * its range, `minimum` to `maximum` as `/version` reports it, doesn't
 * include `required`. An older Engine must be upgraded; upgrading the Docker
 * CLI alone isn't enough.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.7
 */
export class UnsupportedApiVersion extends Data.TaggedError("UnsupportedApiVersion")<{
  readonly minimum: string | undefined
  readonly maximum: string | undefined
  readonly required: string
}> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.7
   */
  get isRetryable(): boolean {
    return false
  }
  override get message() {
    const range = `${this.minimum ?? "?"} to ${this.maximum ?? "?"}`
    // an Engine new enough for `required` that has dropped it
    return this.maximum !== undefined && compareApiVersions(this.maximum, this.required) >= 0
      ? `The Docker Engine serves API ${range}, which no longer includes ${this.required}, the API version ` +
        `effect/docker speaks`
      : `The Docker Engine serves API ${range}, but effect/docker needs API ${this.required} ` +
        `(Docker Engine 29.0 or later): upgrade the Docker Engine, not just the Docker CLI`
  }
}

/**
 * A string given as an image reference isn't one: it doesn't fit Docker's
 * reference grammar, its repository has upper-case letters, or it is an image
 * ID. Nothing was sent.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.7
 */
export class InvalidReference extends Data.TaggedError("InvalidReference")<{
  readonly reference: string
  readonly issue: SchemaIssue.Issue
}> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
 * @since 4.0.7
 */
export class StreamFailed extends Data.TaggedError("StreamFailed")<{
  readonly message: string
  readonly cause?: unknown
}> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
 * @since 4.0.7
 */
export class StdinNotAttached extends Data.TaggedError("StdinNotAttached")<{}> {
  /**
   * Whether retrying may succeed: never for this reason.
   *
   * @stability unstable
   * @since 4.0.7
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
 * @since 4.0.7
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
   * @since 4.0.7
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
 * @since 4.0.7
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
  | InvalidReference
  | StreamFailed
  | StdinNotAttached
  | CredentialsUnavailable
