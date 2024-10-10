import * as Arbitrary from "@effect/schema/Arbitrary"
import type * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type { TestServices } from "effect/TestServices"
import fc from "fast-check"
import * as V from "vitest"
import * as internal from "./internal.js"

/**
 * @since 1.0.0
 */
type SchemaObj<A, E, R> = Array<Schema.Schema<A, E, R>> | { [K in string]: Schema.Schema<A, E, R> }

/**
 * @since 1.0.0
 */
export type TestFn<S extends SchemaObj<any, any, any>, R> = (
  schemas: { [K in keyof S]: Schema.Schema.Type<S[K]> },
  ctx: V.TaskContext<V.RunnerTestCase<{}>> & V.TestContext
) => R

/**
 * @internal
 */
const makePropTester = () => {
  const f = <S extends SchemaObj<any, any, any>>(
    name: string,
    schemaObj: S,
    fn: TestFn<S, boolean | void | Promise<boolean | void>>,
    timeout?: number | V.TestOptions
  ) => {
    if (Array.isArray(schemaObj)) {
      const arbs = schemaObj.map((schema) => Arbitrary.make(schema))
      return V.it(
        name,
        // @ts-ignore
        (ctx) => fc.assert(fc.asyncProperty(...arbs, (...as) => fn(as as any, ctx))),
        timeout
      )
    }

    const arbs = fc.record(
      Object.keys(schemaObj).reduce(function(result, key) {
        result[key] = Arbitrary.make(schemaObj[key])
        return result
      }, {} as Record<string, fc.Arbitrary<any>>)
    )

    return V.it(
      name,
      // @ts-ignore
      (ctx) => fc.assert(fc.asyncProperty(arbs, (...as) => fn(as[0] as any, ctx))),
      timeout
    )
  }

  const effect = <S extends SchemaObj<any, any, any>>(
    name: string,
    schemaObj: S,
    fn: TestFn<S, Effect.Effect<boolean | void, never, TestServices>>,
    timeout?: number | V.TestOptions
  ) =>
    f(
      name,
      schemaObj,
      (obj, ctx) => Effect.runPromise(fn(obj, ctx).pipe(Effect.provide(internal.TestEnv))),
      timeout
    )

  const live = <S extends SchemaObj<any, any, any>>(
    name: string,
    schemaObj: S,
    fn: TestFn<S, Effect.Effect<boolean | void>>,
    timeout?: number | V.TestOptions
  ) =>
    f(
      name,
      schemaObj,
      (obj, ctx) => Effect.runPromise(fn(obj, ctx)),
      timeout
    )

  const scoped = <S extends SchemaObj<any, any, any>>(
    name: string,
    schemaObj: S,
    fn: TestFn<S, Effect.Effect<boolean | void, never, Scope.Scope | TestServices>>,
    timeout?: number | V.TestOptions
  ) =>
    f(
      name,
      schemaObj,
      (obj, ctx) => Effect.runPromise(fn(obj, ctx).pipe(Effect.scoped, Effect.provide(internal.TestEnv))),
      timeout
    )

  const scopedLive = <S extends SchemaObj<any, any, any>>(
    name: string,
    schemaObj: S,
    fn: TestFn<S, Effect.Effect<boolean | void, never, Scope.Scope>>,
    timeout?: number | V.TestOptions
  ) =>
    f(
      name,
      schemaObj,
      (obj, ctx) => Effect.runPromise(fn(obj, ctx).pipe(Effect.scoped)),
      timeout
    )

  return Object.assign(f, {
    effect,
    scoped,
    live,
    scopedLive
  })
}

export const prop = makePropTester()
