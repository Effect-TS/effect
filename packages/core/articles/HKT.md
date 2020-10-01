# Efficient Encoding of HKTs in TS 4.1

There have been many attempts at finding valid HKT encodings in TypeScript, and at the press time the most used and most reliable is the one implemented by fp-ts.

Lets recap on this encoding first.

All the types are recorded into a number of type-level maps that index `URI -> Concrete Type` and this map is different for each kind:

```ts
export interface URItoKind<A> {}

export interface URItoKind2<E, A> {}

export interface URItoKind3<R, E, A> {}

export interface URItoKind4<S, R, E, A> {}
```

Those type-level records are filled prograssively by using the module augumentation feature, for example lets take a look at how `Either & Option` are wired in those records:

```ts
export const URI = "Either"

export type URI = typeof URI

declare module "./HKT" {
  interface URItoKind2<E, A> {
    readonly [URI]: Either<E, A>
  }
}
```

```ts
export const URI = "Option"

export type URI = typeof URI

declare module "./HKT" {
  interface URItoKind<A> {
    readonly [URI]: Option<A>
  }
}
```

in this way at the end (post augumentation) the records will look like:

```ts
export interface URItoKind<A> {
    Option: Option<A>
    ...
}

export interface URItoKind2<E, A> {
    Either: Either<E, A>
    ...
}

export interface URItoKind3<R, E, A> {
    ReaderTaskEither: ReaderTaskEither<R, E, A>
    ...
}

export interface URItoKind4<S, R, E, A> {
    StateReaderTaskEither: StateReaderTaskEither<S, R, E, A>
    ...
}
```

accessing those types becomes now a matter of getting the proper record key and fill the params, for example:

```ts
type Result = URItoKind<string, number>["Either"]
```

correspond to:

```ts
Either<string, number>
```

using this method fp-ts goes on and define:

```ts
export type URIS = keyof URItoKind<any>
export type URIS2 = keyof URItoKind2<any, any>
export type URIS3 = keyof URItoKind3<any, any, any>
export type URIS4 = keyof URItoKind4<any, any, any, any>

export type Kind<URI extends URIS, A> = URI extends URIS ? URItoKind<A>[URI] : any
export type Kind2<URI extends URIS2, E, A> = URI extends URIS2
  ? URItoKind2<E, A>[URI]
  : any
export type Kind3<URI extends URIS3, R, E, A> = URI extends URIS3
  ? URItoKind3<R, E, A>[URI]
  : any
export type Kind4<URI extends URIS4, S, R, E, A> = URI extends URIS4
  ? URItoKind4<S, R, E, A>[URI]
  : any
```

using this methods we can now access:

```ts
type Result = Kind2<"Either", string, number>
```

with this constructs its now possible to write generic interfaces that doesn't specify the `URI`, for example we can write:

```ts
export interface Functor1<F extends URIS> {
  readonly URI: F
  readonly map: <A, B>(fa: Kind<F, A>, f: (a: A) => B) => Kind<F, B>
}
```

and having:

```ts
const functorOption: Functor1<"Option"> = {
    URI: "Option",
    map: ... // map is now correctly typed to work with Option<*>
}
```

clearly this is not enough to generalise over different kinds and in fp-ts you will find for each of the typeclasses (interfaces with generic URI) multiple definitions for every kind.

```ts
export interface Functor1<F extends URIS> {
  readonly URI: F
  readonly map: <A, B>(fa: Kind<F, A>, f: (a: A) => B) => Kind<F, B>
}

export interface Functor2<F extends URIS2> {
  readonly URI: F
  readonly map: <E, A, B>(fa: Kind2<F, E, A>, f: (a: A) => B) => Kind2<F, E, B>
}

export interface Functor2C<F extends URIS2, E> {
  readonly URI: F
  readonly _E: E
  readonly map: <A, B>(fa: Kind2<F, E, A>, f: (a: A) => B) => Kind2<F, E, B>
}

export interface Functor3<F extends URIS3> {
  readonly URI: F
  readonly map: <R, E, A, B>(fa: Kind3<F, R, E, A>, f: (a: A) => B) => Kind3<F, R, E, B>
}

export interface Functor3C<F extends URIS3, E> {
  readonly URI: F
  readonly _E: E
  readonly map: <R, A, B>(fa: Kind3<F, R, E, A>, f: (a: A) => B) => Kind3<F, R, E, B>
}

export interface Functor4<F extends URIS4> {
  readonly URI: F
  readonly map: <S, R, E, A, B>(
    fa: Kind4<F, S, R, E, A>,
    f: (a: A) => B
  ) => Kind4<F, S, R, E, B>
}
```

