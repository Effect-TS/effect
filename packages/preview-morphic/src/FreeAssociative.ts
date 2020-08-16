// ported from https://github.com/gcanti/io-ts/blob/master/src/FreeSemigroup.ts
import { makeAssociative } from "@matechs/preview/Associative"

export class Of<A> {
  readonly _tag = "Of"
  constructor(readonly value: A) {}
}

export class Concat<A> {
  readonly _tag = "Concat"
  constructor(readonly left: FreeAssociative<A>, readonly right: FreeAssociative<A>) {}
}

export type FreeAssociative<A> = Of<A> | Concat<A>

export const of = <A>(a: A): FreeAssociative<A> => new Of(a)

export const combine = <A>(y: FreeAssociative<A>) => (
  x: FreeAssociative<A>
): FreeAssociative<A> => new Concat(x, y)

export const getAssociative = <A>() => makeAssociative<FreeAssociative<A>>(combine)

export const fold = <A, B>(
  onOf: (a: A) => B,
  onConcat: (right: FreeAssociative<A>) => (left: FreeAssociative<A>) => B
) => (a: FreeAssociative<A>) => {
  switch (a._tag) {
    case "Of": {
      return onOf(a.value)
    }
    case "Concat": {
      return onConcat(a.right)(a.left)
    }
  }
}

export const map = <A, B>(
  f: (a: A) => B
): ((_: FreeAssociative<A>) => FreeAssociative<B>) =>
  fold(
    (a: A) => of(f(a)),
    (r) => (l) => combine(map(f)(r))(map(f)(l))
  )
