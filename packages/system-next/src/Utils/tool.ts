// ets_tracing: off

/** from ts-toolbelt, minimal port of Compute */

export type Depth = "flat" | "deep"

type Errors = Error
// | EvalError
// | RangeError
// | ReferenceError
// | SyntaxError
// | TypeError
// | URIError

type Numeric =
  // | Number
  // | BigInt // not needed
  // | Math
  Date

type Textual =
  // | String
  RegExp

type Arrays =
  // | Array<unknown>
  // | ReadonlyArray<unknown>
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
// | BigInt64Array
// | BigUint64Array

type Maps =
  // | Map<unknown, unknown>
  // | Set<unknown>
  | ReadonlyMap<unknown, unknown>
  | ReadonlySet<unknown>
  | WeakMap<object, unknown>
  | WeakSet<object>

type Structures =
  | ArrayBuffer
  // | SharedArrayBuffer
  // | Atomics
  | DataView
// | JSON

type Abstractions = Function | Promise<unknown> | Generator
// | GeneratorFunction

type WebAssembly = never

export type BuiltInObject =
  | Errors
  | Numeric
  | Textual
  | Arrays
  | Maps
  | Structures
  | Abstractions
  | WebAssembly

export type ComputeRaw<A> = A extends Function
  ? A
  : {
      [K in keyof A]: A[K]
    } & {}

export type ComputeFlat<A> = A extends BuiltInObject
  ? A
  : {
      [K in keyof A]: A[K]
    } & {}

export type ComputeDeep<A> = A extends BuiltInObject
  ? A
  : {
      [K in keyof A]: ComputeDeep<A[K]>
    } & {}

export type Compute<A, depth extends Depth = "deep"> = {
  flat: ComputeFlat<A>
  deep: ComputeDeep<A>
}[depth]
