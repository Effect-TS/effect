import type { HKTFull } from "./hkt"
import type { KindFull } from "./kind"
import type { URIS } from "./registry"

export type OrNever<K> = unknown extends K ? never : K

export type InferOutF<F, K> = [K] extends [
  HKTFull<F, any, any, any, any, any, any, any, any, any, any, any, any, any, infer X>
]
  ? X
  : never

export type InferOutK<F extends URIS, K> = [K] extends [
  KindFull<F, any, any, any, any, any, any, any, any, any, any, any, any, any, infer X>
]
  ? X
  : never

export type InferErrF<F, K> = [K] extends [
  HKTFull<F, any, any, any, any, any, any, any, any, any, any, any, any, infer X, any>
]
  ? X
  : never

export type InferErrK<F extends URIS, K> = [K] extends [
  KindFull<F, any, any, any, any, any, any, any, any, any, any, any, any, infer X, any>
]
  ? X
  : never

export type InferEnvF<F, K> = [K] extends [
  HKTFull<F, any, any, any, any, any, any, any, any, any, any, any, infer X, any, any>
]
  ? X
  : never

export type InferEnvK<F extends URIS, K> = [K] extends [
  KindFull<F, any, any, any, any, any, any, any, any, any, any, any, infer X, any, any>
]
  ? X
  : never

export type InferInF<F, K> = [K] extends [
  HKTFull<F, any, any, any, any, any, any, any, any, any, infer X, any, any, any, any>
]
  ? X
  : never

export type InferInK<F extends URIS, K> = [K] extends [
  KindFull<F, any, any, any, any, any, any, any, any, any, infer X, any, any, any, any>
]
  ? X
  : never

export type InferXF<F, K> = [K] extends [
  HKTFull<F, any, any, any, any, any, any, any, any, infer X, any, any, any, any, any>
]
  ? X
  : never

export type InferXK<F extends URIS, K> = [K] extends [
  KindFull<F, any, any, any, any, any, any, any, any, infer X, any, any, any, any, any>
]
  ? X
  : never

export type InferNKF<F, K> = [K] extends [
  HKTFull<F, any, any, any, any, any, infer X, any, any, any, any, any, any, any, any>
]
  ? X
  : never

export type InferNKK<F extends URIS, K> = [K] extends [
  KindFull<F, any, any, any, any, any, infer X, any, any, any, any, any, any, any, any>
]
  ? X
  : never

export type InferKF<F, K> = [K] extends [
  HKTFull<F, any, any, any, any, infer X, any, any, any, any, any, any, any, any, any>
]
  ? X
  : never

export type InferKK<F extends URIS, K> = [K] extends [
  KindFull<F, any, any, any, any, infer X, any, any, any, any, any, any, any, any, any>
]
  ? X
  : never
