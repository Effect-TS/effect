/**
 * @since 1.0.0
 */
import type { Headers } from "@effect/platform/Headers"
import type { NonEmptyReadonlyArray } from "effect/Array"
import type { Branded } from "effect/Brand"
import type * as FiberId from "effect/FiberId"
import * as Schema from "effect/Schema"
import type * as Rpc from "./Rpc.js"
import type { RpcClientError } from "./RpcClientError.js"

/**
 * @since 1.0.0
 * @category request
 */
export type FromClient<A extends Rpc.Any> = Request<A> | Ack | Interrupt | Eof

/**
 * @since 1.0.0
 * @category request
 */
export type FromClientEncoded = RequestEncoded | AckEncoded | InterruptEncoded | Ping | Eof

/**
 * @since 1.0.0
 * @category request
 */
export const RequestIdTypeId: unique symbol = Symbol.for("@effect/rpc/RpcServer/RequestId")

/**
 * @since 1.0.0
 * @category request
 */
export type RequestIdTypeId = typeof RequestIdTypeId

/**
 * @since 1.0.0
 * @category request
 */
export type RequestId = Branded<bigint, RequestIdTypeId>

/**
 * @since 1.0.0
 * @category request
 */
export const RequestId = (id: bigint | string): RequestId =>
  typeof id === "bigint" ? id as RequestId : BigInt(id) as RequestId

/**
 * @since 1.0.0
 * @category request
 */
export interface RequestEncoded {
  readonly _tag: "Request"
  readonly id: string
  readonly tag: string
  readonly payload: unknown
  readonly headers: ReadonlyArray<[string, string]>
  readonly traceId?: string | undefined
  readonly spanId?: string | undefined
  readonly sampled?: boolean | undefined
}

/**
 * @since 1.0.0
 * @category request
 */
export interface Request<A extends Rpc.Any> {
  readonly _tag: "Request"
  readonly id: RequestId
  readonly tag: Rpc.Tag<A>
  readonly payload: Rpc.Payload<A>
  readonly headers: Headers
  readonly traceId?: string | undefined
  readonly spanId?: string | undefined
  readonly sampled?: boolean | undefined
}

/**
 * @since 1.0.0
 * @category request
 */
export interface Ack {
  readonly _tag: "Ack"
  readonly requestId: RequestId
}

/**
 * @since 1.0.0
 * @category request
 */
export interface Interrupt {
  readonly _tag: "Interrupt"
  readonly requestId: RequestId
  readonly interruptors: ReadonlyArray<FiberId.FiberId>
}

/**
 * @since 1.0.0
 * @category request
 */
export interface AckEncoded {
  readonly _tag: "Ack"
  readonly requestId: string
}

/**
 * @since 1.0.0
 * @category request
 */
export interface InterruptEncoded {
  readonly _tag: "Interrupt"
  readonly requestId: string
}

/**
 * @since 1.0.0
 * @category request
 */
export interface Eof {
  readonly _tag: "Eof"
}

/**
 * @since 1.0.0
 * @category request
 */
export interface Ping {
  readonly _tag: "Ping"
}

/**
 * @since 1.0.0
 * @category request
 */
export const constEof: Eof = { _tag: "Eof" }

/**
 * @since 1.0.0
 * @category request
 */
export const constPing: Ping = { _tag: "Ping" }

/**
 * @since 1.0.0
 * @category response
 */
export type FromServer<A extends Rpc.Any> =
  | ResponseChunk<A>
  | ResponseExit<A>
  | ResponseDefect
  | ClientEnd

/**
 * @since 1.0.0
 * @category response
 */
export type FromServerEncoded =
  | ResponseChunkEncoded
  | ResponseExitEncoded
  | ResponseDefectEncoded
  | Pong
  | ClientProtocolError

/**
 * @since 1.0.0
 * @category response
 */
export const ResponseIdTypeId: unique symbol = Symbol.for("@effect/rpc/RpcServer/ResponseId")

/**
 * @since 1.0.0
 * @category response
 */
export type ResponseIdTypeId = typeof ResponseIdTypeId

/**
 * @since 1.0.0
 * @category response
 */
export type ResponseId = Branded<number, ResponseIdTypeId>

/**
 * @since 1.0.0
 * @category response
 */
export interface ResponseChunkEncoded {
  readonly _tag: "Chunk"
  readonly requestId: string
  readonly values: NonEmptyReadonlyArray<unknown>
}

/**
 * @since 1.0.0
 * @category response
 */
export interface ResponseChunk<A extends Rpc.Any> {
  readonly _tag: "Chunk"
  readonly clientId: number
  readonly requestId: RequestId
  readonly values: NonEmptyReadonlyArray<Rpc.SuccessChunk<A>>
}

/**
 * @since 1.0.0
 * @category response
 */
export interface ResponseExitEncoded {
  readonly _tag: "Exit"
  readonly requestId: string
  readonly exit: Schema.ExitEncoded<unknown, unknown, unknown>
}

/**
 * @since 1.0.0
 * @category response
 */
export interface ClientProtocolError {
  readonly _tag: "ClientProtocolError"
  readonly error: RpcClientError
}

/**
 * @since 1.0.0
 * @category response
 */
export interface ResponseExit<A extends Rpc.Any> {
  readonly _tag: "Exit"
  readonly clientId: number
  readonly requestId: RequestId
  readonly exit: Rpc.Exit<A>
}

/**
 * @since 1.0.0
 * @category response
 */
export interface ResponseDefectEncoded {
  readonly _tag: "Defect"
  readonly defect: unknown
}

const encodeDefect = Schema.encodeSync(Schema.Defect)

/**
 * @since 1.0.0
 * @category response
 */
export const ResponseDefectEncoded = (input: unknown): ResponseDefectEncoded => ({
  _tag: "Defect",
  defect: encodeDefect(input)
})

/**
 * @since 1.0.0
 * @category response
 */
export interface ResponseDefect {
  readonly _tag: "Defect"
  readonly clientId: number
  readonly defect: unknown
}

/**
 * @since 1.0.0
 * @category response
 */
export interface ClientEnd {
  readonly _tag: "ClientEnd"
  readonly clientId: number
}

/**
 * @since 1.0.0
 * @category response
 */
export interface Pong {
  readonly _tag: "Pong"
}

/**
 * @since 1.0.0
 * @category response
 */
export const constPong: Pong = { _tag: "Pong" }
