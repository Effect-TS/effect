import type {
  URIS3,
  CApplicative3,
  Kind3,
  URIS2,
  CApplicative2,
  Kind2,
  CApplicative2C,
  URIS,
  CApplicative1,
  Kind,
  CApplicative,
  HKT,
  CApplicative4,
  CApplicative4MAP,
  CApplicative4MA,
  CApplicative3C,
  CApplicative4MAC,
  CApplicative4MAPC,
  URIS4,
  Kind4,
  MaURIS
} from "../../Base"
import type { Monoid } from "../../Monoid"
import type { Option } from "../../Option"

export interface Iso<S, A> {
  readonly get: (s: S) => A
  readonly reverseGet: (a: A) => S
}

export interface Lens<S, A> {
  readonly get: (s: S) => A
  readonly set: (a: A) => (s: S) => S
}

export interface Prism<S, A> {
  readonly getOption: (s: S) => Option<A>
  readonly reverseGet: (a: A) => S
}

export interface Optional<S, A> {
  readonly getOption: (s: S) => Option<A>
  readonly set: (a: A) => (s: S) => S
}

export interface ModifyF<S, A> {
  <F extends MaURIS>(F: CApplicative4MA<F>): <R, U, L>(
    f: (a: A) => Kind4<F, R, U, L, A>
  ) => (s: S) => Kind4<F, R, U, L, S>
  <F extends MaURIS>(F: CApplicative4MAP<F>): <R, U, L>(
    f: (a: A) => Kind4<F, R, U, L, A>
  ) => (s: S) => Kind4<F, unknown, U, L, S>
  <F extends MaURIS, L>(F: CApplicative4MAPC<F, L>): <R, U>(
    f: (a: A) => Kind4<F, R, U, L, A>
  ) => (s: S) => Kind4<F, unknown, U, L, S>
  <F extends MaURIS, L>(F: CApplicative4MAC<F, L>): <R, U>(
    f: (a: A) => Kind4<F, R, U, L, A>
  ) => (s: S) => Kind4<F, R, U, L, S>
  <F extends URIS4>(F: CApplicative4<F>): <R, U, L>(
    f: (a: A) => Kind4<F, R, U, L, A>
  ) => (s: S) => Kind4<F, R, U, L, S>
  <F extends URIS3, L>(F: CApplicative3C<F, L>): <U>(
    f: (a: A) => Kind3<F, U, L, A>
  ) => (s: S) => Kind3<F, U, L, S>
  <F extends URIS3>(F: CApplicative3<F>): <U, L>(
    f: (a: A) => Kind3<F, U, L, A>
  ) => (s: S) => Kind3<F, U, L, S>
  <F extends URIS2>(F: CApplicative2<F>): <L>(
    f: (a: A) => Kind2<F, L, A>
  ) => (s: S) => Kind2<F, L, S>
  <F extends URIS2, L>(F: CApplicative2C<F, L>): (
    f: (a: A) => Kind2<F, L, A>
  ) => (s: S) => Kind2<F, L, S>
  <F extends URIS>(F: CApplicative1<F>): (
    f: (a: A) => Kind<F, A>
  ) => (s: S) => Kind<F, S>
  <F>(F: CApplicative<F>): (f: (a: A) => HKT<F, A>) => (s: S) => HKT<F, S>
}

export interface Traversal<S, A> {
  readonly modifyF: ModifyF<S, A>
}

export interface At<S, I, A> {
  readonly at: (i: I) => Lens<S, A>
}

export interface Index<S, I, A> {
  readonly index: (i: I) => Optional<S, A>
}

export interface Getter<S, A> {
  readonly get: (s: S) => A
}

export interface Fold<S, A> {
  readonly foldMap: <M>(M: Monoid<M>) => (f: (a: A) => M) => (s: S) => M
}

export interface Setter<S, A> {
  readonly modify: (f: (a: A) => A) => (s: S) => S
}
