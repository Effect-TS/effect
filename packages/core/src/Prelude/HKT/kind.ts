import type { OrFix } from "./fix"
import type { ConcreteURIS, URItoIndex, URItoKind } from "./hkt"

export type URIS = [ConcreteURIS, ...ConcreteURIS[]]

export type UnionURI<
  G extends ConcreteURIS,
  F extends ConcreteURIS[]
> = F extends ConcreteURIS[] ? [...F, G] : F

export type InvertedUnionURI<
  G extends ConcreteURIS,
  F extends ConcreteURIS[]
> = F extends ConcreteURIS[] ? [G, ...F] : F

export type Kind<
  URI extends URIS,
  D,
  N extends string,
  K,
  SI,
  SO,
  X,
  I,
  S,
  R,
  E,
  A
> = ((...x: URI) => any) extends (fst: infer XURI, ...rest: infer Rest) => any
  ? XURI extends ConcreteURIS
    ? URItoKind<
        D,
        N,
        K,
        SI,
        SO,
        X,
        I,
        S,
        R,
        E,
        Rest extends URIS ? Kind<Rest, D, N, K, SI, SO, X, I, S, R, E, A> : A
      >[XURI]
    : never
  : never

export type KindFix<
  URI extends URIS,
  D,
  N extends string,
  K,
  SI,
  SO,
  X,
  I,
  S,
  R,
  E,
  A
> = Kind<
  URI,
  D,
  N,
  K,
  SI,
  SO,
  OrFix<"X", D, X>,
  OrFix<"I", D, I>,
  OrFix<"S", D, S>,
  OrFix<"R", D, R>,
  OrFix<"E", D, E>,
  A
>

export type IndexForBase<
  F extends ConcreteURIS,
  N extends string,
  K
> = F extends keyof URItoIndex<any, any> ? URItoIndex<N, K>[F] : K

export type IndexFor<URI extends URIS, N extends string, K> = IndexForBase<
  URI[number],
  N,
  K
>
