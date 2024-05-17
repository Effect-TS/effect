/**
 * @since 3.2.0
 */
import * as Context from "./Context.js"
import { identity } from "./Function.js"
import type { ReadonlyRecord } from "./Record.js"
import type { Covariant } from "./Types.js"

/**
 * @since 3.2.0
 */
export const TypeId = Symbol.for("effect/MicroEnv")

/**
 * @since 3.2.0
 */
export type TypeId = typeof TypeId

/**
 * @since 3.2.0
 */
export interface MicroEnv<R> {
  readonly [TypeId]: {
    _R: Covariant<R>
  }
  readonly refs: ReadonlyRecord<string, unknown>
}

/**
 * @since 3.2.0
 */
export const RefTypeId: unique symbol = Symbol.for("effect/MicroEnv/Ref")

/**
 * @since 3.2.0
 */
export type RefTypeId = typeof RefTypeId

/**
 * @since 3.2.0
 */
export interface MicroEnvRef<A> {
  readonly [RefTypeId]: RefTypeId
  readonly key: string
  readonly initial: A
}

// ========================================================================
// Env
// ========================================================================

const EnvProto = {
  [TypeId]: {
    _R: identity
  }
}

/**
 * @since 3.2.0
 */
export const make = <R = never>(
  refs: Record<string, unknown>
): MicroEnv<R> => {
  const self = Object.create(EnvProto)
  self.refs = refs
  return self
}

/**
 * @since 3.2.0
 */
export const unsafeMakeEmpty = (): MicroEnv<never> => {
  const controller = new AbortController()
  const refs = Object.create(null)
  refs[currentAbortController.key] = controller
  refs[currentAbortSignal.key] = controller.signal
  return make(refs)
}

/**
 * @since 3.2.0
 */
export const get = <R, A>(env: MicroEnv<R>, ref: MicroEnvRef<A>): A => env.refs[ref.key] as A ?? ref.initial

/**
 * @since 3.2.0
 */
export const set = <R, A>(env: MicroEnv<R>, ref: MicroEnvRef<A>, value: A): MicroEnv<R> => {
  const refs = Object.assign(Object.create(null), env.refs)
  refs[ref.key] = value
  return make(refs)
}

/**
 * @since 3.2.0
 */
export const mutate = <R>(
  env: MicroEnv<R>,
  f: (map: Record<string, unknown>) => ReadonlyRecord<string, unknown>
): MicroEnv<R> => make(f(Object.assign(Object.create(null), env.refs)))

// ========================================================================
// Env refs
// ========================================================================

const EnvRefProto = {
  [RefTypeId]: RefTypeId
}

/**
 * @since 3.2.0
 */
export const makeRef = <A>(key: string, initial: A): MicroEnvRef<A> => {
  const self = Object.create(EnvRefProto)
  self.key = key
  self.initial = initial
  return self
}

/**
 * @since 3.2.0
 */
export const currentAbortController: MicroEnvRef<AbortController> = makeRef(
  "effect/Micro/currentAbortController",
  new AbortController()
)

/**
 * @since 3.2.0
 */
export const currentAbortSignal: MicroEnvRef<AbortSignal> = makeRef(
  "effect/Micro/currentAbortSignal",
  currentAbortController.initial.signal
)

/**
 * @since 3.2.0
 */
export const currentContext: MicroEnvRef<Context.Context<never>> = makeRef(
  "effect/Micro/currentContext",
  Context.empty()
)

/**
 * @since 3.2.0
 */
export const currentConcurrency: MicroEnvRef<"unbounded" | number> = makeRef(
  "effect/Micro/currentConcurrency",
  "unbounded"
)
