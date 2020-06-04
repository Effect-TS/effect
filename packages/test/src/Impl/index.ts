import * as a from "assert"

import { getSkip } from "../Aspects/Skip"
import { getTimeout } from "../Aspects/Timeout"
import { getTodo, TodoURI } from "../Aspects/Todo"
import { Spec, Suite, Test, Runner } from "../Def"

import * as T from "@matechs/core/Effect"
import { identity } from "@matechs/core/Function"
import { pipe } from "@matechs/core/Function"
import * as O from "@matechs/core/Option"
import * as F from "@matechs/core/Service"

export const testM = <S, R, E, A>(
  name: string,
  eff?: T.Effect<S, R, E, A>
): Spec<R> => ({
  _R: undefined as any,
  _tag: "test",
  name,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  eff: eff || T.sync(() => {}),
  config: {
    [TodoURI]: eff ? undefined : true
  }
})

export type ROf<S extends Spec<any>> = S extends Spec<infer R>
  ? unknown extends R
    ? never
    : R
  : never

export const suite = (name: string) => <Specs extends Spec<any>[]>(
  ...specs: Specs
): Spec<F.UnionToIntersection<ROf<Exclude<Specs[number], Spec<unknown>>>>> => ({
  _R: undefined as any,
  _tag: "suite",
  name,
  specs
})

export const assert = {
  deepStrictEqual: <T>(actual: any, expected: T, message?: string | Error): void =>
    a.deepStrictEqual(actual, expected, message),
  strictEqual: <T>(actual: any, expected: T, message?: string | Error): void =>
    a.strictEqual(actual, expected, message)
}

export type SpecsEnv<Specs extends Spec<any>[]> = F.UnionToIntersection<
  ROf<Exclude<Specs[number], Spec<unknown>>>
>

export type Provider<R> = (_: T.Effect<any, R, any, any>) => T.Effect<any, {}, any, any>

export const customRun = (_: Runner) => <Specs extends Spec<any>[]>(
  ...specs: Specs
) => (
  provider: unknown extends SpecsEnv<Specs>
    ? void
    : {} extends SpecsEnv<Specs>
    ? void
    : Provider<SpecsEnv<Specs>>
) => {
  specs.map((s) => {
    switch (s._tag) {
      case "suite": {
        desc(_, s, (provider || identity) as any)
        break
      }
      case "test": {
        _.describe(`Root: ${s.name}`, () => {
          runTest(_, s, (provider || identity) as any)
        })
      }
    }
  })
}

function desc<Suites extends Suite<any>[]>(
  _: Runner,
  s: Suite<any>,
  provider: Provider<SpecsEnv<Suites>>
) {
  _.describe(s.name, () => {
    s.specs.map((spec) => {
      switch (spec._tag) {
        case "suite": {
          _.describe(spec.name, () => {
            spec.specs.forEach((child) => {
              switch (child._tag) {
                case "suite": {
                  desc(_, child, provider)
                  break
                }
                case "test": {
                  runTest(_, child, provider)
                  break
                }
              }
            })
          })
          break
        }
        case "test": {
          runTest(_, spec, provider)
          break
        }
      }
    })
  })
}

function runTest<R>(_: Runner, spec: Test<R>, provider: Provider<R>) {
  pipe(
    getSkip(spec),
    O.filter((x): x is true => x === true),
    O.fold(
      () => {
        pipe(
          getTodo(spec),
          O.filter((x): x is true => x === true),
          O.fold(
            () =>
              _.it.run(
                spec.name,
                async () => pipe(spec.eff, provider, T.runToPromise),
                pipe(spec, getTimeout, O.toUndefined)
              ),
            () => _.it.todo(spec.name)
          )
        )
      },
      () => {
        _.it.skip(
          spec.name,
          async () => pipe(spec.eff, provider, T.runToPromise),
          pipe(spec, getTimeout, O.toUndefined)
        )
      }
    )
  )
}
