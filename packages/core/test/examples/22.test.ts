import { pipe } from "@effect-ts/system/Function"
import { intersect } from "@effect-ts/system/Utils"

import * as Ex from "../../src/Effect/Exit/index.js"
import * as T from "../../src/Effect/index.js"
import * as O from "../../src/Option/index.js"
import * as OptionT from "../../src/OptionT/index.js"
import * as DSL from "../../src/Prelude/DSL/index.js"
import * as P from "../../src/Prelude/index.js"

export namespace EO {
  export const EffectOption = P.intersect(
    OptionT.monad(T.Monad),
    OptionT.applicative(T.Applicative),
    OptionT.access(intersect(T.Access, T.Covariant)),
    OptionT.provide(T.Provide)
  )

  export const { access, any, both, flatten, map, provide } = EffectOption

  export const chain = DSL.chainF(EffectOption)
  export const succeed = DSL.succeedF(EffectOption)
  export const ap = DSL.apF(EffectOption)
  export const { bind, do: do_ } = DSL.getDo(EffectOption)
  export const struct = DSL.structF(EffectOption)
  export const tuple = DSL.tupleF(EffectOption)
  export const gen = DSL.genF(EffectOption)
}

test("use effectOption", async () => {
  const program: T.Effect<unknown, never, O.Option<number>> = EO.gen(function* (_) {
    const x = yield* _(EO.succeed(1))
    const y = yield* _(EO.succeed(2))
    return x + y
  })

  const res: Ex.Exit<never, O.Option<number>> = await pipe(
    program,
    EO.chain((n) => EO.access(({ base }: { base: number }) => n + base)),
    EO.provide({ base: 1 }),
    T.runPromiseExit
  )

  expect(res).toEqual(Ex.succeed(O.some(4)))
})
