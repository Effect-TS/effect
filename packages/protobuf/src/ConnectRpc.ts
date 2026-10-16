/**
 * Shared Connect protocol definitions: service naming and error codes.
 *
 * PROTOTYPE — see the package README.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "effect/Context"
import type * as Schema from "effect/Schema"

/**
 * The fully-qualified protobuf service name of an `RpcGroup`, for example
 * `"acme.v1.PointService"`. Each Rpc is served at `/<ServiceName>/<Rpc tag>`.
 *
 * @example
 * ```ts
 * import { Rpc, RpcGroup } from "effect/rpc"
 * import { ConnectRpc } from "@effect/protobuf"
 *
 * const PointService = RpcGroup.make(Rpc.make("Ping")).annotate(
 *   ConnectRpc.ServiceName,
 *   "acme.v1.PointService"
 * )
 * ```
 *
 * @stability unstable
 * @since 4.0.0
 */
export class ServiceName extends Context.Service<ServiceName, string>()("@effect/protobuf/ConnectRpc/ServiceName") {}

/**
 * Connect error codes.
 *
 * @stability unstable
 * @since 4.0.0
 */
export type Code =
  | "canceled"
  | "unknown"
  | "invalid_argument"
  | "deadline_exceeded"
  | "not_found"
  | "already_exists"
  | "permission_denied"
  | "resource_exhausted"
  | "failed_precondition"
  | "aborted"
  | "out_of_range"
  | "unimplemented"
  | "internal"
  | "unavailable"
  | "data_loss"
  | "unauthenticated"

/** @internal */
export const CodeKey = "~effect/protobuf/ConnectRpc/code"

/**
 * Sets the Connect error code used when an error of this schema is sent to a
 * client. Errors without a code are sent as `"unknown"`.
 *
 * @example
 * ```ts
 * import { Schema } from "effect"
 * import { ConnectRpc, Protobuf } from "@effect/protobuf"
 *
 * class NotFound extends Schema.TaggedError<NotFound>("acme.v1.NotFound")("NotFound", {
 *   id: Protobuf.Int32.pipe(Protobuf.field(1))
 * }, ConnectRpc.code("not_found")) {}
 * ```
 *
 * @stability unstable
 * @since 4.0.0
 */
export const code = (code: Code): Schema.Annotations.Annotations => ({ [CodeKey]: code })
