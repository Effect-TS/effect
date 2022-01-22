// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"
import { left, right } from "@effect-ts/system/Either"
import * as O from "@effect-ts/system/Option"

import * as P from "../../PreludeV2/index.js"
import type { OptionF } from "../definitions.js"

export const AssociativeEither = P.instance<P.AssociativeEither<OptionF>>({
  orElseEither:
    <B>(fb: () => O.Option<B>) =>
    <A>(fa: O.Option<A>): O.Option<Either<A, B>> =>
      fa._tag === "Some" ? O.some(left(fa.value)) : O.map_(fb(), right)
})