In addition to the 4 kinds as we can see we also have `*C` interfaces that are used to add a constraint to the `E` parameter, this is used for example in `Validation` where `E` represent the `Error` channel and we ask `Monoid<E>` to eventually combine errors toghether.

Lets now take a look at how to use those typeclasses, how can we write a function that consumes a generic `Functor`?

Lets start from the base case, lets say that we want a generic function `addOne` that works by mapping a `number` output by adding one:

```ts
function addOne<URI extends URIS>(F: Functor1<URI>) {
  return (fa: Kind<F, number>): Kind<F, number> => F.map(fa, (n) => n + 1)
}
```

calling this function with the appropriate typeclass instance it will yield a specific function for the specific data-type.

```ts
const addOneOption = addOne(functorOption) // (fa: Option<number>) => Option<number>
```

we can generalise further supporting different kinds via overloading:

```ts
function addOne<URI extends URIS4, E>(
  F: Functor4C<URI, E>
): <S, R>(fa: Kind4<F, S, R, E, number>) => Kind4<F, S, R, E, number>
function addOne<URI extends URIS4>(
  F: Functor4<URI>
): <S, R, E>(fa: Kind4<F, S, R, E, number>) => Kind4<F, S, R, E, number>
function addOne<URI extends URIS3, E>(
  F: Functor3C<URI, E>
): <R>(fa: Kind3<F, R, E, number>) => Kind3<F, R, E, number>
function addOne<URI extends URIS3>(
  F: Functor3<URI>
): <R, E>(fa: Kind3<F, R, E, number>) => Kind3<F, R, E, number>
function addOne<URI extends URIS2, E>(
  F: Functor2C<URI, E>
): (fa: Kind2<F, E, number>) => Kind2<F, E, number>
function addOne<URI extends URIS2>(
  F: Functor2<URI>
): <E>(fa: Kind2<F, E, number>) => Kind<F, E, number>
function addOne<URI extends URIS>(
  F: Functor1<URI>
): (fa: Kind<F, number>) => Kind<F, number>
function addOne(F: any) {
  return (fa: any): any => F.map(fa, (n) => n + 1)
}
```

The only trouble is to define the base case, that currently is very scary (any, any, any). In fp-ts to do this we can use `HKT` defined as:

```ts
export interface HKT<URI, A> {
  readonly _URI: URI
  readonly _A: A
}

export interface HKT2<URI, E, A> extends HKT<URI, A> {
  readonly _E: E
}

export interface HKT3<URI, R, E, A> extends HKT2<URI, E, A> {
  readonly _R: R
}

export interface HKT4<URI, S, R, E, A> extends HKT3<URI, R, E, A> {
  readonly _S: S
}
```

Now we can define a specific `Functor` interface for `HKT` like:

```ts
export interface Functor<F> {
  readonly URI: F
  readonly map: <A, B>(fa: HKT<F, A>, f: (a: A) => B) => HKT<F, B>
}
```

and use thisto type the base case:

```ts
function addOne<URI extends URIS4, E>(
  F: Functor4C<URI, E>
): <S, R>(fa: Kind4<F, S, R, E, number>) => Kind4<F, S, R, E, number>
function addOne<URI extends URIS4>(
  F: Functor4<URI>
): <S, R, E>(fa: Kind4<F, S, R, E, number>) => Kind4<F, S, R, E, number>
function addOne<URI extends URIS3, E>(
  F: Functor3C<URI, E>
): <R>(fa: Kind3<F, R, E, number>) => Kind3<F, R, E, number>
function addOne<URI extends URIS3>(
  F: Functor3<URI>
): <R, E>(fa: Kind3<F, R, E, number>) => Kind3<F, R, E, number>
function addOne<URI extends URIS2, E>(
  F: Functor2C<URI, E>
): (fa: Kind2<F, E, number>) => Kind2<F, E, number>
function addOne<URI extends URIS2>(
  F: Functor2<URI>
): <E>(fa: Kind2<F, E, number>) => Kind<F, E, number>
function addOne<URI extends URIS>(
  F: Functor1<URI>
): (fa: Kind<F, number>) => Kind<F, number>
function addOne<URI>(F: Functor<URI>) {
  return (fa: HKT<URI, number>): HKT<URI, number> => F.map(fa, (n) => n + 1)
}
```

Short and practical, isn't it?
