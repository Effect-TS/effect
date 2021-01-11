import type { Option } from "@effect-ts/core/Common/Option"
import { pipe } from "@effect-ts/core/Function"

import type { At } from "../At"
import * as _ from "../Internal"
import type { Iso } from "../Iso"
import type { Optional } from "../Optional"

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

export interface Index<S, I, A> {
  readonly index: (i: I) => Optional<S, A>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const fromAt = <T, J, B>(at: At<T, J, Option<B>>): Index<T, J, B> => ({
  index: (i) => _.lensComposePrism(_.prismSome<B>())(at.at(i))
})

/**
 * Lift an instance of `Index` using an `Iso`
 */
export const fromIso = <T, S>(iso: Iso<T, S>) => <I, A>(
  sia: Index<S, I, A>
): Index<T, I, A> => ({
  index: (i) => pipe(iso, _.isoAsOptional, _.optionalComposeOptional(sia.index(i)))
})

export const indexArray: <A = never>() => Index<ReadonlyArray<A>, number, A> =
  _.indexArray

export const indexRecord: <A = never>() => Index<
  Readonly<Record<string, A>>,
  string,
  A
> = _.indexRecord
