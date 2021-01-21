import { pipe } from "@effect-ts/system/Function"
import { intersect } from "@effect-ts/system/Utils"

import * as T from "../../src/Effect"
import * as Ex from "../../src/Effect/Exit"
import * as O from "../../src/Option"
import * as OptionT from "../../src/OptionT"
import * as P from "../../src/Prelude"

export const Monad = OptionT.monad(T.Monad)
export const Applicative = OptionT.applicative(T.Applicative)

function dsl() {
  const { any, both, flatten, map } = intersect(Monad, Applicative)

  const chain = P.chainF(Monad)
  const succeed = P.succeedF(Monad)
  const ap = P.apF(Applicative)
  const bind = P.bindF(Monad)
  const do_ = P.doF(Monad)
  const struct = P.structF(Applicative)
  const tuple = P.tupleF(Applicative)
  const gen = P.genF(Monad)

  return {
    any,
    both,
    flatten,
    map,
    chain,
    succeed,
    ap,
    bind,
    do: do_,
    struct,
    tuple,
    gen
  }
}

const EO = dsl()

it("use effectOption", async () => {
  const program = EO.gen(function* (_) {
    const x = yield* _(EO.succeed(1))
    const y = yield* _(T.succeed(O.some(2)))
    return x + y
  })

  const res = await pipe(program, T.runPromiseExit)

  expect(res).toEqual(Ex.succeed(O.some(3)))
})
