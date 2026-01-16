/**
 * @since 1.0.0
 */
import * as Core from "@effect/test"
import type * as Duration from "effect/Duration"
import type * as Layer from "effect/Layer"
import * as V from "vitest"
import type * as Vitest from "../index.js"
import { vitestAdapter } from "./adapter.js"

const defaultApi: Vitest.API = Object.assign(V.it, { scopedFixtures: V.it.scoped })

/** @internal */
export const addEqualityTesters = () => {
  Core.addEqualityTesters(vitestAdapter)
}

/** @internal */
export const flakyTest = Core.flakyTest

/** @internal */
export const prop: Vitest.Vitest.Methods["prop"] = Core.prop<V.TestContext, V.TestContext>(vitestAdapter)

/** @internal */
export const layer = <R, E, const ExcludeTestServices extends boolean = false>(
  layer_: Layer.Layer<R, E>,
  options?: {
    readonly memoMap?: Layer.MemoMap
    readonly timeout?: Duration.DurationInput
    readonly excludeTestServices?: ExcludeTestServices
  }
): {
  (f: (it: Vitest.Vitest.MethodsNonLive<R, ExcludeTestServices>) => void): void
  (
    name: string,
    f: (it: Vitest.Vitest.MethodsNonLive<R, ExcludeTestServices>) => void
  ): void
} => Core.layer<V.TestContext, V.TestContext>(vitestAdapter, defaultApi)(layer_, options) as any

/** @internal */
export const makeMethods = (it: Vitest.API): Vitest.Vitest.Methods => {
  const methods = Core.makeMethods<V.TestContext, V.TestContext>(vitestAdapter, it)
  return Object.assign(it, {
    effect: methods.effect as Vitest.Vitest.Methods["effect"],
    scoped: methods.scoped as Vitest.Vitest.Methods["scoped"],
    live: methods.live as Vitest.Vitest.Methods["live"],
    scopedLive: methods.scopedLive as Vitest.Vitest.Methods["scopedLive"],
    flakyTest: methods.flakyTest,
    layer: layer as Vitest.Vitest.Methods["layer"],
    prop: methods.prop as Vitest.Vitest.Methods["prop"]
  })
}

/** @internal */
export const {
  /** @internal */
  effect,
  /** @internal */
  live,
  /** @internal */
  scoped,
  /** @internal */
  scopedLive
} = makeMethods(defaultApi)

/** @internal */
export const describeWrapped = (name: string, f: (it: Vitest.Vitest.Methods) => void): V.SuiteCollector =>
  V.describe(name, (it) => f(makeMethods(Object.assign(it, { scopedFixtures: it.scoped }))))
