import type { Kind, URIS } from "./kind"

export type OrNever<K> = unknown extends K ? never : K

export type InferA<F extends URIS, K> = [K] extends [
  Kind<F, any, any, any, any, any, any, any, any, any, any, infer X>
]
  ? X
  : never

export type InferE<F extends URIS, K> = [K] extends [
  Kind<F, any, any, any, any, any, any, any, any, any, infer X, any>
]
  ? X
  : never

export type InferR<F extends URIS, K> = [K] extends [
  Kind<F, any, any, any, any, any, any, any, any, infer X, any, any>
]
  ? X
  : never

export type InferS<F extends URIS, K> = [K] extends [
  Kind<F, any, any, any, any, any, any, any, infer X, any, any, any>
]
  ? X
  : never

export type InferI<F extends URIS, K> = [K] extends [
  Kind<F, any, any, any, any, any, any, infer X, any, any, any, any>
]
  ? X
  : never

export type InferX<F extends URIS, K> = [K] extends [
  Kind<F, any, any, any, any, any, infer X, any, any, any, any, any>
]
  ? X
  : never

export type InferN<F extends URIS, K> = [K] extends [
  Kind<F, any, infer X, any, any, any, any, any, any, any, any, any>
]
  ? X
  : never

export type InferK<F extends URIS, K> = [K] extends [
  Kind<F, any, any, infer X, any, any, any, any, any, any, any, any>
]
  ? X
  : never
