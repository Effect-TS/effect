// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"
import { left, right } from "@effect-ts/system/Either"
import * as O from "@effect-ts/system/Option"

import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"

export const AssociativeEither = P.instance<P.AssociativeEither<[P.URI<OptionURI>]>>({
  orElseEither:
    <B>(fb: () => O.Option<B>) =>
    <A>(fa: O.Option<A>): O.Option<Either<A, B>> =>
      fa._tag === "Some" ? O.some(left(fa.value)) : O.map_(fb(), right)
})
