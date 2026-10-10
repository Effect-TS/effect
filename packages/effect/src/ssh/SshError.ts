/**
 * Errors raised by SSH connections, backends, and SFTP.
 *
 * Every failure is an `SshError` wrapping a specific `reason`, so callers can
 * catch all SSH failures with one tag and branch on `error.reason._tag` for
 * details.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Predicate from "../Predicate.ts"
import * as Schema from "../Schema.ts"

/**
 * Type identifier attached to `SshError` values.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.0.0
 */
export type SshErrorTypeId = "~effect/ssh/SshError"

/**
 * Type identifier attached to `SshError` values.
 *
 * @stability experimental
 * @category type IDs
 * @since 4.0.0
 */
export const SshErrorTypeId: SshErrorTypeId = "~effect/ssh/SshError"

/**
 * Returns `true` when a value is an `SshError`.
 *
 * @stability experimental
 * @category guards
 * @since 4.0.0
 */
export const isSshError = (u: unknown): u is SshError => Predicate.hasProperty(u, SshErrorTypeId)

/**
 * Error reason for a failure of the underlying transport socket.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class SshConnectionError extends Schema.Error<SshConnectionError>("effect/ssh/SshError/SshConnectionError")({
  _tag: Schema.tag("SshConnectionError"),
  cause: Schema.Defect()
}) {
  override get message() {
    return "The SSH connection failed"
  }
}

/**
 * Error reason for a malformed, unexpected, or unauthenticated protocol
 * message.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class SshProtocolError extends Schema.Error<SshProtocolError>("effect/ssh/SshError/SshProtocolError")({
  _tag: Schema.tag("SshProtocolError"),
  description: Schema.String,
  cause: Schema.optional(Schema.Defect())
}) {
  override get message() {
    return `SSH protocol error: ${this.description}`
  }
}

/**
 * Error reason for an operation on a channel that is closed or closing.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class SshChannelError extends Schema.Error<SshChannelError>("effect/ssh/SshError/SshChannelError")({
  _tag: Schema.tag("SshChannelError"),
  description: Schema.String
}) {
  override get message() {
    return `SSH channel error: ${this.description}`
  }
}

/**
 * Error reason for a handshake or keep-alive that did not complete in time.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class SshTimeoutError extends Schema.Error<SshTimeoutError>("effect/ssh/SshError/SshTimeoutError")({
  _tag: Schema.tag("SshTimeoutError"),
  description: Schema.String
}) {
  override get message() {
    return `SSH timeout: ${this.description}`
  }
}

/**
 * Error reason for an SFTP request that the server answered with a failure
 * status.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class SshSftpError extends Schema.Error<SshSftpError>("effect/ssh/SshError/SshSftpError")({
  _tag: Schema.tag("SshSftpError"),
  code: Schema.Int,
  description: Schema.String,
  method: Schema.String,
  path: Schema.optional(Schema.String)
}) {
  override get message() {
    return `SFTP ${this.method} failed${this.path !== undefined ? ` (${this.path})` : ""}: ${this.description}`
  }
}

/**
 * Schema for every SSH error reason.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export const SshErrorReason = Schema.Union([
  SshConnectionError,
  SshProtocolError,
  SshChannelError,
  SshTimeoutError,
  SshSftpError
])

/**
 * Union of every SSH error reason.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export type SshErrorReason =
  | SshConnectionError
  | SshProtocolError
  | SshChannelError
  | SshTimeoutError
  | SshSftpError

/**
 * Tagged error wrapping every SSH failure while preserving the specific
 * reason.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class SshError extends Schema.TaggedError<SshError>(SshErrorTypeId)("SshError", {
  _tag: Schema.tag("SshError"),
  reason: SshErrorReason
}) {
  // @effect-diagnostics-next-line overriddenSchemaConstructor:off
  constructor(props: {
    readonly reason: SshErrorReason
  }) {
    if ("cause" in props.reason && props.reason.cause !== undefined) {
      super({
        ...props,
        cause: props.reason.cause
      } as any)
    } else {
      super(props)
    }
  }

  /**
   * Marks this value as an SSH error for runtime guards.
   *
   * @stability experimental
   * @since 4.0.0
   */
  readonly [SshErrorTypeId]: SshErrorTypeId = SshErrorTypeId

  /**
   * Returns `true` when the value is an `SshError`.
   *
   * @stability experimental
   * @since 4.0.0
   */
  static is(u: unknown): u is SshError {
    return isSshError(u)
  }

  override readonly message = this.reason.message
}
