import { pipe } from "@effect-ts/system/Function"
import { orElseF } from "packages/core/src/Prelude"

import * as O from "../../src/Classic/Option"
import * as ReaderT from "../../src/Classic/ReaderT"

const Monad = ReaderT.monad(O.Monad)
const AssociativeEither = ReaderT.associativeEither(O.AssociativeEither)

const orElse = orElseF({ ...Monad, ...AssociativeEither })

interface D {
  _tag: "_D"
}
interface A {
  _tag: "_A"
}
interface B {
  _tag: "_B"
}
interface C {
  _tag: "_C"
}

declare const fa: (d: D) => O.Option<A>
declare const fb: (d: D) => O.Option<B>
declare const fc: (d: D) => O.Option<C>

export const first = pipe(
  fa,
  orElse(() => fb),
  orElse(() => fc)
)
