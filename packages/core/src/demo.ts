import * as A from "./Array"
import * as T from "./Effect"
import * as ET from "./EitherT"
import { pipe, tuple } from "./Function"
import * as NA from "./NonEmptyArray"
import * as OT from "./OptionT"
import { chainF } from "./Prelude"
import * as RT from "./ReaderT"
import * as R from "./Record"
import * as ST from "./StateT"

type License = "CC" | "MIT"

interface Hero {
  name: string
  license: License
}

function hero(name: string, license: License): Hero {
  return { name, license }
}

const toRecord = R.fromFoldable(NA.getAssociative<Hero>(), NA.Foldable)

const grouped = pipe(
  [hero("Johannes", "CC"), hero("Mike", "MIT")],
  NA.map((h) => tuple(h.license, NA.single(h))),
  toRecord
)

console.log(grouped)
console.log(grouped)
console.log(grouped)
console.log(grouped)

const EffectOption = OT.monad(T.Monad)
const ArrayEither = ET.monad(A.Monad)
const ReaderArray = RT.monad(A.Monad)
const StateArray = ST.monad(A.Monad)

export const chainEffectOption = chainF(EffectOption)
export const chainArrayEither = chainF(ArrayEither)
export const chainReaderArray = chainF(ReaderArray)
export const chainStateArray = chainF(StateArray)
