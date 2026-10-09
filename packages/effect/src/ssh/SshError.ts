/**
 * Errors raised by the SSH client, key, agent, and SFTP modules.
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
 * Error reason for a key exchange that found no algorithm supported by both
 * the client and the server.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class SshNegotiationError extends Schema.Error<SshNegotiationError>("effect/ssh/SshError/SshNegotiationError")({
  _tag: Schema.tag("SshNegotiationError"),
  algorithm: Schema.String,
  client: Schema.Array(Schema.String),
  server: Schema.Array(Schema.String)
}) {
  override get message() {
    return `No common ${this.algorithm} algorithm (client: ${this.client.join(",")}; server: ${this.server.join(",")})`
  }
}

/**
 * Error reason for a server host key that was rejected by the host key
 * verifier, changed during a re-key, or produced an invalid signature.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class SshHostKeyError extends Schema.Error<SshHostKeyError>("effect/ssh/SshError/SshHostKeyError")({
  _tag: Schema.tag("SshHostKeyError"),
  kind: Schema.Literals(["Unknown", "Mismatch", "Revoked", "Changed", "InvalidSignature"]),
  host: Schema.String,
  keyType: Schema.String,
  fingerprint: Schema.String
}) {
  override get message() {
    switch (this.kind) {
      case "Unknown":
        return `Host key for ${this.host} is not trusted (${this.keyType} ${this.fingerprint})`
      case "Mismatch":
        return `Host key for ${this.host} does not match the trusted key (${this.keyType} ${this.fingerprint})`
      case "Revoked":
        return `Host key for ${this.host} has been revoked (${this.keyType} ${this.fingerprint})`
      case "Changed":
        return `Host key for ${this.host} changed during re-key (${this.keyType} ${this.fingerprint})`
      case "InvalidSignature":
        return `Host key signature for ${this.host} is invalid (${this.keyType} ${this.fingerprint})`
    }
  }
}

/**
 * Error reason for a user authentication attempt that exhausted every
 * configured method.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class SshAuthenticationError extends Schema.Error<SshAuthenticationError>(
  "effect/ssh/SshError/SshAuthenticationError"
)({
  _tag: Schema.tag("SshAuthenticationError"),
  username: Schema.String,
  allowedMethods: Schema.Array(Schema.String),
  attemptedMethods: Schema.Array(Schema.String)
}) {
  override get message() {
    return `Authentication failed for ${this.username} (attempted: ${
      this.attemptedMethods.join(",") || "none"
    }; server allows: ${this.allowedMethods.join(",") || "none"})`
  }
}

/**
 * Error reason for an `SSH_MSG_DISCONNECT` sent by the server.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class SshDisconnectError extends Schema.Error<SshDisconnectError>("effect/ssh/SshError/SshDisconnectError")({
  _tag: Schema.tag("SshDisconnectError"),
  code: Schema.Int,
  description: Schema.String
}) {
  override get message() {
    return `Server disconnected (${this.code}): ${this.description}`
  }
}

/**
 * Error reason for a channel open request rejected by the server.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class SshChannelOpenError extends Schema.Error<SshChannelOpenError>("effect/ssh/SshError/SshChannelOpenError")({
  _tag: Schema.tag("SshChannelOpenError"),
  channelType: Schema.String,
  code: Schema.Int,
  description: Schema.String
}) {
  override get message() {
    return `Could not open ${this.channelType} channel (${this.code})${this.description ? `: ${this.description}` : ""}`
  }
}

/**
 * Error reason for a channel or global request that the server refused.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class SshRequestError extends Schema.Error<SshRequestError>("effect/ssh/SshError/SshRequestError")({
  _tag: Schema.tag("SshRequestError"),
  requestType: Schema.String
}) {
  override get message() {
    return `The server refused the ${this.requestType} request`
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
 * Error reason for a key that could not be parsed, imported, or used.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class SshKeyError extends Schema.Error<SshKeyError>("effect/ssh/SshError/SshKeyError")({
  _tag: Schema.tag("SshKeyError"),
  description: Schema.String,
  cause: Schema.optional(Schema.Defect())
}) {
  override get message() {
    return `SSH key error: ${this.description}`
  }
}

/**
 * Error reason for an SSH agent request that failed or was refused.
 *
 * @stability experimental
 * @category errors
 * @since 4.0.0
 */
export class SshAgentError extends Schema.Error<SshAgentError>("effect/ssh/SshError/SshAgentError")({
  _tag: Schema.tag("SshAgentError"),
  description: Schema.String,
  cause: Schema.optional(Schema.Defect())
}) {
  override get message() {
    return `SSH agent error: ${this.description}`
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
  SshNegotiationError,
  SshHostKeyError,
  SshAuthenticationError,
  SshDisconnectError,
  SshChannelOpenError,
  SshRequestError,
  SshChannelError,
  SshKeyError,
  SshAgentError,
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
  | SshNegotiationError
  | SshHostKeyError
  | SshAuthenticationError
  | SshDisconnectError
  | SshChannelOpenError
  | SshRequestError
  | SshChannelError
  | SshKeyError
  | SshAgentError
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
