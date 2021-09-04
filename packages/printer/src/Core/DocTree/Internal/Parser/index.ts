// tracing: off

import * as Tuple from "@effect-ts/core/Collections/Immutable/Tuple"
import * as E from "@effect-ts/core/Either"
import * as O from "@effect-ts/core/Option"
import * as P from "@effect-ts/core/Prelude"
import * as ChainRec from "@effect-ts/core/Prelude/ChainRec"

// -----------------------------------------------------------------------------
// model
// -----------------------------------------------------------------------------

export interface Parser<S, A> {
  (stream: S): O.Option<Tuple.Tuple<[A, S]>>
}

// -----------------------------------------------------------------------------
// instances
// -----------------------------------------------------------------------------

export const ParserURI = "@effect-ts/printer/ParserURI"

export type ParserURI = typeof ParserURI

export const ParserInputURI = "@effect-ts/printer/ParserInputURI"

export type ParserInputURI = typeof ParserInputURI

export type ParserInput<I> = P.CustomType<ParserInputURI, I>

declare module "@effect-ts/core/Prelude/HKT" {
  export interface URItoKind<FC, TC, K, Q, W, X, I, S, R, E, A> {
    readonly [ParserURI]: Parser<P.AccessCustom<TC, ParserInputURI>, A>
  }
}

export function getAssociativeEither<S>() {
  return P.instance<P.AssociativeEither<[P.URI<ParserURI>], ParserInput<S>>>({
    orElseEither: (that) => (parser) => (stream) => {
      const o = parser(stream)
      if (O.isSome(o)) {
        return O.map_(o, (result) => Tuple.update_(result, 0, E.right)) as any
      }
      return O.fold_(
        that()(stream),
        () => E.left(O.emptyOf()),
        (result) => O.some(Tuple.update_(result, 0, E.right))
      )
    }
  })
}

export function getMonad<S>() {
  return P.instance<P.Monad<[P.URI<ParserURI>], ParserInput<S>>>({
    any: () => (s) => O.some(Tuple.tuple({}, s)),
    flatten: (ffa) => (s1) =>
      O.chain_(ffa(s1), (result) => {
        const fa = Tuple.get_(result, 0)
        const s2 = Tuple.get_(result, 1)
        return fa(s2)
      }),
    map: (f) => (parser) => (stream) => O.map_(parser(stream), Tuple.update(0, f))
  })
}

export function getChainRec<S>() {
  return P.instance<P.ChainRec<[P.URI<ParserURI>], ParserInput<S>>>({
    chainRec: (f) => (a) => (start) => {
      return ChainRec.tailRec({ value: a, stream: start }, (state) => {
        const result = f(state.value)(state.stream)

        if (O.isNone(result)) {
          return E.right(O.emptyOf())
        }

        const cont = Tuple.get_(result.value, 0)
        const stream = Tuple.get_(result.value, 1)

        return E.isLeft(cont)
          ? E.left({ value: cont.left, stream })
          : E.right(O.some(Tuple.tuple(cont.right, stream)))
      })
    }
  })
}
