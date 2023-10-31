/**
 * @since 1.0.0
 */
import * as Schema from "@effect/rpc/Schema"
import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import { dual, pipe } from "effect/Function"
import * as Option from "effect/Option"

/**
 * @category models
 * @since 1.0.0
 */
export type Primitive =
  | null
  | undefined
  | boolean
  | number
  | bigint
  | string
  | Transferable
  | Date
  | RegExp
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array

type PrimitiveArray = ReadonlyArray<WorkerType>
type PrimitiveRecord = { readonly [key: string]: WorkerType }
type PrimitiveMap = Map<WorkerType, WorkerType>
type PrimitiveSet = Set<WorkerType>

/**
 * @category models
 * @since 1.0.0
 */
export type WorkerType =
  | Primitive
  | PrimitiveArray
  | PrimitiveRecord
  | PrimitiveMap
  | PrimitiveSet

/**
 * @category constructors
 * @since 1.0.0
 */
export const make = Schema.makeWith<"WebWorkerType", WorkerType>()

/**
 * @since 1.0.0
 */
export const TransferableAnnotationId = Symbol.for(
  "@effect/rpc-workers/TransferableAnnotationId"
)

/**
 * @since 1.0.0
 */
export type TransferableAnnotationId = typeof TransferableAnnotationId

/**
 * @category combinator
 * @since 1.0.0
 */
export const transferable: {
  <I>(
    f: (a: I) => ReadonlyArray<Transferable>
  ): <A>(self: S.Schema<I, A>) => S.Schema<I, A>

  <I, A>(
    self: S.Schema<I, A>,
    f: (a: I) => ReadonlyArray<Transferable>
  ): S.Schema<I, A>
} = dual(
  2,
  <I, A>(self: S.Schema<I, A>, f: (a: I) => ReadonlyArray<Transferable>) =>
    S.annotations({ [TransferableAnnotationId]: f })(self)
)

/**
 * @category combinator
 * @since 1.0.0
 */
export const getTransferables: {
  <I>(value: I): <A>(self: S.Schema<I, A>) => Array<Transferable>

  <I, A>(self: S.Schema<I, A>, value: I): Array<Transferable>
} = dual(
  2,
  <I, A>(self: S.Schema<I, A>, value: I): Array<Transferable> =>
    pipe(
      AST.getAnnotation<(value: I) => Array<Transferable>>(
        TransferableAnnotationId
      )(self.ast),
      Option.map((f) => f(value)),
      Option.getOrElse(() => [])
    )
)
