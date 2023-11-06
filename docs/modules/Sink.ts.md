---
title: Sink.ts
nav_order: 103
parent: Modules
---

## Sink overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [collectAll](#collectall)
  - [collectAllN](#collectalln)
  - [collectAllToMap](#collectalltomap)
  - [collectAllToMapN](#collectalltomapn)
  - [collectAllToSet](#collectalltoset)
  - [collectAllToSetN](#collectalltosetn)
  - [collectAllUntil](#collectalluntil)
  - [collectAllUntilEffect](#collectalluntileffect)
  - [collectAllWhile](#collectallwhile)
  - [collectAllWhileEffect](#collectallwhileeffect)
  - [context](#context)
  - [contextWith](#contextwith)
  - [contextWithEffect](#contextwitheffect)
  - [contextWithSink](#contextwithsink)
  - [count](#count)
  - [die](#die)
  - [dieMessage](#diemessage)
  - [dieSync](#diesync)
  - [drain](#drain)
  - [drop](#drop)
  - [dropUntil](#dropuntil)
  - [dropUntilEffect](#dropuntileffect)
  - [dropWhile](#dropwhile)
  - [dropWhileEffect](#dropwhileeffect)
  - [every](#every)
  - [fail](#fail)
  - [failCause](#failcause)
  - [failCauseSync](#failcausesync)
  - [failSync](#failsync)
  - [foldChunks](#foldchunks)
  - [foldChunksEffect](#foldchunkseffect)
  - [foldEffect](#foldeffect)
  - [foldLeft](#foldleft)
  - [foldLeftChunks](#foldleftchunks)
  - [foldLeftChunksEffect](#foldleftchunkseffect)
  - [foldLeftEffect](#foldlefteffect)
  - [foldUntil](#folduntil)
  - [foldUntilEffect](#folduntileffect)
  - [foldWeighted](#foldweighted)
  - [foldWeightedDecompose](#foldweighteddecompose)
  - [foldWeightedDecomposeEffect](#foldweighteddecomposeeffect)
  - [foldWeightedEffect](#foldweightedeffect)
  - [forEach](#foreach)
  - [forEachChunk](#foreachchunk)
  - [forEachChunkWhile](#foreachchunkwhile)
  - [forEachWhile](#foreachwhile)
  - [fromChannel](#fromchannel)
  - [fromEffect](#fromeffect)
  - [fromPubSub](#frompubsub)
  - [fromPush](#frompush)
  - [fromQueue](#fromqueue)
  - [head](#head)
  - [last](#last)
  - [leftover](#leftover)
  - [mkString](#mkstring)
  - [never](#never)
  - [some](#some)
  - [succeed](#succeed)
  - [sum](#sum)
  - [suspend](#suspend)
  - [sync](#sync)
  - [take](#take)
  - [timed](#timed)
  - [toChannel](#tochannel)
  - [unwrap](#unwrap)
  - [unwrapScoped](#unwrapscoped)
- [context](#context-1)
  - [provideContext](#providecontext)
- [elements](#elements)
  - [findEffect](#findeffect)
- [error handling](#error-handling)
  - [orElse](#orelse)
  - [refineOrDie](#refineordie)
  - [refineOrDieWith](#refineordiewith)
- [filtering](#filtering)
  - [filterInput](#filterinput)
  - [filterInputEffect](#filterinputeffect)
- [finalization](#finalization)
  - [ensuring](#ensuring)
  - [ensuringWith](#ensuringwith)
- [folding](#folding)
  - [fold](#fold)
  - [foldSink](#foldsink)
- [mapping](#mapping)
  - [as](#as)
  - [dimap](#dimap)
  - [dimapChunks](#dimapchunks)
  - [dimapChunksEffect](#dimapchunkseffect)
  - [dimapEffect](#dimapeffect)
  - [map](#map)
  - [mapEffect](#mapeffect)
  - [mapError](#maperror)
  - [mapInput](#mapinput)
  - [mapInputChunks](#mapinputchunks)
  - [mapInputChunksEffect](#mapinputchunkseffect)
  - [mapInputEffect](#mapinputeffect)
  - [mapLeftover](#mapleftover)
- [models](#models)
  - [Sink (interface)](#sink-interface)
  - [SinkUnify (interface)](#sinkunify-interface)
  - [SinkUnifyIgnore (interface)](#sinkunifyignore-interface)
- [sequencing](#sequencing)
  - [flatMap](#flatmap)
- [symbols](#symbols)
  - [SinkTypeId](#sinktypeid)
  - [SinkTypeId (type alias)](#sinktypeid-type-alias)
- [utils](#utils)
  - [Sink (namespace)](#sink-namespace)
    - [Variance (interface)](#variance-interface)
    - [VarianceStruct (interface)](#variancestruct-interface)
  - [collectAllFrom](#collectallfrom)
  - [collectAllWhileWith](#collectallwhilewith)
  - [collectLeftover](#collectleftover)
  - [ignoreLeftover](#ignoreleftover)
  - [race](#race)
  - [raceBoth](#raceboth)
  - [raceWith](#racewith)
  - [splitWhere](#splitwhere)
  - [summarized](#summarized)
  - [withDuration](#withduration)
- [zipping](#zipping)
  - [zip](#zip)
  - [zipLeft](#zipleft)
  - [zipRight](#zipright)
  - [zipWith](#zipwith)

---

# constructors

## collectAll

A sink that collects all elements into a `Chunk`.

**Signature**

```ts
export declare const collectAll: <In>() => Sink<never, never, In, never, Chunk.Chunk<In>>
```

Added in v2.0.0

## collectAllN

A sink that collects first `n` elements into a chunk.

**Signature**

```ts
export declare const collectAllN: <In>(n: number) => Sink<never, never, In, In, Chunk.Chunk<In>>
```

Added in v2.0.0

## collectAllToMap

A sink that collects all of its inputs into a map. The keys are extracted
from inputs using the keying function `key`; if multiple inputs use the
same key, they are merged using the `merge` function.

**Signature**

```ts
export declare const collectAllToMap: <In, K>(
  key: (input: In) => K,
  merge: (x: In, y: In) => In
) => Sink<never, never, In, never, HashMap.HashMap<K, In>>
```

Added in v2.0.0

## collectAllToMapN

A sink that collects first `n` keys into a map. The keys are calculated
from inputs using the keying function `key`; if multiple inputs use the the
same key, they are merged using the `merge` function.

**Signature**

```ts
export declare const collectAllToMapN: <In, K>(
  n: number,
  key: (input: In) => K,
  merge: (x: In, y: In) => In
) => Sink<never, never, In, In, HashMap.HashMap<K, In>>
```

Added in v2.0.0

## collectAllToSet

A sink that collects all of its inputs into a set.

**Signature**

```ts
export declare const collectAllToSet: <In>() => Sink<never, never, In, never, HashSet.HashSet<In>>
```

Added in v2.0.0

## collectAllToSetN

A sink that collects first `n` distinct inputs into a set.

**Signature**

```ts
export declare const collectAllToSetN: <In>(n: number) => Sink<never, never, In, In, HashSet.HashSet<In>>
```

Added in v2.0.0

## collectAllUntil

Accumulates incoming elements into a chunk until predicate `p` is
satisfied.

**Signature**

```ts
export declare const collectAllUntil: <In>(p: Predicate<In>) => Sink<never, never, In, In, Chunk.Chunk<In>>
```

Added in v2.0.0

## collectAllUntilEffect

Accumulates incoming elements into a chunk until effectful predicate `p` is
satisfied.

**Signature**

```ts
export declare const collectAllUntilEffect: <In, R, E>(
  p: (input: In) => Effect<R, E, boolean>
) => Sink<R, E, In, In, Chunk.Chunk<In>>
```

Added in v2.0.0

## collectAllWhile

Accumulates incoming elements into a chunk as long as they verify predicate
`p`.

**Signature**

```ts
export declare const collectAllWhile: <In>(predicate: Predicate<In>) => Sink<never, never, In, In, Chunk.Chunk<In>>
```

Added in v2.0.0

## collectAllWhileEffect

Accumulates incoming elements into a chunk as long as they verify effectful
predicate `p`.

**Signature**

```ts
export declare const collectAllWhileEffect: <In, R, E>(
  predicate: (input: In) => Effect<R, E, boolean>
) => Sink<R, E, In, In, Chunk.Chunk<In>>
```

Added in v2.0.0

## context

Accesses the whole context of the sink.

**Signature**

```ts
export declare const context: <R>() => Sink<R, never, unknown, never, Context.Context<R>>
```

Added in v2.0.0

## contextWith

Accesses the context of the sink.

**Signature**

```ts
export declare const contextWith: <R, Z>(f: (context: Context.Context<R>) => Z) => Sink<R, never, unknown, never, Z>
```

Added in v2.0.0

## contextWithEffect

Accesses the context of the sink in the context of an effect.

**Signature**

```ts
export declare const contextWithEffect: <R, R2, E, Z>(
  f: (context: Context.Context<R>) => Effect<R2, E, Z>
) => Sink<R | R2, E, unknown, never, Z>
```

Added in v2.0.0

## contextWithSink

Accesses the context of the sink in the context of a sink.

**Signature**

```ts
export declare const contextWithSink: <R0, R, E, In, L, Z>(
  f: (context: Context.Context<R0>) => Sink<R, E, In, L, Z>
) => Sink<R0 | R, E, In, L, Z>
```

Added in v2.0.0

## count

A sink that counts the number of elements fed to it.

**Signature**

```ts
export declare const count: Sink<never, never, unknown, never, number>
```

Added in v2.0.0

## die

Creates a sink halting with the specified defect.

**Signature**

```ts
export declare const die: (defect: unknown) => Sink<never, never, unknown, never, never>
```

Added in v2.0.0

## dieMessage

Creates a sink halting with the specified message, wrapped in a
`RuntimeException`.

**Signature**

```ts
export declare const dieMessage: (message: string) => Sink<never, never, unknown, never, never>
```

Added in v2.0.0

## dieSync

Creates a sink halting with the specified defect.

**Signature**

```ts
export declare const dieSync: (evaluate: LazyArg<unknown>) => Sink<never, never, unknown, never, never>
```

Added in v2.0.0

## drain

A sink that ignores its inputs.

**Signature**

```ts
export declare const drain: Sink<never, never, unknown, never, void>
```

Added in v2.0.0

## drop

Creates a sink that drops `n` elements.

**Signature**

```ts
export declare const drop: <In>(n: number) => Sink<never, never, In, In, unknown>
```

Added in v2.0.0

## dropUntil

Drops incoming elements until the predicate is satisfied.

**Signature**

```ts
export declare const dropUntil: <In>(predicate: Predicate<In>) => Sink<never, never, In, In, unknown>
```

Added in v2.0.0

## dropUntilEffect

Drops incoming elements until the effectful predicate is satisfied.

**Signature**

```ts
export declare const dropUntilEffect: <In, R, E>(
  predicate: (input: In) => Effect<R, E, boolean>
) => Sink<R, E, In, In, unknown>
```

Added in v2.0.0

## dropWhile

Drops incoming elements as long as the predicate is satisfied.

**Signature**

```ts
export declare const dropWhile: <In>(predicate: Predicate<In>) => Sink<never, never, In, In, unknown>
```

Added in v2.0.0

## dropWhileEffect

Drops incoming elements as long as the effectful predicate is satisfied.

**Signature**

```ts
export declare const dropWhileEffect: <In, R, E>(
  predicate: (input: In) => Effect<R, E, boolean>
) => Sink<R, E, In, In, unknown>
```

Added in v2.0.0

## every

A sink that returns whether all elements satisfy the specified predicate.

**Signature**

```ts
export declare const every: <In>(predicate: Predicate<In>) => Sink<never, never, In, In, boolean>
```

Added in v2.0.0

## fail

A sink that always fails with the specified error.

**Signature**

```ts
export declare const fail: <E>(e: E) => Sink<never, E, unknown, never, never>
```

Added in v2.0.0

## failCause

Creates a sink halting with a specified `Cause`.

**Signature**

```ts
export declare const failCause: <E>(cause: Cause.Cause<E>) => Sink<never, E, unknown, never, never>
```

Added in v2.0.0

## failCauseSync

Creates a sink halting with a specified lazily evaluated `Cause`.

**Signature**

```ts
export declare const failCauseSync: <E>(evaluate: LazyArg<Cause.Cause<E>>) => Sink<never, E, unknown, never, never>
```

Added in v2.0.0

## failSync

A sink that always fails with the specified lazily evaluated error.

**Signature**

```ts
export declare const failSync: <E>(evaluate: LazyArg<E>) => Sink<never, E, unknown, never, never>
```

Added in v2.0.0

## foldChunks

A sink that folds its input chunks with the provided function, termination
predicate and initial state. `contFn` condition is checked only for the
initial value and at the end of processing of each chunk. `f` and `contFn`
must preserve chunking-invariance.

**Signature**

```ts
export declare const foldChunks: <S, In>(
  s: S,
  contFn: Predicate<S>,
  f: (s: S, chunk: Chunk.Chunk<In>) => S
) => Sink<never, never, In, never, S>
```

Added in v2.0.0

## foldChunksEffect

A sink that effectfully folds its input chunks with the provided function,
termination predicate and initial state. `contFn` condition is checked only
for the initial value and at the end of processing of each chunk. `f` and
`contFn` must preserve chunking-invariance.

**Signature**

```ts
export declare const foldChunksEffect: <S, R, E, In>(
  s: S,
  contFn: Predicate<S>,
  f: (s: S, chunk: Chunk.Chunk<In>) => Effect<R, E, S>
) => Sink<R, E, In, In, S>
```

Added in v2.0.0

## foldEffect

A sink that effectfully folds its inputs with the provided function,
termination predicate and initial state.

**Signature**

```ts
export declare const foldEffect: <S, R, E, In>(
  s: S,
  contFn: Predicate<S>,
  f: (s: S, input: In) => Effect<R, E, S>
) => Sink<R, E, In, In, S>
```

Added in v2.0.0

## foldLeft

A sink that folds its inputs with the provided function and initial state.

**Signature**

```ts
export declare const foldLeft: <S, In>(s: S, f: (s: S, input: In) => S) => Sink<never, never, In, never, S>
```

Added in v2.0.0

## foldLeftChunks

A sink that folds its input chunks with the provided function and initial
state. `f` must preserve chunking-invariance.

**Signature**

```ts
export declare const foldLeftChunks: <S, In>(
  s: S,
  f: (s: S, chunk: Chunk.Chunk<In>) => S
) => Sink<never, never, In, never, S>
```

Added in v2.0.0

## foldLeftChunksEffect

A sink that effectfully folds its input chunks with the provided function
and initial state. `f` must preserve chunking-invariance.

**Signature**

```ts
export declare const foldLeftChunksEffect: <S, R, E, In>(
  s: S,
  f: (s: S, chunk: Chunk.Chunk<In>) => Effect<R, E, S>
) => Sink<R, E, In, never, S>
```

Added in v2.0.0

## foldLeftEffect

A sink that effectfully folds its inputs with the provided function and
initial state.

**Signature**

```ts
export declare const foldLeftEffect: <S, R, E, In>(
  s: S,
  f: (s: S, input: In) => Effect<R, E, S>
) => Sink<R, E, In, In, S>
```

Added in v2.0.0

## foldUntil

Creates a sink that folds elements of type `In` into a structure of type
`S` until `max` elements have been folded.

Like `Sink.foldWeighted`, but with a constant cost function of `1`.

**Signature**

```ts
export declare const foldUntil: <In, S>(s: S, max: number, f: (z: S, input: In) => S) => Sink<never, never, In, In, S>
```

Added in v2.0.0

## foldUntilEffect

Creates a sink that effectfully folds elements of type `In` into a
structure of type `S` until `max` elements have been folded.

Like `Sink.foldWeightedEffect` but with a constant cost function of `1`.

**Signature**

```ts
export declare const foldUntilEffect: <S, R, E, In>(
  s: S,
  max: number,
  f: (s: S, input: In) => Effect<R, E, S>
) => Sink<R, E, In, In, S>
```

Added in v2.0.0

## foldWeighted

Creates a sink that folds elements of type `In` into a structure of type
`S`, until `max` worth of elements (determined by the `costFn`) have been
folded.

**Signature**

```ts
export declare const foldWeighted: <S, In>(options: {
  readonly initial: S
  readonly maxCost: number
  readonly cost: (s: S, input: In) => number
  readonly body: (s: S, input: In) => S
}) => Sink<never, never, In, In, S>
```

Added in v2.0.0

## foldWeightedDecompose

Creates a sink that folds elements of type `In` into a structure of type
`S`, until `max` worth of elements (determined by the `costFn`) have been
folded.

The `decompose` function will be used for decomposing elements that cause
an `S` aggregate to cross `max` into smaller elements. For example:

```ts
pipe(
  Stream.make(1, 5, 1),
  Stream.transduce(
    Sink.foldWeightedDecompose(
      Chunk.empty<number>(),
      4,
      (n: number) => n,
      (n: number) => Chunk.make(n - 1, 1),
      (acc, el) => pipe(acc, Chunk.append(el))
    )
  ),
  Stream.runCollect
)
```

The stream would emit the elements `Chunk(1), Chunk(4), Chunk(1, 1)`.

Be vigilant with this function, it has to generate "simpler" values or the
fold may never end. A value is considered indivisible if `decompose` yields
the empty chunk or a single-valued chunk. In these cases, there is no other
choice than to yield a value that will cross the threshold.

`Sink.foldWeightedDecomposeEffect` allows the decompose function to return an
effect value, and consequently it allows the sink to fail.

**Signature**

```ts
export declare const foldWeightedDecompose: <S, In>(options: {
  readonly initial: S
  readonly maxCost: number
  readonly cost: (s: S, input: In) => number
  readonly decompose: (input: In) => Chunk.Chunk<In>
  readonly body: (s: S, input: In) => S
}) => Sink<never, never, In, In, S>
```

Added in v2.0.0

## foldWeightedDecomposeEffect

Creates a sink that effectfully folds elements of type `In` into a
structure of type `S`, until `max` worth of elements (determined by the
`costFn`) have been folded.

The `decompose` function will be used for decomposing elements that cause
an `S` aggregate to cross `max` into smaller elements. Be vigilant with
this function, it has to generate "simpler" values or the fold may never
end. A value is considered indivisible if `decompose` yields the empty
chunk or a single-valued chunk. In these cases, there is no other choice
than to yield a value that will cross the threshold.

See `Sink.foldWeightedDecompose` for an example.

**Signature**

```ts
export declare const foldWeightedDecomposeEffect: <S, In, R, E, R2, E2, R3, E3>(options: {
  readonly initial: S
  readonly maxCost: number
  readonly cost: (s: S, input: In) => Effect<R, E, number>
  readonly decompose: (input: In) => Effect<R2, E2, Chunk.Chunk<In>>
  readonly body: (s: S, input: In) => Effect<R3, E3, S>
}) => Sink<R | R2 | R3, E | E2 | E3, In, In, S>
```

Added in v2.0.0

## foldWeightedEffect

Creates a sink that effectfully folds elements of type `In` into a
structure of type `S`, until `max` worth of elements (determined by the
`costFn`) have been folded.

**Signature**

```ts
export declare const foldWeightedEffect: <S, In, R, E, R2, E2>(options: {
  readonly initial: S
  readonly maxCost: number
  readonly cost: (s: S, input: In) => Effect<R, E, number>
  readonly body: (s: S, input: In) => Effect<R2, E2, S>
}) => Sink<R | R2, E | E2, In, In, S>
```

Added in v2.0.0

## forEach

A sink that executes the provided effectful function for every element fed
to it.

**Signature**

```ts
export declare const forEach: <In, R, E, _>(f: (input: In) => Effect<R, E, _>) => Sink<R, E, In, never, void>
```

Added in v2.0.0

## forEachChunk

A sink that executes the provided effectful function for every chunk fed to
it.

**Signature**

```ts
export declare const forEachChunk: <In, R, E, _>(
  f: (input: Chunk.Chunk<In>) => Effect<R, E, _>
) => Sink<R, E, In, never, void>
```

Added in v2.0.0

## forEachChunkWhile

A sink that executes the provided effectful function for every chunk fed to
it until `f` evaluates to `false`.

**Signature**

```ts
export declare const forEachChunkWhile: <In, R, E>(
  f: (input: Chunk.Chunk<In>) => Effect<R, E, boolean>
) => Sink<R, E, In, In, void>
```

Added in v2.0.0

## forEachWhile

A sink that executes the provided effectful function for every element fed
to it until `f` evaluates to `false`.

**Signature**

```ts
export declare const forEachWhile: <In, R, E>(
  f: (input: In) => Effect<R, E, boolean>
) => Sink<R, E, In, In, void>
```

Added in v2.0.0

## fromChannel

Creates a sink from a `Channel`.

**Signature**

```ts
export declare const fromChannel: <R, E, In, L, Z>(
  channel: Channel.Channel<R, never, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<L>, Z>
) => Sink<R, E, In, L, Z>
```

Added in v2.0.0

## fromEffect

Creates a single-value sink produced from an effect.

**Signature**

```ts
export declare const fromEffect: <R, E, Z>(effect: Effect<R, E, Z>) => Sink<R, E, unknown, never, Z>
```

Added in v2.0.0

## fromPubSub

Create a sink which publishes each element to the specified `PubSub`.

**Signature**

```ts
export declare const fromPubSub: <In>(
  pubsub: PubSub.PubSub<In>,
  options?: { readonly shutdown?: boolean }
) => Sink<never, never, In, never, void>
```

Added in v2.0.0

## fromPush

Creates a sink from a chunk processing function.

**Signature**

```ts
export declare const fromPush: <R, E, In, L, Z>(
  push: Effect<
    R,
    never,
    (_: Option.Option<Chunk.Chunk<In>>) => Effect<R, readonly [Either<E, Z>, Chunk.Chunk<L>], void>
  >
) => Sink<Exclude<R, Scope.Scope>, E, In, L, Z>
```

Added in v2.0.0

## fromQueue

Create a sink which enqueues each element into the specified queue.

**Signature**

```ts
export declare const fromQueue: <In>(
  queue: Queue.Enqueue<In>,
  options?: { readonly shutdown?: boolean }
) => Sink<never, never, In, never, void>
```

Added in v2.0.0

## head

Creates a sink containing the first value.

**Signature**

```ts
export declare const head: <In>() => Sink<never, never, In, In, Option.Option<In>>
```

Added in v2.0.0

## last

Creates a sink containing the last value.

**Signature**

```ts
export declare const last: <In>() => Sink<never, never, In, In, Option.Option<In>>
```

Added in v2.0.0

## leftover

Creates a sink that does not consume any input but provides the given chunk
as its leftovers

**Signature**

```ts
export declare const leftover: <L>(chunk: Chunk.Chunk<L>) => Sink<never, never, unknown, L, void>
```

Added in v2.0.0

## mkString

Creates a sink which transforms it's inputs into a string.

**Signature**

```ts
export declare const mkString: Sink<never, never, unknown, never, string>
```

Added in v2.0.0

## never

Creates a sink which never terminates.

**Signature**

```ts
export declare const never: Sink<never, never, unknown, never, never>
```

Added in v2.0.0

## some

A sink that returns whether an element satisfies the specified predicate.

**Signature**

```ts
export declare const some: <In>(predicate: Predicate<In>) => Sink<never, never, In, In, boolean>
```

Added in v2.0.0

## succeed

A sink that immediately ends with the specified value.

**Signature**

```ts
export declare const succeed: <Z>(z: Z) => Sink<never, never, unknown, never, Z>
```

Added in v2.0.0

## sum

A sink that sums incoming numeric values.

**Signature**

```ts
export declare const sum: Sink<never, never, number, never, number>
```

Added in v2.0.0

## suspend

Returns a lazily constructed sink that may require effects for its
creation.

**Signature**

```ts
export declare const suspend: <R, E, In, L, Z>(evaluate: LazyArg<Sink<R, E, In, L, Z>>) => Sink<R, E, In, L, Z>
```

Added in v2.0.0

## sync

A sink that immediately ends with the specified lazy value.

**Signature**

```ts
export declare const sync: <Z>(evaluate: LazyArg<Z>) => Sink<never, never, unknown, never, Z>
```

Added in v2.0.0

## take

A sink that takes the specified number of values.

**Signature**

```ts
export declare const take: <In>(n: number) => Sink<never, never, In, In, Chunk.Chunk<In>>
```

Added in v2.0.0

## timed

**Signature**

```ts
export declare const timed: Sink<never, never, unknown, never, Duration.Duration>
```

Added in v2.0.0

## toChannel

Creates a `Channel` from a Sink.

**Signature**

```ts
export declare const toChannel: <R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>
) => Channel.Channel<R, never, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<L>, Z>
```

Added in v2.0.0

## unwrap

Creates a sink produced from an effect.

**Signature**

```ts
export declare const unwrap: <R, E, R2, E2, In, L, Z>(
  effect: Effect<R, E, Sink<R2, E2, In, L, Z>>
) => Sink<R | R2, E | E2, In, L, Z>
```

Added in v2.0.0

## unwrapScoped

Creates a sink produced from a scoped effect.

**Signature**

```ts
export declare const unwrapScoped: <R, E, In, L, Z>(
  effect: Effect<R, E, Sink<R, E, In, L, Z>>
) => Sink<Exclude<R, Scope.Scope>, E, In, L, Z>
```

Added in v2.0.0

# context

## provideContext

Provides the sink with its required context, which eliminates its
dependency on `R`.

**Signature**

```ts
export declare const provideContext: {
  <R>(context: Context.Context<R>): <E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<never, E, In, L, Z>
  <E, In, L, Z, R>(self: Sink<R, E, In, L, Z>, context: Context.Context<R>): Sink<never, E, In, L, Z>
}
```

Added in v2.0.0

# elements

## findEffect

Creates a sink that produces values until one verifies the predicate `f`.

**Signature**

```ts
export declare const findEffect: {
  <Z, R2, E2>(
    f: (z: Z) => Effect<R2, E2, boolean>
  ): <R, E, In, L extends In>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In, L, Option.Option<Z>>
  <R, E, In, L extends In, Z, R2, E2>(
    self: Sink<R, E, In, L, Z>,
    f: (z: Z) => Effect<R2, E2, boolean>
  ): Sink<R | R2, E | E2, In, L, Option.Option<Z>>
}
```

Added in v2.0.0

# error handling

## orElse

Switch to another sink in case of failure

**Signature**

```ts
export declare const orElse: {
  <R2, E2, In2, L2, Z2>(
    that: LazyArg<Sink<R2, E2, In2, L2, Z2>>
  ): <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In & In2, L2 | L, Z2 | Z>
  <R, E, In, L, Z, R2, E2, In2, L2, Z2>(
    self: Sink<R, E, In, L, Z>,
    that: LazyArg<Sink<R2, E2, In2, L2, Z2>>
  ): Sink<R | R2, E | E2, In & In2, L | L2, Z | Z2>
}
```

Added in v2.0.0

## refineOrDie

**Signature**

```ts
export declare const refineOrDie: {
  <E, E2>(pf: (error: E) => Option.Option<E2>): <R, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E2, In, L, Z>
  <R, In, L, Z, E, E2>(self: Sink<R, E, In, L, Z>, pf: (error: E) => Option.Option<E2>): Sink<R, E2, In, L, Z>
}
```

Added in v2.0.0

## refineOrDieWith

**Signature**

```ts
export declare const refineOrDieWith: <E, E2>(
  pf: (error: E) => Option.Option<E2>,
  f: (error: E) => unknown
) => <R, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E2, In, L, Z>
```

Added in v2.0.0

# filtering

## filterInput

Filters the sink's input with the given predicate.

**Signature**

```ts
export declare const filterInput: {
  <In, In1 extends In, In2 extends In1>(
    f: Refinement<In1, In2>
  ): <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In2, L, Z>
  <In, In1 extends In>(f: Predicate<In1>): <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In1, L, Z>
}
```

Added in v2.0.0

## filterInputEffect

Effectfully filter the input of this sink using the specified predicate.

**Signature**

```ts
export declare const filterInputEffect: {
  <R2, E2, In, In1 extends In>(
    f: (input: In1) => Effect<R2, E2, boolean>
  ): <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In1, L, Z>
  <R, E, L, Z, R2, E2, In, In1 extends In>(
    self: Sink<R, E, In, L, Z>,
    f: (input: In1) => Effect<R2, E2, boolean>
  ): Sink<R | R2, E | E2, In1, L, Z>
}
```

Added in v2.0.0

# finalization

## ensuring

Returns a new sink with an attached finalizer. The finalizer is guaranteed
to be executed so long as the sink begins execution (and regardless of
whether or not it completes).

**Signature**

```ts
export declare const ensuring: {
  <R2, _>(
    finalizer: Effect<R2, never, _>
  ): <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E, In, L, Z>
  <R, E, In, L, Z, R2, _>(self: Sink<R, E, In, L, Z>, finalizer: Effect<R2, never, _>): Sink<R | R2, E, In, L, Z>
}
```

Added in v2.0.0

## ensuringWith

Returns a new sink with an attached finalizer. The finalizer is guaranteed
to be executed so long as the sink begins execution (and regardless of
whether or not it completes).

**Signature**

```ts
export declare const ensuringWith: {
  <E, Z, R2, _>(
    finalizer: (exit: Exit<E, Z>) => Effect<R2, never, _>
  ): <R, In, L>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E, In, L, Z>
  <R, In, L, E, Z, R2, _>(
    self: Sink<R, E, In, L, Z>,
    finalizer: (exit: Exit<E, Z>) => Effect<R2, never, _>
  ): Sink<R | R2, E, In, L, Z>
}
```

Added in v2.0.0

# folding

## fold

A sink that folds its inputs with the provided function, termination
predicate and initial state.

**Signature**

```ts
export declare const fold: <S, In>(
  s: S,
  contFn: Predicate<S>,
  f: (z: S, input: In) => S
) => Sink<never, never, In, In, S>
```

Added in v2.0.0

## foldSink

Folds over the result of the sink

**Signature**

```ts
export declare const foldSink: {
  <R1, R2, E, E1, E2, In, In1 extends In, In2 extends In, L, L1, L2, Z, Z1, Z2>(options: {
    readonly onFailure: (err: E) => Sink<R1, E1, In1, L1, Z1>
    readonly onSuccess: (z: Z) => Sink<R2, E2, In2, L2, Z2>
  }): <R>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R2 | R, E1 | E2, In1 & In2, L1 | L2, Z1 | Z2>
  <R, R1, R2, E, E1, E2, In, In1 extends In, In2 extends In, L, L1, L2, Z, Z1, Z2>(
    self: Sink<R, E, In, L, Z>,
    options: {
      readonly onFailure: (err: E) => Sink<R1, E1, In1, L1, Z1>
      readonly onSuccess: (z: Z) => Sink<R2, E2, In2, L2, Z2>
    }
  ): Sink<R | R1 | R2, E1 | E2, In1 & In2, L1 | L2, Z1 | Z2>
}
```

Added in v2.0.0

# mapping

## as

Replaces this sink's result with the provided value.

**Signature**

```ts
export declare const as: {
  <Z2>(z: Z2): <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, Z2>
  <R, E, In, L, Z, Z2>(self: Sink<R, E, In, L, Z>, z: Z2): Sink<R, E, In, L, Z2>
}
```

Added in v2.0.0

## dimap

Transforms both inputs and result of this sink using the provided
functions.

**Signature**

```ts
export declare const dimap: {
  <In0, In, Z, Z2>(options: {
    readonly onInput: (input: In0) => In
    readonly onDone: (z: Z) => Z2
  }): <R, E, L>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In0, L, Z2>
  <R, E, L, In0, In, Z, Z2>(
    self: Sink<R, E, In, L, Z>,
    options: { readonly onInput: (input: In0) => In; readonly onDone: (z: Z) => Z2 }
  ): Sink<R, E, In0, L, Z2>
}
```

Added in v2.0.0

## dimapChunks

Transforms both input chunks and result of this sink using the provided
functions.

**Signature**

```ts
export declare const dimapChunks: {
  <In0, In, Z, Z2>(options: {
    readonly onInput: (chunk: Chunk.Chunk<In0>) => Chunk.Chunk<In>
    readonly onDone: (z: Z) => Z2
  }): <R, E, L>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In0, L, Z2>
  <R, E, L, In0, In, Z, Z2>(
    self: Sink<R, E, In, L, Z>,
    options: { readonly onInput: (chunk: Chunk.Chunk<In0>) => Chunk.Chunk<In>; readonly onDone: (z: Z) => Z2 }
  ): Sink<R, E, In0, L, Z2>
}
```

Added in v2.0.0

## dimapChunksEffect

Effectfully transforms both input chunks and result of this sink using the
provided functions. `f` and `g` must preserve chunking-invariance.

**Signature**

```ts
export declare const dimapChunksEffect: {
  <In0, R2, E2, In, Z, R3, E3, Z2>(options: {
    readonly onInput: (chunk: Chunk.Chunk<In0>) => Effect<R2, E2, Chunk.Chunk<In>>
    readonly onDone: (z: Z) => Effect<R3, E3, Z2>
  }): <R, E, L>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R3 | R, E2 | E3 | E, In0, L, Z2>
  <R, E, L, In0, R2, E2, In, Z, R3, E3, Z2>(
    self: Sink<R, E, In, L, Z>,
    options: {
      readonly onInput: (chunk: Chunk.Chunk<In0>) => Effect<R2, E2, Chunk.Chunk<In>>
      readonly onDone: (z: Z) => Effect<R3, E3, Z2>
    }
  ): Sink<R | R2 | R3, E | E2 | E3, In0, L, Z2>
}
```

Added in v2.0.0

## dimapEffect

Effectfully transforms both inputs and result of this sink using the
provided functions.

**Signature**

```ts
export declare const dimapEffect: {
  <In0, R2, E2, In, Z, R3, E3, Z2>(options: {
    readonly onInput: (input: In0) => Effect<R2, E2, In>
    readonly onDone: (z: Z) => Effect<R3, E3, Z2>
  }): <R, E, L>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R3 | R, E2 | E3 | E, In0, L, Z2>
  <R, E, L, In0, R2, E2, In, Z, R3, E3, Z2>(
    self: Sink<R, E, In, L, Z>,
    options: {
      readonly onInput: (input: In0) => Effect<R2, E2, In>
      readonly onDone: (z: Z) => Effect<R3, E3, Z2>
    }
  ): Sink<R | R2 | R3, E | E2 | E3, In0, L, Z2>
}
```

Added in v2.0.0

## map

Transforms this sink's result.

**Signature**

```ts
export declare const map: {
  <Z, Z2>(f: (z: Z) => Z2): <R, E, In, L>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, Z2>
  <R, E, In, L, Z, Z2>(self: Sink<R, E, In, L, Z>, f: (z: Z) => Z2): Sink<R, E, In, L, Z2>
}
```

Added in v2.0.0

## mapEffect

Effectfully transforms this sink's result.

**Signature**

```ts
export declare const mapEffect: {
  <Z, R2, E2, Z2>(
    f: (z: Z) => Effect<R2, E2, Z2>
  ): <R, E, In, L>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In, L, Z2>
  <R, E, In, L, Z, R2, E2, Z2>(
    self: Sink<R, E, In, L, Z>,
    f: (z: Z) => Effect<R2, E2, Z2>
  ): Sink<R | R2, E | E2, In, L, Z2>
}
```

Added in v2.0.0

## mapError

Transforms the errors emitted by this sink using `f`.

**Signature**

```ts
export declare const mapError: {
  <E, E2>(f: (error: E) => E2): <R, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E2, In, L, Z>
  <R, In, L, Z, E, E2>(self: Sink<R, E, In, L, Z>, f: (error: E) => E2): Sink<R, E2, In, L, Z>
}
```

Added in v2.0.0

## mapInput

Transforms this sink's input elements.

**Signature**

```ts
export declare const mapInput: (<In0, In>(
  f: (input: In0) => In
) => <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In0, L, Z>) &
  (<R, E, L, Z, In0, In>(self: Sink<R, E, In, L, Z>, f: (input: In0) => In) => Sink<R, E, In0, L, Z>)
```

Added in v2.0.0

## mapInputChunks

Transforms this sink's input chunks. `f` must preserve chunking-invariance.

**Signature**

```ts
export declare const mapInputChunks: {
  <In0, In>(
    f: (chunk: Chunk.Chunk<In0>) => Chunk.Chunk<In>
  ): <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In0, L, Z>
  <R, E, L, Z, In0, In>(
    self: Sink<R, E, In, L, Z>,
    f: (chunk: Chunk.Chunk<In0>) => Chunk.Chunk<In>
  ): Sink<R, E, In0, L, Z>
}
```

Added in v2.0.0

## mapInputChunksEffect

Effectfully transforms this sink's input chunks. `f` must preserve
chunking-invariance.

**Signature**

```ts
export declare const mapInputChunksEffect: {
  <In0, R2, E2, In>(
    f: (chunk: Chunk.Chunk<In0>) => Effect<R2, E2, Chunk.Chunk<In>>
  ): <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In0, L, Z>
  <R, E, L, Z, In0, R2, E2, In>(
    self: Sink<R, E, In, L, Z>,
    f: (chunk: Chunk.Chunk<In0>) => Effect<R2, E2, Chunk.Chunk<In>>
  ): Sink<R | R2, E | E2, In0, L, Z>
}
```

Added in v2.0.0

## mapInputEffect

Effectfully transforms this sink's input elements.

**Signature**

```ts
export declare const mapInputEffect: (<In0, R2, E2, In>(
  f: (input: In0) => Effect<R2, E2, In>
) => <R, E, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In0, L, Z>) &
  (<R, E, L, Z, In0, R2, E2, In>(
    self: Sink<R, E, In, L, Z>,
    f: (input: In0) => Effect<R2, E2, In>
  ) => Sink<R | R2, E | E2, In0, L, Z>)
```

Added in v2.0.0

## mapLeftover

Transforms the leftovers emitted by this sink using `f`.

**Signature**

```ts
export declare const mapLeftover: {
  <L, L2>(f: (leftover: L) => L2): <R, E, In, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, L2, Z>
  <R, E, In, Z, L, L2>(self: Sink<R, E, In, L, Z>, f: (leftover: L) => L2): Sink<R, E, In, L2, Z>
}
```

Added in v2.0.0

# models

## Sink (interface)

A `Sink<R, E, In, L, Z>` is used to consume elements produced by a `Stream`.
You can think of a sink as a function that will consume a variable amount of
`In` elements (could be 0, 1, or many), might fail with an error of type `E`,
and will eventually yield a value of type `Z` together with a remainder of
type `L` (i.e. any leftovers).

**Signature**

```ts
export interface Sink<R, E, In, L, Z> extends Sink.Variance<R, E, In, L, Z>, Pipeable {}
```

Added in v2.0.0

## SinkUnify (interface)

**Signature**

```ts
export interface SinkUnify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
  Sink?: () => A[Unify.typeSymbol] extends Sink<infer R, infer E, infer In, infer L, infer Z> | infer _
    ? Sink<R, E, In, L, Z>
    : never
}
```

Added in v2.0.0

## SinkUnifyIgnore (interface)

**Signature**

```ts
export interface SinkUnifyIgnore extends Effect.EffectUnifyIgnore {
  Sink?: true
}
```

Added in v2.0.0

# sequencing

## flatMap

Runs this sink until it yields a result, then uses that result to create
another sink from the provided function which will continue to run until it
yields a result.

This function essentially runs sinks in sequence.

**Signature**

```ts
export declare const flatMap: {
  <R1, E1, In, In1 extends In, L, L1, Z, Z1>(
    f: (z: Z) => Sink<R1, E1, In1, L1, Z1>
  ): <R, E>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L | L1, Z1>
  <R, E, R1, E1, In, In1 extends In, L, L1, Z, Z1>(
    self: Sink<R, E, In, L, Z>,
    f: (z: Z) => Sink<R1, E1, In1, L1, Z1>
  ): Sink<R | R1, E | E1, In & In1, L | L1, Z1>
}
```

Added in v2.0.0

# symbols

## SinkTypeId

**Signature**

```ts
export declare const SinkTypeId: typeof SinkTypeId
```

Added in v2.0.0

## SinkTypeId (type alias)

**Signature**

```ts
export type SinkTypeId = typeof SinkTypeId
```

Added in v2.0.0

# utils

## Sink (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<R, E, In, L, Z> {
  readonly [SinkTypeId]: VarianceStruct<R, E, In, L, Z>
}
```

Added in v2.0.0

### VarianceStruct (interface)

**Signature**

```ts
export interface VarianceStruct<R, E, In, L, Z> {
  _R: (_: never) => R
  _E: (_: never) => E
  _In: (_: In) => void
  _L: (_: never) => L
  _Z: (_: never) => Z
}
```

Added in v2.0.0

## collectAllFrom

Repeatedly runs the sink and accumulates its results into a `Chunk`.

**Signature**

```ts
export declare const collectAllFrom: <R, E, In, L extends In, Z>(
  self: Sink<R, E, In, L, Z>
) => Sink<R, E, In, L, Chunk.Chunk<Z>>
```

Added in v2.0.0

## collectAllWhileWith

Repeatedly runs the sink for as long as its results satisfy the predicate
`p`. The sink's results will be accumulated using the stepping function `f`.

**Signature**

```ts
export declare const collectAllWhileWith: {
  <Z, S>(options: {
    readonly initial: S
    readonly while: Predicate<Z>
    readonly body: (s: S, z: Z) => S
  }): <R, E, In, L extends In>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, L, S>
  <R, E, In, L extends In, Z, S>(
    self: Sink<R, E, In, L, Z>,
    options: { readonly initial: S; readonly while: Predicate<Z>; readonly body: (s: S, z: Z) => S }
  ): Sink<R, E, In, L, S>
}
```

Added in v2.0.0

## collectLeftover

Collects the leftovers from the stream when the sink succeeds and returns
them as part of the sink's result.

**Signature**

```ts
export declare const collectLeftover: <R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>
) => Sink<R, E, In, never, readonly [Z, Chunk.Chunk<L>]>
```

Added in v2.0.0

## ignoreLeftover

Drains the remaining elements from the stream after the sink finishes

**Signature**

```ts
export declare const ignoreLeftover: <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, never, Z>
```

Added in v2.0.0

## race

Runs both sinks in parallel on the input, , returning the result or the
error from the one that finishes first.

**Signature**

```ts
export declare const race: {
  <R1, E1, In1, L1, Z1>(
    that: Sink<R1, E1, In1, L1, Z1>
  ): <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1 | L, Z1 | Z>
  <R, E, In, L, Z, R1, E1, In1, L1, Z1>(
    self: Sink<R, E, In, L, Z>,
    that: Sink<R1, E1, In1, L1, Z1>
  ): Sink<R | R1, E | E1, In & In1, L | L1, Z | Z1>
}
```

Added in v2.0.0

## raceBoth

Runs both sinks in parallel on the input, returning the result or the error
from the one that finishes first.

**Signature**

```ts
export declare const raceBoth: {
  <R1, E1, In1, L1, Z1>(
    that: Sink<R1, E1, In1, L1, Z1>,
    options?: { readonly capacity?: number }
  ): <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R1 | R, E1 | E, In & In1, L1 | L, Either<Z, Z1>>
  <R, E, In, L, Z, R1, E1, In1, L1, Z1>(
    self: Sink<R, E, In, L, Z>,
    that: Sink<R1, E1, In1, L1, Z1>,
    options?: { readonly capacity?: number }
  ): Sink<R | R1, E | E1, In & In1, L | L1, Either<Z, Z1>>
}
```

Added in v2.0.0

## raceWith

Runs both sinks in parallel on the input, using the specified merge
function as soon as one result or the other has been computed.

**Signature**

```ts
export declare const raceWith: {
  <R2, E2, In2, L2, Z2, E, Z, Z3, Z4>(options: {
    readonly other: Sink<R2, E2, In2, L2, Z2>
    readonly onSelfDone: (exit: Exit<E, Z>) => MergeDecision.MergeDecision<R2, E2, Z2, E2 | E, Z3>
    readonly onOtherDone: (exit: Exit<E2, Z2>) => MergeDecision.MergeDecision<R2, E, Z, E2 | E, Z4>
    readonly capacity?: number | undefined
  }): <R, In, L>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In & In2, L2 | L, Z3 | Z4>
  <R, In, L, R2, E2, In2, L2, Z2, E, Z, Z3, Z4>(
    self: Sink<R, E, In, L, Z>,
    options: {
      readonly other: Sink<R2, E2, In2, L2, Z2>
      readonly onSelfDone: (exit: Exit<E, Z>) => MergeDecision.MergeDecision<R2, E2, Z2, E2 | E, Z3>
      readonly onOtherDone: (exit: Exit<E2, Z2>) => MergeDecision.MergeDecision<R2, E, Z, E2 | E, Z4>
      readonly capacity?: number | undefined
    }
  ): Sink<R | R2, E2 | E, In & In2, L | L2, Z3 | Z4>
}
```

Added in v2.0.0

## splitWhere

Splits the sink on the specified predicate, returning a new sink that
consumes elements until an element after the first satisfies the specified
predicate.

**Signature**

```ts
export declare const splitWhere: {
  <In>(f: Predicate<In>): <R, E, L extends In, Z>(self: Sink<R, E, In, L, Z>) => Sink<R, E, In, In, Z>
  <R, E, L extends In, Z, In>(self: Sink<R, E, In, L, Z>, f: Predicate<In>): Sink<R, E, In, In, Z>
}
```

Added in v2.0.0

## summarized

Summarize a sink by running an effect when the sink starts and again when
it completes.

**Signature**

```ts
export declare const summarized: {
  <R2, E2, Z2, Z3>(
    summary: Effect<R2, E2, Z2>,
    f: (start: Z2, end: Z2) => Z3
  ): <R, E, In, L, Z>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In, L, readonly [Z, Z3]>
  <R, E, In, L, Z, R2, E2, Z2, Z3>(
    self: Sink<R, E, In, L, Z>,
    summary: Effect<R2, E2, Z2>,
    f: (start: Z2, end: Z2) => Z3
  ): Sink<R | R2, E | E2, In, L, readonly [Z, Z3]>
}
```

Added in v2.0.0

## withDuration

Returns the sink that executes this one and times its execution.

**Signature**

```ts
export declare const withDuration: <R, E, In, L, Z>(
  self: Sink<R, E, In, L, Z>
) => Sink<R, E, In, L, readonly [Z, Duration.Duration]>
```

Added in v2.0.0

# zipping

## zip

Feeds inputs to this sink until it yields a result, then switches over to
the provided sink until it yields a result, finally combining the two
results into a tuple.

**Signature**

```ts
export declare const zip: {
  <R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    that: Sink<R2, E2, In2, L2, Z2>,
    options?: { readonly concurrent?: boolean }
  ): <R, E>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In & In2, L | L2, readonly [Z, Z2]>
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    self: Sink<R, E, In, L, Z>,
    that: Sink<R2, E2, In2, L2, Z2>,
    options?: { readonly concurrent?: boolean }
  ): Sink<R | R2, E | E2, In & In2, L | L2, readonly [Z, Z2]>
}
```

Added in v2.0.0

## zipLeft

Like `Sink.zip` but keeps only the result from this sink.

**Signature**

```ts
export declare const zipLeft: {
  <R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    that: Sink<R2, E2, In2, L2, Z2>,
    options?: { readonly concurrent?: boolean }
  ): <R, E>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In & In2, L | L2, Z>
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    self: Sink<R, E, In, L, Z>,
    that: Sink<R2, E2, In2, L2, Z2>,
    options?: { readonly concurrent?: boolean }
  ): Sink<R | R2, E | E2, In & In2, L | L2, Z>
}
```

Added in v2.0.0

## zipRight

Like `Sink.zip` but keeps only the result from `that` sink.

**Signature**

```ts
export declare const zipRight: {
  <R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    that: Sink<R2, E2, In2, L2, Z2>,
    options?: { readonly concurrent?: boolean }
  ): <R, E>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In & In2, L | L2, Z2>
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    self: Sink<R, E, In, L, Z>,
    that: Sink<R2, E2, In2, L2, Z2>,
    options?: { readonly concurrent?: boolean }
  ): Sink<R | R2, E | E2, In & In2, L | L2, Z2>
}
```

Added in v2.0.0

## zipWith

Feeds inputs to this sink until it yields a result, then switches over to
the provided sink until it yields a result, finally combining the two
results with `f`.

**Signature**

```ts
export declare const zipWith: {
  <R2, E2, In, In2 extends In, L, L2, Z, Z2, Z3>(
    that: Sink<R2, E2, In2, L2, Z2>,
    f: (z: Z, z1: Z2) => Z3,
    options?: { readonly concurrent?: boolean }
  ): <R, E>(self: Sink<R, E, In, L, Z>) => Sink<R2 | R, E2 | E, In & In2, L | L2, Z3>
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2, Z3>(
    self: Sink<R, E, In, L, Z>,
    that: Sink<R2, E2, In2, L2, Z2>,
    f: (z: Z, z1: Z2) => Z3,
    options?: { readonly concurrent?: boolean }
  ): Sink<R | R2, E | E2, In & In2, L | L2, Z3>
}
```

Added in v2.0.0
