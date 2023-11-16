---
title: Stream.ts
nav_order: 107
parent: Modules
---

## Stream overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [splitLines](#splitlines)
- [constants](#constants)
  - [DefaultChunkSize](#defaultchunksize)
- [constructors](#constructors)
  - [acquireRelease](#acquirerelease)
  - [async](#async)
  - [asyncEffect](#asynceffect)
  - [asyncInterrupt](#asyncinterrupt)
  - [asyncOption](#asyncoption)
  - [asyncScoped](#asyncscoped)
  - [concatAll](#concatall)
  - [die](#die)
  - [dieMessage](#diemessage)
  - [dieSync](#diesync)
  - [empty](#empty)
  - [execute](#execute)
  - [fail](#fail)
  - [failCause](#failcause)
  - [failCauseSync](#failcausesync)
  - [failSync](#failsync)
  - [finalizer](#finalizer)
  - [fromAsyncIterable](#fromasynciterable)
  - [fromChannel](#fromchannel)
  - [fromChunk](#fromchunk)
  - [fromChunkPubSub](#fromchunkpubsub)
  - [fromChunkQueue](#fromchunkqueue)
  - [fromChunks](#fromchunks)
  - [fromEffect](#fromeffect)
  - [fromEffectOption](#fromeffectoption)
  - [fromIterable](#fromiterable)
  - [fromIterableEffect](#fromiterableeffect)
  - [fromIteratorSucceed](#fromiteratorsucceed)
  - [fromPubSub](#frompubsub)
  - [fromPull](#frompull)
  - [fromQueue](#fromqueue)
  - [fromReadableStream](#fromreadablestream)
  - [fromReadableStreamByob](#fromreadablestreambyob)
  - [fromSchedule](#fromschedule)
  - [iterate](#iterate)
  - [make](#make)
  - [never](#never)
  - [paginate](#paginate)
  - [paginateChunk](#paginatechunk)
  - [paginateChunkEffect](#paginatechunkeffect)
  - [paginateEffect](#paginateeffect)
  - [range](#range)
  - [repeatEffect](#repeateffect)
  - [repeatEffectChunk](#repeateffectchunk)
  - [repeatEffectChunkOption](#repeateffectchunkoption)
  - [repeatEffectOption](#repeateffectoption)
  - [repeatEffectWithSchedule](#repeateffectwithschedule)
  - [repeatValue](#repeatvalue)
  - [scoped](#scoped)
  - [succeed](#succeed)
  - [suspend](#suspend)
  - [sync](#sync)
  - [tick](#tick)
  - [toChannel](#tochannel)
  - [unfold](#unfold)
  - [unfoldChunk](#unfoldchunk)
  - [unfoldChunkEffect](#unfoldchunkeffect)
  - [unfoldEffect](#unfoldeffect)
  - [unit](#unit)
  - [unwrap](#unwrap)
  - [unwrapScoped](#unwrapscoped)
  - [whenCase](#whencase)
- [context](#context)
  - [context](#context-1)
  - [contextWith](#contextwith)
  - [contextWithEffect](#contextwitheffect)
  - [contextWithStream](#contextwithstream)
  - [mapInputContext](#mapinputcontext)
  - [provideContext](#providecontext)
  - [provideLayer](#providelayer)
  - [provideService](#provideservice)
  - [provideServiceEffect](#provideserviceeffect)
  - [provideServiceStream](#provideservicestream)
  - [provideSomeLayer](#providesomelayer)
  - [updateService](#updateservice)
- [destructors](#destructors)
  - [run](#run)
  - [runCollect](#runcollect)
  - [runCount](#runcount)
  - [runDrain](#rundrain)
  - [runFold](#runfold)
  - [runFoldEffect](#runfoldeffect)
  - [runFoldScoped](#runfoldscoped)
  - [runFoldScopedEffect](#runfoldscopedeffect)
  - [runFoldWhile](#runfoldwhile)
  - [runFoldWhileEffect](#runfoldwhileeffect)
  - [runFoldWhileScoped](#runfoldwhilescoped)
  - [runFoldWhileScopedEffect](#runfoldwhilescopedeffect)
  - [runForEach](#runforeach)
  - [runForEachChunk](#runforeachchunk)
  - [runForEachChunkScoped](#runforeachchunkscoped)
  - [runForEachScoped](#runforeachscoped)
  - [runForEachWhile](#runforeachwhile)
  - [runForEachWhileScoped](#runforeachwhilescoped)
  - [runHead](#runhead)
  - [runIntoPubSub](#runintopubsub)
  - [runIntoPubSubScoped](#runintopubsubscoped)
  - [runIntoQueue](#runintoqueue)
  - [runIntoQueueElementsScoped](#runintoqueueelementsscoped)
  - [runIntoQueueScoped](#runintoqueuescoped)
  - [runLast](#runlast)
  - [runScoped](#runscoped)
  - [runSum](#runsum)
  - [toPubSub](#topubsub)
  - [toPull](#topull)
  - [toQueue](#toqueue)
  - [toQueueOfElements](#toqueueofelements)
  - [toReadableStream](#toreadablestream)
- [do notation](#do-notation)
  - [Do](#do)
  - [bind](#bind)
  - [bindEffect](#bindeffect)
  - [bindTo](#bindto)
  - [let](#let)
- [elements](#elements)
  - [find](#find)
  - [findEffect](#findeffect)
- [encoding](#encoding)
  - [decodeText](#decodetext)
  - [encodeText](#encodetext)
- [error handling](#error-handling)
  - [catchAll](#catchall)
  - [catchAllCause](#catchallcause)
  - [catchSome](#catchsome)
  - [catchSomeCause](#catchsomecause)
  - [catchTag](#catchtag)
  - [catchTags](#catchtags)
  - [orDie](#ordie)
  - [orDieWith](#ordiewith)
  - [orElse](#orelse)
  - [orElseEither](#orelseeither)
  - [orElseFail](#orelsefail)
  - [orElseIfEmpty](#orelseifempty)
  - [orElseIfEmptyChunk](#orelseifemptychunk)
  - [orElseIfEmptyStream](#orelseifemptystream)
  - [orElseSucceed](#orelsesucceed)
  - [refineOrDie](#refineordie)
  - [refineOrDieWith](#refineordiewith)
- [filtering](#filtering)
  - [filter](#filter)
  - [filterEffect](#filtereffect)
- [grouping](#grouping)
  - [groupAdjacentBy](#groupadjacentby)
  - [groupBy](#groupby)
- [mapping](#mapping)
  - [as](#as)
  - [map](#map)
  - [mapAccum](#mapaccum)
  - [mapAccumEffect](#mapaccumeffect)
  - [mapChunks](#mapchunks)
  - [mapChunksEffect](#mapchunkseffect)
  - [mapConcat](#mapconcat)
  - [mapConcatChunk](#mapconcatchunk)
  - [mapConcatChunkEffect](#mapconcatchunkeffect)
  - [mapConcatEffect](#mapconcateffect)
  - [mapEffect](#mapeffect)
  - [mapError](#maperror)
  - [mapErrorCause](#maperrorcause)
- [models](#models)
  - [Stream (interface)](#stream-interface)
  - [StreamUnify (interface)](#streamunify-interface)
  - [StreamUnifyIgnore (interface)](#streamunifyignore-interface)
- [sequencing](#sequencing)
  - [branchAfter](#branchafter)
  - [flatMap](#flatmap)
  - [flatten](#flatten)
  - [flattenChunks](#flattenchunks)
  - [flattenEffect](#flatteneffect)
  - [flattenExitOption](#flattenexitoption)
  - [flattenIterables](#flatteniterables)
  - [flattenTake](#flattentake)
  - [tap](#tap)
  - [tapBoth](#tapboth)
  - [tapError](#taperror)
  - [tapSink](#tapsink)
- [symbols](#symbols)
  - [StreamTypeId](#streamtypeid)
  - [StreamTypeId (type alias)](#streamtypeid-type-alias)
- [tracing](#tracing)
  - [withSpan](#withspan)
- [type lambdas](#type-lambdas)
  - [StreamTypeLambda (interface)](#streamtypelambda-interface)
- [utils](#utils)
  - [Stream (namespace)](#stream-namespace)
    - [Variance (interface)](#variance-interface)
    - [DynamicTuple (type alias)](#dynamictuple-type-alias)
    - [DynamicTupleOf (type alias)](#dynamictupleof-type-alias)
  - [accumulate](#accumulate)
  - [accumulateChunks](#accumulatechunks)
  - [aggregate](#aggregate)
  - [aggregateWithin](#aggregatewithin)
  - [aggregateWithinEither](#aggregatewithineither)
  - [broadcast](#broadcast)
  - [broadcastDynamic](#broadcastdynamic)
  - [broadcastedQueues](#broadcastedqueues)
  - [broadcastedQueuesDynamic](#broadcastedqueuesdynamic)
  - [buffer](#buffer)
  - [bufferChunks](#bufferchunks)
  - [changes](#changes)
  - [changesWith](#changeswith)
  - [changesWithEffect](#changeswitheffect)
  - [chunks](#chunks)
  - [chunksWith](#chunkswith)
  - [combine](#combine)
  - [combineChunks](#combinechunks)
  - [concat](#concat)
  - [cross](#cross)
  - [crossLeft](#crossleft)
  - [crossRight](#crossright)
  - [crossWith](#crosswith)
  - [debounce](#debounce)
  - [distributedWith](#distributedwith)
  - [distributedWithDynamic](#distributedwithdynamic)
  - [drain](#drain)
  - [drainFork](#drainfork)
  - [drop](#drop)
  - [dropRight](#dropright)
  - [dropUntil](#dropuntil)
  - [dropUntilEffect](#dropuntileffect)
  - [dropWhile](#dropwhile)
  - [dropWhileEffect](#dropwhileeffect)
  - [either](#either)
  - [ensuring](#ensuring)
  - [ensuringWith](#ensuringwith)
  - [filterMap](#filtermap)
  - [filterMapEffect](#filtermapeffect)
  - [filterMapWhile](#filtermapwhile)
  - [filterMapWhileEffect](#filtermapwhileeffect)
  - [forever](#forever)
  - [groupByKey](#groupbykey)
  - [grouped](#grouped)
  - [groupedWithin](#groupedwithin)
  - [haltAfter](#haltafter)
  - [haltWhen](#haltwhen)
  - [haltWhenDeferred](#haltwhendeferred)
  - [identity](#identity)
  - [interleave](#interleave)
  - [interleaveWith](#interleavewith)
  - [interruptAfter](#interruptafter)
  - [interruptWhen](#interruptwhen)
  - [interruptWhenDeferred](#interruptwhendeferred)
  - [intersperse](#intersperse)
  - [intersperseAffixes](#intersperseaffixes)
  - [mapBoth](#mapboth)
  - [merge](#merge)
  - [mergeAll](#mergeall)
  - [mergeEither](#mergeeither)
  - [mergeLeft](#mergeleft)
  - [mergeRight](#mergeright)
  - [mergeWith](#mergewith)
  - [mkString](#mkstring)
  - [onDone](#ondone)
  - [onError](#onerror)
  - [partition](#partition)
  - [partitionEither](#partitioneither)
  - [peel](#peel)
  - [pipeThrough](#pipethrough)
  - [pipeThroughChannel](#pipethroughchannel)
  - [pipeThroughChannelOrFail](#pipethroughchannelorfail)
  - [prepend](#prepend)
  - [rechunk](#rechunk)
  - [repeat](#repeat)
  - [repeatEither](#repeateither)
  - [repeatElements](#repeatelements)
  - [repeatElementsWith](#repeatelementswith)
  - [repeatWith](#repeatwith)
  - [retry](#retry)
  - [scan](#scan)
  - [scanEffect](#scaneffect)
  - [scanReduce](#scanreduce)
  - [scanReduceEffect](#scanreduceeffect)
  - [schedule](#schedule)
  - [scheduleWith](#schedulewith)
  - [sliding](#sliding)
  - [slidingSize](#slidingsize)
  - [some](#some)
  - [someOrElse](#someorelse)
  - [someOrFail](#someorfail)
  - [split](#split)
  - [splitOnChunk](#splitonchunk)
  - [take](#take)
  - [takeRight](#takeright)
  - [takeUntil](#takeuntil)
  - [takeUntilEffect](#takeuntileffect)
  - [takeWhile](#takewhile)
  - [tapErrorCause](#taperrorcause)
  - [throttle](#throttle)
  - [throttleEffect](#throttleeffect)
  - [timeout](#timeout)
  - [timeoutFail](#timeoutfail)
  - [timeoutFailCause](#timeoutfailcause)
  - [timeoutTo](#timeoutto)
  - [transduce](#transduce)
  - [when](#when)
  - [whenCaseEffect](#whencaseeffect)
  - [whenEffect](#wheneffect)
- [zipping](#zipping)
  - [zip](#zip)
  - [zipAll](#zipall)
  - [zipAllLeft](#zipallleft)
  - [zipAllRight](#zipallright)
  - [zipAllSortedByKey](#zipallsortedbykey)
  - [zipAllSortedByKeyLeft](#zipallsortedbykeyleft)
  - [zipAllSortedByKeyRight](#zipallsortedbykeyright)
  - [zipAllSortedByKeyWith](#zipallsortedbykeywith)
  - [zipAllWith](#zipallwith)
  - [zipFlatten](#zipflatten)
  - [zipLatest](#ziplatest)
  - [zipLatestWith](#ziplatestwith)
  - [zipLeft](#zipleft)
  - [zipRight](#zipright)
  - [zipWith](#zipwith)
  - [zipWithChunks](#zipwithchunks)
  - [zipWithIndex](#zipwithindex)
  - [zipWithNext](#zipwithnext)
  - [zipWithPrevious](#zipwithprevious)
  - [zipWithPreviousAndNext](#zipwithpreviousandnext)

---

# combinators

## splitLines

Splits strings on newlines. Handles both Windows newlines (`\r\n`) and UNIX
newlines (`\n`).

**Signature**

```ts
export declare const splitLines: <R, E>(self: Stream<R, E, string>) => Stream<R, E, string>
```

Added in v2.0.0

# constants

## DefaultChunkSize

The default chunk size used by the various combinators and constructors of
`Stream`.

**Signature**

```ts
export declare const DefaultChunkSize: number
```

Added in v2.0.0

# constructors

## acquireRelease

Creates a stream from a single value that will get cleaned up after the
stream is consumed.

**Signature**

```ts
export declare const acquireRelease: <R, E, A, R2, _>(
  acquire: Effect.Effect<R, E, A>,
  release: (resource: A, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, _>
) => Stream<R | R2, E, A>
```

Added in v2.0.0

## async

Creates a stream from an asynchronous callback that can be called multiple
times. The optionality of the error type `E` can be used to signal the end
of the stream, by setting it to `None`.

**Signature**

```ts
export declare const async: <R, E, A>(
  register: (emit: Emit.Emit<R, E, A, void>) => void,
  outputBuffer?: number | undefined
) => Stream<R, E, A>
```

Added in v2.0.0

## asyncEffect

Creates a stream from an asynchronous callback that can be called multiple
times The registration of the callback itself returns an effect. The
optionality of the error type `E` can be used to signal the end of the
stream, by setting it to `None`.

**Signature**

```ts
export declare const asyncEffect: <R, E, A>(
  register: (emit: Emit.Emit<R, E, A, void>) => Effect.Effect<R, E, unknown>,
  outputBuffer?: number
) => Stream<R, E, A>
```

Added in v2.0.0

## asyncInterrupt

Creates a stream from an asynchronous callback that can be called multiple
times. The registration of the callback returns either a canceler or
synchronously returns a stream. The optionality of the error type `E` can
be used to signal the end of the stream, by setting it to `None`.

**Signature**

```ts
export declare const asyncInterrupt: <R, E, A>(
  register: (emit: Emit.Emit<R, E, A, void>) => Either.Either<Effect.Effect<R, never, unknown>, Stream<R, E, A>>,
  outputBuffer?: number
) => Stream<R, E, A>
```

Added in v2.0.0

## asyncOption

Creates a stream from an asynchronous callback that can be called multiple
times. The registration of the callback can possibly return the stream
synchronously. The optionality of the error type `E` can be used to signal
the end of the stream, by setting it to `None`.

**Signature**

```ts
export declare const asyncOption: <R, E, A>(
  register: (emit: Emit.Emit<R, E, A, void>) => Option.Option<Stream<R, E, A>>,
  outputBuffer?: number
) => Stream<R, E, A>
```

Added in v2.0.0

## asyncScoped

Creates a stream from an asynchronous callback that can be called multiple
times. The registration of the callback itself returns an a scoped
resource. The optionality of the error type `E` can be used to signal the
end of the stream, by setting it to `None`.

**Signature**

```ts
export declare const asyncScoped: <R, E, A>(
  register: (emit: Emit.Emit<R, E, A, void>) => Effect.Effect<R, E, unknown>,
  outputBuffer?: number
) => Stream<Exclude<R, Scope.Scope>, E, A>
```

Added in v2.0.0

## concatAll

Concatenates all of the streams in the chunk to one stream.

**Signature**

```ts
export declare const concatAll: <R, E, A>(streams: Chunk.Chunk<Stream<R, E, A>>) => Stream<R, E, A>
```

Added in v2.0.0

## die

The stream that dies with the specified defect.

**Signature**

```ts
export declare const die: (defect: unknown) => Stream<never, never, never>
```

Added in v2.0.0

## dieMessage

The stream that dies with an exception described by `message`.

**Signature**

```ts
export declare const dieMessage: (message: string) => Stream<never, never, never>
```

Added in v2.0.0

## dieSync

The stream that dies with the specified lazily evaluated defect.

**Signature**

```ts
export declare const dieSync: (evaluate: LazyArg<unknown>) => Stream<never, never, never>
```

Added in v2.0.0

## empty

The empty stream.

**Signature**

```ts
export declare const empty: Stream<never, never, never>
```

Added in v2.0.0

## execute

Creates a stream that executes the specified effect but emits no elements.

**Signature**

```ts
export declare const execute: <R, E, _>(effect: Effect.Effect<R, E, _>) => Stream<R, E, never>
```

Added in v2.0.0

## fail

Terminates with the specified error.

**Signature**

```ts
export declare const fail: <E>(error: E) => Stream<never, E, never>
```

Added in v2.0.0

## failCause

The stream that always fails with the specified `Cause`.

**Signature**

```ts
export declare const failCause: <E>(cause: Cause.Cause<E>) => Stream<never, E, never>
```

Added in v2.0.0

## failCauseSync

The stream that always fails with the specified lazily evaluated `Cause`.

**Signature**

```ts
export declare const failCauseSync: <E>(evaluate: LazyArg<Cause.Cause<E>>) => Stream<never, E, never>
```

Added in v2.0.0

## failSync

Terminates with the specified lazily evaluated error.

**Signature**

```ts
export declare const failSync: <E>(evaluate: LazyArg<E>) => Stream<never, E, never>
```

Added in v2.0.0

## finalizer

Creates a one-element stream that never fails and executes the finalizer
when it ends.

**Signature**

```ts
export declare const finalizer: <R, _>(finalizer: Effect.Effect<R, never, _>) => Stream<R, never, void>
```

Added in v2.0.0

## fromAsyncIterable

Creates a stream from an `AsyncIterable`.

**Signature**

```ts
export declare const fromAsyncIterable: <E, A>(
  iterable: AsyncIterable<A>,
  onError: (e: unknown) => E
) => Stream<never, E, A>
```

Added in v2.0.0

## fromChannel

Creates a stream from a `Channel`.

**Signature**

```ts
export declare const fromChannel: <R, E, A>(
  channel: Channel.Channel<R, unknown, unknown, unknown, E, Chunk.Chunk<A>, unknown>
) => Stream<R, E, A>
```

Added in v2.0.0

## fromChunk

Creates a stream from a `Chunk` of values.

**Signature**

```ts
export declare const fromChunk: <A>(chunk: Chunk.Chunk<A>) => Stream<never, never, A>
```

Added in v2.0.0

## fromChunkPubSub

Creates a stream from a subscription to a `PubSub`.

**Signature**

```ts
export declare const fromChunkPubSub: {
  <A>(
    pubsub: PubSub.PubSub<Chunk.Chunk<A>>,
    options: { readonly scoped: true; readonly shutdown?: boolean | undefined }
  ): Effect.Effect<Scope.Scope, never, Stream<never, never, A>>
  <A>(
    pubsub: PubSub.PubSub<Chunk.Chunk<A>>,
    options?: { readonly scoped?: false | undefined; readonly shutdown?: boolean | undefined }
  ): Stream<never, never, A>
}
```

Added in v2.0.0

## fromChunkQueue

Creates a stream from a `Queue` of values.

**Signature**

```ts
export declare const fromChunkQueue: <A>(
  queue: Queue.Dequeue<Chunk.Chunk<A>>,
  options?: { readonly shutdown?: boolean | undefined }
) => Stream<never, never, A>
```

Added in v2.0.0

## fromChunks

Creates a stream from an arbitrary number of chunks.

**Signature**

```ts
export declare const fromChunks: <A>(...chunks: Chunk.Chunk<A>[]) => Stream<never, never, A>
```

Added in v2.0.0

## fromEffect

Either emits the success value of this effect or terminates the stream
with the failure value of this effect.

**Signature**

```ts
export declare const fromEffect: <R, E, A>(effect: Effect.Effect<R, E, A>) => Stream<R, E, A>
```

Added in v2.0.0

## fromEffectOption

Creates a stream from an effect producing a value of type `A` or an empty
`Stream`.

**Signature**

```ts
export declare const fromEffectOption: <R, E, A>(effect: Effect.Effect<R, Option.Option<E>, A>) => Stream<R, E, A>
```

Added in v2.0.0

## fromIterable

Creates a stream from an `Iterable` collection of values.

**Signature**

```ts
export declare const fromIterable: <A>(iterable: Iterable<A>) => Stream<never, never, A>
```

Added in v2.0.0

## fromIterableEffect

Creates a stream from an effect producing a value of type `Iterable<A>`.

**Signature**

```ts
export declare const fromIterableEffect: <R, E, A>(effect: Effect.Effect<R, E, Iterable<A>>) => Stream<R, E, A>
```

Added in v2.0.0

## fromIteratorSucceed

Creates a stream from an iterator

**Signature**

```ts
export declare const fromIteratorSucceed: <A>(
  iterator: IterableIterator<A>,
  maxChunkSize?: number
) => Stream<never, never, A>
```

Added in v2.0.0

## fromPubSub

Creates a stream from a subscription to a `PubSub`.

**Signature**

```ts
export declare const fromPubSub: {
  <A>(
    pubsub: PubSub.PubSub<A>,
    options: {
      readonly scoped: true
      readonly maxChunkSize?: number | undefined
      readonly shutdown?: boolean | undefined
    }
  ): Effect.Effect<Scope.Scope, never, Stream<never, never, A>>
  <A>(
    pubsub: PubSub.PubSub<A>,
    options?: {
      readonly scoped?: false | undefined
      readonly maxChunkSize?: number | undefined
      readonly shutdown?: boolean | undefined
    }
  ): Stream<never, never, A>
}
```

Added in v2.0.0

## fromPull

Creates a stream from an effect that pulls elements from another stream.

See `Stream.toPull` for reference.

**Signature**

```ts
export declare const fromPull: <R, R2, E, A>(
  effect: Effect.Effect<Scope.Scope | R, never, Effect.Effect<R2, Option.Option<E>, Chunk.Chunk<A>>>
) => Stream<R2 | Exclude<R, Scope.Scope>, E, A>
```

Added in v2.0.0

## fromQueue

Creates a stream from a queue of values

**Signature**

```ts
export declare const fromQueue: <A>(
  queue: Queue.Dequeue<A>,
  options?: { readonly maxChunkSize?: number | undefined; readonly shutdown?: boolean | undefined }
) => Stream<never, never, A>
```

Added in v2.0.0

## fromReadableStream

Creates a stream from a `ReadableStream`.

See https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream.

**Signature**

```ts
export declare const fromReadableStream: <A, E>(
  evaluate: LazyArg<ReadableStream<A>>,
  onError: (error: unknown) => E
) => Stream<never, E, A>
```

Added in v2.0.0

## fromReadableStreamByob

Creates a stream from a `ReadableStreamBYOBReader`.

See https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamBYOBReader.

**Signature**

```ts
export declare const fromReadableStreamByob: <E>(
  evaluate: LazyArg<ReadableStream<Uint8Array>>,
  onError: (error: unknown) => E,
  allocSize?: number
) => Stream<never, E, Uint8Array>
```

Added in v2.0.0

## fromSchedule

Creates a stream from a `Schedule` that does not require any further
input. The stream will emit an element for each value output from the
schedule, continuing for as long as the schedule continues.

**Signature**

```ts
export declare const fromSchedule: <R, A>(schedule: Schedule.Schedule<R, unknown, A>) => Stream<R, never, A>
```

Added in v2.0.0

## iterate

The infinite stream of iterative function application: a, f(a), f(f(a)),
f(f(f(a))), ...

**Signature**

```ts
export declare const iterate: <A>(value: A, next: (value: A) => A) => Stream<never, never, A>
```

Added in v2.0.0

## make

Creates a stream from an sequence of values.

**Signature**

```ts
export declare const make: <As extends any[]>(...as: As) => Stream<never, never, As[number]>
```

Added in v2.0.0

## never

The stream that never produces any value or fails with any error.

**Signature**

```ts
export declare const never: Stream<never, never, never>
```

Added in v2.0.0

## paginate

Like `Stream.unfold`, but allows the emission of values to end one step further
than the unfolding of the state. This is useful for embedding paginated
APIs, hence the name.

**Signature**

```ts
export declare const paginate: <S, A>(s: S, f: (s: S) => readonly [A, Option.Option<S>]) => Stream<never, never, A>
```

Added in v2.0.0

## paginateChunk

Like `Stream.unfoldChunk`, but allows the emission of values to end one step
further than the unfolding of the state. This is useful for embedding
paginated APIs, hence the name.

**Signature**

```ts
export declare const paginateChunk: <S, A>(
  s: S,
  f: (s: S) => readonly [Chunk.Chunk<A>, Option.Option<S>]
) => Stream<never, never, A>
```

Added in v2.0.0

## paginateChunkEffect

Like `Stream.unfoldChunkEffect`, but allows the emission of values to end one step
further than the unfolding of the state. This is useful for embedding
paginated APIs, hence the name.

**Signature**

```ts
export declare const paginateChunkEffect: <S, R, E, A>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, readonly [Chunk.Chunk<A>, Option.Option<S>]>
) => Stream<R, E, A>
```

Added in v2.0.0

## paginateEffect

Like `Stream.unfoldEffect` but allows the emission of values to end one step
further than the unfolding of the state. This is useful for embedding
paginated APIs, hence the name.

**Signature**

```ts
export declare const paginateEffect: <S, R, E, A>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, readonly [A, Option.Option<S>]>
) => Stream<R, E, A>
```

Added in v2.0.0

## range

Constructs a stream from a range of integers, including both endpoints.

**Signature**

```ts
export declare const range: (min: number, max: number, chunkSize?: number) => Stream<never, never, number>
```

Added in v2.0.0

## repeatEffect

Creates a stream from an effect producing a value of type `A` which repeats
forever.

**Signature**

```ts
export declare const repeatEffect: <R, E, A>(effect: Effect.Effect<R, E, A>) => Stream<R, E, A>
```

Added in v2.0.0

## repeatEffectChunk

Creates a stream from an effect producing chunks of `A` values which
repeats forever.

**Signature**

```ts
export declare const repeatEffectChunk: <R, E, A>(effect: Effect.Effect<R, E, Chunk.Chunk<A>>) => Stream<R, E, A>
```

Added in v2.0.0

## repeatEffectChunkOption

Creates a stream from an effect producing chunks of `A` values until it
fails with `None`.

**Signature**

```ts
export declare const repeatEffectChunkOption: <R, E, A>(
  effect: Effect.Effect<R, Option.Option<E>, Chunk.Chunk<A>>
) => Stream<R, E, A>
```

Added in v2.0.0

## repeatEffectOption

Creates a stream from an effect producing values of type `A` until it fails
with `None`.

**Signature**

```ts
export declare const repeatEffectOption: <R, E, A>(effect: Effect.Effect<R, Option.Option<E>, A>) => Stream<R, E, A>
```

Added in v2.0.0

## repeatEffectWithSchedule

Creates a stream from an effect producing a value of type `A`, which is
repeated using the specified schedule.

**Signature**

```ts
export declare const repeatEffectWithSchedule: <R, E, A, A0 extends A, R2, _>(
  effect: Effect.Effect<R, E, A>,
  schedule: Schedule.Schedule<R2, A0, _>
) => Stream<R | R2, E, A>
```

Added in v2.0.0

## repeatValue

Repeats the provided value infinitely.

**Signature**

```ts
export declare const repeatValue: <A>(value: A) => Stream<never, never, A>
```

Added in v2.0.0

## scoped

Creates a single-valued stream from a scoped resource.

**Signature**

```ts
export declare const scoped: <R, E, A>(effect: Effect.Effect<R, E, A>) => Stream<Exclude<R, Scope.Scope>, E, A>
```

Added in v2.0.0

## succeed

Creates a single-valued pure stream.

**Signature**

```ts
export declare const succeed: <A>(value: A) => Stream<never, never, A>
```

Added in v2.0.0

## suspend

Returns a lazily constructed stream.

**Signature**

```ts
export declare const suspend: <R, E, A>(stream: LazyArg<Stream<R, E, A>>) => Stream<R, E, A>
```

Added in v2.0.0

## sync

Creates a single-valued pure stream.

**Signature**

```ts
export declare const sync: <A>(evaluate: LazyArg<A>) => Stream<never, never, A>
```

Added in v2.0.0

## tick

A stream that emits Unit values spaced by the specified duration.

**Signature**

```ts
export declare const tick: (interval: Duration.DurationInput) => Stream<never, never, void>
```

Added in v2.0.0

## toChannel

Creates a channel from a `Stream`.

**Signature**

```ts
export declare const toChannel: <R, E, A>(
  stream: Stream<R, E, A>
) => Channel.Channel<R, unknown, unknown, unknown, E, Chunk.Chunk<A>, unknown>
```

Added in v2.0.0

## unfold

Creates a stream by peeling off the "layers" of a value of type `S`.

**Signature**

```ts
export declare const unfold: <S, A>(s: S, f: (s: S) => Option.Option<readonly [A, S]>) => Stream<never, never, A>
```

Added in v2.0.0

## unfoldChunk

Creates a stream by peeling off the "layers" of a value of type `S`.

**Signature**

```ts
export declare const unfoldChunk: <S, A>(
  s: S,
  f: (s: S) => Option.Option<readonly [Chunk.Chunk<A>, S]>
) => Stream<never, never, A>
```

Added in v2.0.0

## unfoldChunkEffect

Creates a stream by effectfully peeling off the "layers" of a value of type
`S`.

**Signature**

```ts
export declare const unfoldChunkEffect: <R, E, A, S>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, Option.Option<readonly [Chunk.Chunk<A>, S]>>
) => Stream<R, E, A>
```

Added in v2.0.0

## unfoldEffect

Creates a stream by effectfully peeling off the "layers" of a value of type
`S`.

**Signature**

```ts
export declare const unfoldEffect: <S, R, E, A>(
  s: S,
  f: (s: S) => Effect.Effect<R, E, Option.Option<readonly [A, S]>>
) => Stream<R, E, A>
```

Added in v2.0.0

## unit

A stream that contains a single `Unit` value.

**Signature**

```ts
export declare const unit: Stream<never, never, void>
```

Added in v2.0.0

## unwrap

Creates a stream produced from an `Effect`.

**Signature**

```ts
export declare const unwrap: <R, E, R2, E2, A>(
  effect: Effect.Effect<R, E, Stream<R2, E2, A>>
) => Stream<R | R2, E | E2, A>
```

Added in v2.0.0

## unwrapScoped

Creates a stream produced from a scoped `Effect`.

**Signature**

```ts
export declare const unwrapScoped: <R, E, R2, E2, A>(
  effect: Effect.Effect<R, E, Stream<R2, E2, A>>
) => Stream<R2 | Exclude<R, Scope.Scope>, E | E2, A>
```

Added in v2.0.0

## whenCase

Returns the resulting stream when the given `PartialFunction` is defined
for the given value, otherwise returns an empty stream.

**Signature**

```ts
export declare const whenCase: <A, R, E, A2>(
  evaluate: LazyArg<A>,
  pf: (a: A) => Option.Option<Stream<R, E, A2>>
) => Stream<R, E, A2>
```

Added in v2.0.0

# context

## context

Accesses the whole context of the stream.

**Signature**

```ts
export declare const context: <R>() => Stream<R, never, Context.Context<R>>
```

Added in v2.0.0

## contextWith

Accesses the context of the stream.

**Signature**

```ts
export declare const contextWith: <R, A>(f: (env: Context.Context<R>) => A) => Stream<R, never, A>
```

Added in v2.0.0

## contextWithEffect

Accesses the context of the stream in the context of an effect.

**Signature**

```ts
export declare const contextWithEffect: <R0, R, E, A>(
  f: (env: Context.Context<R0>) => Effect.Effect<R, E, A>
) => Stream<R0 | R, E, A>
```

Added in v2.0.0

## contextWithStream

Accesses the context of the stream in the context of a stream.

**Signature**

```ts
export declare const contextWithStream: <R0, R, E, A>(
  f: (env: Context.Context<R0>) => Stream<R, E, A>
) => Stream<R0 | R, E, A>
```

Added in v2.0.0

## mapInputContext

Transforms the context being provided to the stream with the specified
function.

**Signature**

```ts
export declare const mapInputContext: {
  <R0, R>(f: (env: Context.Context<R0>) => Context.Context<R>): <E, A>(self: Stream<R, E, A>) => Stream<R0, E, A>
  <E, A, R0, R>(self: Stream<R, E, A>, f: (env: Context.Context<R0>) => Context.Context<R>): Stream<R0, E, A>
}
```

Added in v2.0.0

## provideContext

Provides the stream with its required context, which eliminates its
dependency on `R`.

**Signature**

```ts
export declare const provideContext: {
  <R>(context: Context.Context<R>): <E, A>(self: Stream<R, E, A>) => Stream<never, E, A>
  <E, A, R>(self: Stream<R, E, A>, context: Context.Context<R>): Stream<never, E, A>
}
```

Added in v2.0.0

## provideLayer

Provides a `Layer` to the stream, which translates it to another level.

**Signature**

```ts
export declare const provideLayer: {
  <RIn, E2, ROut>(layer: Layer.Layer<RIn, E2, ROut>): <E, A>(self: Stream<ROut, E, A>) => Stream<RIn, E2 | E, A>
  <E, A, RIn, E2, ROut>(self: Stream<ROut, E, A>, layer: Layer.Layer<RIn, E2, ROut>): Stream<RIn, E | E2, A>
}
```

Added in v2.0.0

## provideService

Provides the stream with the single service it requires. If the stream
requires more than one service use `Stream.provideContext` instead.

**Signature**

```ts
export declare const provideService: {
  <T extends Context.Tag<any, any>>(
    tag: T,
    resource: Context.Tag.Service<T>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<Exclude<R, Context.Tag.Identifier<T>>, E, A>
  <R, E, A, T extends Context.Tag<any, any>>(
    self: Stream<R, E, A>,
    tag: T,
    resource: Context.Tag.Service<T>
  ): Stream<Exclude<R, Context.Tag.Identifier<T>>, E, A>
}
```

Added in v2.0.0

## provideServiceEffect

Provides the stream with the single service it requires. If the stream
requires more than one service use `Stream.provideContext` instead.

**Signature**

```ts
export declare const provideServiceEffect: {
  <T extends Context.Tag<any, any>, R2, E2>(
    tag: T,
    effect: Effect.Effect<R2, E2, Context.Tag.Service<T>>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | Exclude<R, Context.Tag.Identifier<T>>, E2 | E, A>
  <R, E, A, T extends Context.Tag<any, any>, R2, E2>(
    self: Stream<R, E, A>,
    tag: T,
    effect: Effect.Effect<R2, E2, Context.Tag.Service<T>>
  ): Stream<R2 | Exclude<R, Context.Tag.Identifier<T>>, E | E2, A>
}
```

Added in v2.0.0

## provideServiceStream

Provides the stream with the single service it requires. If the stream
requires more than one service use `Stream.provideContext` instead.

**Signature**

```ts
export declare const provideServiceStream: {
  <T extends Context.Tag<any, any>, R2, E2>(
    tag: T,
    stream: Stream<R2, E2, Context.Tag.Service<T>>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | Exclude<R, Context.Tag.Identifier<T>>, E2 | E, A>
  <R, E, A, T extends Context.Tag<any, any>, R2, E2>(
    self: Stream<R, E, A>,
    tag: T,
    stream: Stream<R2, E2, Context.Tag.Service<T>>
  ): Stream<R2 | Exclude<R, Context.Tag.Identifier<T>>, E | E2, A>
}
```

Added in v2.0.0

## provideSomeLayer

Splits the context into two parts, providing one part using the
specified layer and leaving the remainder `R0`.

**Signature**

```ts
export declare const provideSomeLayer: {
  <RIn, E2, ROut>(
    layer: Layer.Layer<RIn, E2, ROut>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<RIn | Exclude<R, ROut>, E2 | E, A>
  <R, E, A, RIn, E2, ROut>(
    self: Stream<R, E, A>,
    layer: Layer.Layer<RIn, E2, ROut>
  ): Stream<RIn | Exclude<R, ROut>, E | E2, A>
}
```

Added in v2.0.0

## updateService

Updates the specified service within the context of the `Stream`.

**Signature**

```ts
export declare const updateService: (<T extends Context.Tag<any, any>>(
  tag: T,
  f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
) => <R, E, A>(self: Stream<R, E, A>) => Stream<T | R, E, A>) &
  (<R, E, A, T extends Context.Tag<any, any>>(
    self: Stream<R, E, A>,
    tag: T,
    f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ) => Stream<R | T, E, A>)
```

Added in v2.0.0

# destructors

## run

Runs the sink on the stream to produce either the sink's result or an error.

**Signature**

```ts
export declare const run: {
  <R2, E2, A, Z>(
    sink: Sink.Sink<R2, E2, A, unknown, Z>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, Z>
  <R, E, R2, E2, A, Z>(self: Stream<R, E, A>, sink: Sink.Sink<R2, E2, A, unknown, Z>): Effect.Effect<R | R2, E | E2, Z>
}
```

Added in v2.0.0

## runCollect

Runs the stream and collects all of its elements to a chunk.

**Signature**

```ts
export declare const runCollect: <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<R, E, Chunk.Chunk<A>>
```

Added in v2.0.0

## runCount

Runs the stream and emits the number of elements processed

**Signature**

```ts
export declare const runCount: <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<R, E, number>
```

Added in v2.0.0

## runDrain

Runs the stream only for its effects. The emitted elements are discarded.

**Signature**

```ts
export declare const runDrain: <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<R, E, void>
```

Added in v2.0.0

## runFold

Executes a pure fold over the stream of values - reduces all elements in
the stream to a value of type `S`.

**Signature**

```ts
export declare const runFold: {
  <S, A>(s: S, f: (s: S, a: A) => S): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R, E, S>
  <R, E, S, A>(self: Stream<R, E, A>, s: S, f: (s: S, a: A) => S): Effect.Effect<R, E, S>
}
```

Added in v2.0.0

## runFoldEffect

Executes an effectful fold over the stream of values.

**Signature**

```ts
export declare const runFoldEffect: {
  <S, A, R2, E2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, S>
  <R, E, S, A, R2, E2>(
    self: Stream<R, E, A>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): Effect.Effect<R | R2, E | E2, S>
}
```

Added in v2.0.0

## runFoldScoped

Executes a pure fold over the stream of values. Returns a scoped value that
represents the scope of the stream.

**Signature**

```ts
export declare const runFoldScoped: {
  <S, A>(s: S, f: (s: S, a: A) => S): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, E, S>
  <R, E, S, A>(self: Stream<R, E, A>, s: S, f: (s: S, a: A) => S): Effect.Effect<Scope.Scope | R, E, S>
}
```

Added in v2.0.0

## runFoldScopedEffect

Executes an effectful fold over the stream of values. Returns a scoped
value that represents the scope of the stream.

**Signature**

```ts
export declare const runFoldScopedEffect: {
  <S, A, R2, E2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, S>
  <R, E, S, A, R2, E2>(
    self: Stream<R, E, A>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, S>
}
```

Added in v2.0.0

## runFoldWhile

Reduces the elements in the stream to a value of type `S`. Stops the fold
early when the condition is not fulfilled. Example:

**Signature**

```ts
export declare const runFoldWhile: {
  <S, A>(s: S, cont: Predicate<S>, f: (s: S, a: A) => S): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R, E, S>
  <R, E, S, A>(self: Stream<R, E, A>, s: S, cont: Predicate<S>, f: (s: S, a: A) => S): Effect.Effect<R, E, S>
}
```

Added in v2.0.0

## runFoldWhileEffect

Executes an effectful fold over the stream of values. Stops the fold early
when the condition is not fulfilled.

**Signature**

```ts
export declare const runFoldWhileEffect: {
  <S, A, R2, E2>(
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, S>
  <R, E, S, A, R2, E2>(
    self: Stream<R, E, A>,
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): Effect.Effect<R | R2, E | E2, S>
}
```

Added in v2.0.0

## runFoldWhileScoped

Executes a pure fold over the stream of values. Returns a scoped value that
represents the scope of the stream. Stops the fold early when the condition
is not fulfilled.

**Signature**

```ts
export declare const runFoldWhileScoped: {
  <S, A>(
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => S
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, E, S>
  <R, E, S, A>(
    self: Stream<R, E, A>,
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => S
  ): Effect.Effect<Scope.Scope | R, E, S>
}
```

Added in v2.0.0

## runFoldWhileScopedEffect

Executes an effectful fold over the stream of values. Returns a scoped
value that represents the scope of the stream. Stops the fold early when
the condition is not fulfilled.

**Signature**

```ts
export declare const runFoldWhileScopedEffect: {
  <S, A, R2, E2>(
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, S>
  <R, E, S, A, R2, E2>(
    self: Stream<R, E, A>,
    s: S,
    cont: Predicate<S>,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, S>
}
```

Added in v2.0.0

## runForEach

Consumes all elements of the stream, passing them to the specified
callback.

**Signature**

```ts
export declare const runForEach: {
  <A, R2, E2, _>(
    f: (a: A) => Effect.Effect<R2, E2, _>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, void>
  <R, E, A, R2, E2, _>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, _>
  ): Effect.Effect<R | R2, E | E2, void>
}
```

Added in v2.0.0

## runForEachChunk

Consumes all elements of the stream, passing them to the specified
callback.

**Signature**

```ts
export declare const runForEachChunk: {
  <A, R2, E2, _>(
    f: (a: Chunk.Chunk<A>) => Effect.Effect<R2, E2, _>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, void>
  <R, E, A, R2, E2, _>(
    self: Stream<R, E, A>,
    f: (a: Chunk.Chunk<A>) => Effect.Effect<R2, E2, _>
  ): Effect.Effect<R | R2, E | E2, void>
}
```

Added in v2.0.0

## runForEachChunkScoped

Like `Stream.runForEachChunk`, but returns a scoped effect so the
finalization order can be controlled.

**Signature**

```ts
export declare const runForEachChunkScoped: {
  <A, R2, E2, _>(
    f: (a: Chunk.Chunk<A>) => Effect.Effect<R2, E2, _>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, void>
  <R, E, A, R2, E2, _>(
    self: Stream<R, E, A>,
    f: (a: Chunk.Chunk<A>) => Effect.Effect<R2, E2, _>
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, void>
}
```

Added in v2.0.0

## runForEachScoped

Like `Stream.forEach`, but returns a scoped effect so the finalization
order can be controlled.

**Signature**

```ts
export declare const runForEachScoped: {
  <A, R2, E2, _>(
    f: (a: A) => Effect.Effect<R2, E2, _>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, void>
  <R, E, A, R2, E2, _>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, _>
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, void>
}
```

Added in v2.0.0

## runForEachWhile

Consumes elements of the stream, passing them to the specified callback,
and terminating consumption when the callback returns `false`.

**Signature**

```ts
export declare const runForEachWhile: {
  <A, R2, E2>(
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<R2 | R, E2 | E, void>
  <R, E, A, R2, E2>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ): Effect.Effect<R | R2, E | E2, void>
}
```

Added in v2.0.0

## runForEachWhileScoped

Like `Stream.runForEachWhile`, but returns a scoped effect so the
finalization order can be controlled.

**Signature**

```ts
export declare const runForEachWhileScoped: {
  <A, R2, E2>(
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, void>
  <R, E, A, R2, E2>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, boolean>
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, void>
}
```

Added in v2.0.0

## runHead

Runs the stream to completion and yields the first value emitted by it,
discarding the rest of the elements.

**Signature**

```ts
export declare const runHead: <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<R, E, Option.Option<A>>
```

Added in v2.0.0

## runIntoPubSub

Publishes elements of this stream to a `PubSub`. Stream failure and ending will
also be signalled.

**Signature**

```ts
export declare const runIntoPubSub: {
  <E, A>(pubsub: PubSub.PubSub<Take.Take<E, A>>): <R>(self: Stream<R, E, A>) => Effect.Effect<R, never, void>
  <R, E, A>(self: Stream<R, E, A>, pubsub: PubSub.PubSub<Take.Take<E, A>>): Effect.Effect<R, never, void>
}
```

Added in v2.0.0

## runIntoPubSubScoped

Like `Stream.runIntoPubSub`, but provides the result as a scoped effect to
allow for scope composition.

**Signature**

```ts
export declare const runIntoPubSubScoped: {
  <E, A>(
    pubsub: PubSub.PubSub<Take.Take<E, A>>
  ): <R>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, void>
  <R, E, A>(self: Stream<R, E, A>, pubsub: PubSub.PubSub<Take.Take<E, A>>): Effect.Effect<Scope.Scope | R, never, void>
}
```

Added in v2.0.0

## runIntoQueue

Enqueues elements of this stream into a queue. Stream failure and ending
will also be signalled.

**Signature**

```ts
export declare const runIntoQueue: {
  <E, A>(queue: Queue.Enqueue<Take.Take<E, A>>): <R>(self: Stream<R, E, A>) => Effect.Effect<R, never, void>
  <R, E, A>(self: Stream<R, E, A>, queue: Queue.Enqueue<Take.Take<E, A>>): Effect.Effect<R, never, void>
}
```

Added in v2.0.0

## runIntoQueueElementsScoped

Like `Stream.runIntoQueue`, but provides the result as a scoped [[ZIO]]
to allow for scope composition.

**Signature**

```ts
export declare const runIntoQueueElementsScoped: {
  <E, A>(
    queue: Queue.Enqueue<Exit.Exit<Option.Option<E>, A>>
  ): <R>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, void>
  <R, E, A>(
    self: Stream<R, E, A>,
    queue: Queue.Enqueue<Exit.Exit<Option.Option<E>, A>>
  ): Effect.Effect<Scope.Scope | R, never, void>
}
```

Added in v2.0.0

## runIntoQueueScoped

Like `Stream.runIntoQueue`, but provides the result as a scoped effect
to allow for scope composition.

**Signature**

```ts
export declare const runIntoQueueScoped: {
  <E, A>(
    queue: Queue.Enqueue<Take.Take<E, A>>
  ): <R>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, void>
  <R, E, A>(self: Stream<R, E, A>, queue: Queue.Enqueue<Take.Take<E, A>>): Effect.Effect<Scope.Scope | R, never, void>
}
```

Added in v2.0.0

## runLast

Runs the stream to completion and yields the last value emitted by it,
discarding the rest of the elements.

**Signature**

```ts
export declare const runLast: <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<R, E, Option.Option<A>>
```

Added in v2.0.0

## runScoped

**Signature**

```ts
export declare const runScoped: {
  <R2, E2, A, A2>(
    sink: Sink.Sink<R2, E2, A, unknown, A2>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, A2>
  <R, E, R2, E2, A, A2>(
    self: Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A, unknown, A2>
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, A2>
}
```

Added in v2.0.0

## runSum

Runs the stream to a sink which sums elements, provided they are Numeric.

**Signature**

```ts
export declare const runSum: <R, E>(self: Stream<R, E, number>) => Effect.Effect<R, E, number>
```

Added in v2.0.0

## toPubSub

Converts the stream to a scoped `PubSub` of chunks. After the scope is closed,
the `PubSub` will never again produce values and should be discarded.

**Signature**

```ts
export declare const toPubSub: {
  (
    capacity: number
  ): <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, PubSub.PubSub<Take.Take<E, A>>>
  <R, E, A>(
    self: Stream<R, E, A>,
    capacity: number
  ): Effect.Effect<Scope.Scope | R, never, PubSub.PubSub<Take.Take<E, A>>>
}
```

Added in v2.0.0

## toPull

Returns in a scope a ZIO effect that can be used to repeatedly pull chunks
from the stream. The pull effect fails with None when the stream is
finished, or with Some error if it fails, otherwise it returns a chunk of
the stream's output.

**Signature**

```ts
export declare const toPull: <R, E, A>(
  self: Stream<R, E, A>
) => Effect.Effect<Scope.Scope | R, never, Effect.Effect<R, Option.Option<E>, Chunk.Chunk<A>>>
```

Added in v2.0.0

## toQueue

Converts the stream to a scoped queue of chunks. After the scope is closed,
the queue will never again produce values and should be discarded.

Defaults to the "suspend" back pressure strategy with a capacity of 2.

**Signature**

```ts
export declare const toQueue: {
  (
    options?:
      | { readonly strategy?: "dropping" | "sliding" | "suspend" | undefined; readonly capacity?: number | undefined }
      | { readonly strategy: "unbounded" }
  ): <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, Queue.Dequeue<Take.Take<E, A>>>
  <R, E, A>(
    self: Stream<R, E, A>,
    options?:
      | { readonly strategy?: "dropping" | "sliding" | "suspend" | undefined; readonly capacity?: number | undefined }
      | { readonly strategy: "unbounded" }
  ): Effect.Effect<Scope.Scope | R, never, Queue.Dequeue<Take.Take<E, A>>>
}
```

Added in v2.0.0

## toQueueOfElements

Converts the stream to a scoped queue of elements. After the scope is
closed, the queue will never again produce values and should be discarded.

Defaults to a capacity of 2.

**Signature**

```ts
export declare const toQueueOfElements: {
  (options?: {
    readonly capacity?: number | undefined
  }): <R, E, A>(
    self: Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R, never, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>>
  <R, E, A>(
    self: Stream<R, E, A>,
    options?: { readonly capacity?: number | undefined }
  ): Effect.Effect<Scope.Scope | R, never, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>>
}
```

Added in v2.0.0

## toReadableStream

Converts the stream to a `ReadableStream`.

See https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream.

**Signature**

```ts
export declare const toReadableStream: <E, A>(source: Stream<never, E, A>) => ReadableStream<A>
```

Added in v2.0.0

# do notation

## Do

**Signature**

```ts
export declare const Do: Stream<never, never, {}>
```

Added in v2.0.0

## bind

Binds a value from a stream in a `do` scope

**Signature**

```ts
export declare const bind: {
  <N extends string, K, R2, E2, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => Stream<R2, E2, A>,
    options?: { readonly concurrency?: number | "unbounded" | undefined; readonly bufferSize?: number | undefined }
  ): <R, E>(self: Stream<R, E, K>) => Stream<R2 | R, E2 | E, Effect.MergeRecord<K, { [k in N]: A }>>
  <R, E, N extends string, K, R2, E2, A>(
    self: Stream<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => Stream<R2, E2, A>,
    options?: { readonly concurrency?: number | "unbounded" | undefined; readonly bufferSize?: number | undefined }
  ): Stream<R | R2, E | E2, Effect.MergeRecord<K, { [k in N]: A }>>
}
```

Added in v2.0.0

## bindEffect

Binds an effectful value in a `do` scope

**Signature**

```ts
export declare const bindEffect: {
  <N extends string, K, R2, E2, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => Effect.Effect<R2, E2, A>,
    options?: { readonly concurrency?: number | "unbounded" | undefined; readonly bufferSize?: number | undefined }
  ): <R, E>(self: Stream<R, E, K>) => Stream<R2 | R, E2 | E, Effect.MergeRecord<K, { [k in N]: A }>>
  <R, E, N extends string, K, R2, E2, A>(
    self: Stream<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => Effect.Effect<R2, E2, A>,
    options?: { readonly concurrency?: number | "unbounded" | undefined; readonly bufferSize?: number | undefined }
  ): Stream<R | R2, E | E2, Effect.MergeRecord<K, { [k in N]: A }>>
}
```

Added in v2.0.0

## bindTo

**Signature**

```ts
export declare const bindTo: {
  <N extends string>(tag: N): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Record<N, A>>
  <R, E, A, N extends string>(self: Stream<R, E, A>, tag: N): Stream<R, E, Record<N, A>>
}
```

Added in v2.0.0

## let

Bind a value in a `do` scope

**Signature**

```ts
export declare const let: {
  <N extends string, K, A>(
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ): <R, E>(self: Stream<R, E, K>) => Stream<R, E, Effect.MergeRecord<K, { [k in N]: A }>>
  <R, E, K, N extends string, A>(
    self: Stream<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => A
  ): Stream<R, E, Effect.MergeRecord<K, { [k in N]: A }>>
}
```

Added in v2.0.0

# elements

## find

Finds the first element emitted by this stream that satisfies the provided
predicate.

**Signature**

```ts
export declare const find: {
  <A, B extends A>(refinement: Refinement<A, B>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>
  <A, X extends A>(predicate: Predicate<X>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A, B extends A>(self: Stream<R, E, A>, refinement: Refinement<A, B>): Stream<R, E, B>
  <R, E, A, X extends A>(self: Stream<R, E, A>, predicate: Predicate<X>): Stream<R, E, A>
}
```

Added in v2.0.0

## findEffect

Finds the first element emitted by this stream that satisfies the provided
effectful predicate.

**Signature**

```ts
export declare const findEffect: {
  <A, X extends A, R2, E2>(
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, X extends A, R2, E2>(
    self: Stream<R, E, A>,
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

# encoding

## decodeText

Decode Uint8Array chunks into a stream of strings using the specified encoding.

**Signature**

```ts
export declare const decodeText: {
  (encoding?: string): <R, E>(self: Stream<R, E, Uint8Array>) => Stream<R, E, string>
  <R, E>(self: Stream<R, E, Uint8Array>, encoding?: string): Stream<R, E, string>
}
```

Added in v2.0.0

## encodeText

Encode a stream of strings into a stream of Uint8Array chunks using the specified encoding.

**Signature**

```ts
export declare const encodeText: <R, E>(self: Stream<R, E, string>) => Stream<R, E, Uint8Array>
```

Added in v2.0.0

# error handling

## catchAll

Switches over to the stream produced by the provided function in case this
one fails with a typed error.

**Signature**

```ts
export declare const catchAll: {
  <E, R2, E2, A2>(f: (error: E) => Stream<R2, E2, A2>): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2, A2 | A>
  <R, A, E, R2, E2, A2>(self: Stream<R, E, A>, f: (error: E) => Stream<R2, E2, A2>): Stream<R | R2, E2, A | A2>
}
```

Added in v2.0.0

## catchAllCause

Switches over to the stream produced by the provided function in case this
one fails. Allows recovery from all causes of failure, including
interruption if the stream is uninterruptible.

**Signature**

```ts
export declare const catchAllCause: {
  <E, R2, E2, A2>(
    f: (cause: Cause.Cause<E>) => Stream<R2, E2, A2>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2, A2 | A>
  <R, A, E, R2, E2, A2>(
    self: Stream<R, E, A>,
    f: (cause: Cause.Cause<E>) => Stream<R2, E2, A2>
  ): Stream<R | R2, E2, A | A2>
}
```

Added in v2.0.0

## catchSome

Switches over to the stream produced by the provided function in case this
one fails with some typed error.

**Signature**

```ts
export declare const catchSome: {
  <E, R2, E2, A2>(
    pf: (error: E) => Option.Option<Stream<R2, E2, A2>>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A2 | A>
  <R, A, E, R2, E2, A2>(
    self: Stream<R, E, A>,
    pf: (error: E) => Option.Option<Stream<R2, E2, A2>>
  ): Stream<R | R2, E | E2, A | A2>
}
```

Added in v2.0.0

## catchSomeCause

Switches over to the stream produced by the provided function in case this
one fails with some errors. Allows recovery from all causes of failure,
including interruption if the stream is uninterruptible.

**Signature**

```ts
export declare const catchSomeCause: {
  <E, R2, E2, A2>(
    pf: (cause: Cause.Cause<E>) => Option.Option<Stream<R2, E2, A2>>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A2 | A>
  <R, A, E, R2, E2, A2>(
    self: Stream<R, E, A>,
    pf: (cause: Cause.Cause<E>) => Option.Option<Stream<R2, E2, A2>>
  ): Stream<R | R2, E | E2, A | A2>
}
```

Added in v2.0.0

## catchTag

Switches over to the stream produced by the provided function in case this
one fails with an error matching the given `_tag`.

**Signature**

```ts
export declare const catchTag: {
  <K extends E["_tag"] & string, E extends { _tag: string }, R1, E1, A1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Stream<R1, E1, A1>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R1 | R, E1 | Exclude<E, { _tag: K }>, A1 | A>
  <R, E extends { _tag: string }, A, K extends E["_tag"] & string, R1, E1, A1>(
    self: Stream<R, E, A>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Stream<R1, E1, A1>
  ): Stream<R | R1, E1 | Exclude<E, { _tag: K }>, A | A1>
}
```

Added in v2.0.0

## catchTags

Switches over to the stream produced by one of the provided functions, in
case this one fails with an error matching one of the given `_tag`'s.

**Signature**

```ts
export declare const catchTags: {
  <
    E extends { _tag: string },
    Cases extends { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => Stream<any, any, any>) | undefined }
  >(
    cases: Cases
  ): <R, A>(
    self: Stream<R, E, A>
  ) => Stream<
    | R
    | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer R, infer _E, infer _A>
          ? R
          : never
      }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer _R, infer E, infer _A>
          ? E
          : never
      }[keyof Cases],
    | A
    | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer _R, infer _E, infer A>
          ? A
          : never
      }[keyof Cases]
  >
  <
    R,
    E extends { _tag: string },
    A,
    Cases extends { [K in E["_tag"]]+?: ((error: Extract<E, { _tag: K }>) => Stream<any, any, any>) | undefined }
  >(
    self: Stream<R, E, A>,
    cases: Cases
  ): Stream<
    | R
    | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer R, infer _E, infer _A>
          ? R
          : never
      }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer _R, infer E, infer _A>
          ? E
          : never
      }[keyof Cases],
    | A
    | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Stream.Variance<infer _R, infer _E, infer A>
          ? A
          : never
      }[keyof Cases]
  >
}
```

Added in v2.0.0

## orDie

Translates any failure into a stream termination, making the stream
infallible and all failures unchecked.

**Signature**

```ts
export declare const orDie: <R, E, A>(self: Stream<R, E, A>) => Stream<R, never, A>
```

Added in v2.0.0

## orDieWith

Keeps none of the errors, and terminates the stream with them, using the
specified function to convert the `E` into a defect.

**Signature**

```ts
export declare const orDieWith: {
  <E>(f: (e: E) => unknown): <R, A>(self: Stream<R, E, A>) => Stream<R, never, A>
  <R, A, E>(self: Stream<R, E, A>, f: (e: E) => unknown): Stream<R, never, A>
}
```

Added in v2.0.0

## orElse

Switches to the provided stream in case this one fails with a typed error.

See also `Stream.catchAll`.

**Signature**

```ts
export declare const orElse: {
  <R2, E2, A2>(that: LazyArg<Stream<R2, E2, A2>>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2, A2 | A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: LazyArg<Stream<R2, E2, A2>>): Stream<R | R2, E2, A | A2>
}
```

Added in v2.0.0

## orElseEither

Switches to the provided stream in case this one fails with a typed error.

See also `Stream.catchAll`.

**Signature**

```ts
export declare const orElseEither: {
  <R2, E2, A2>(
    that: LazyArg<Stream<R2, E2, A2>>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2, Either.Either<A, A2>>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    that: LazyArg<Stream<R2, E2, A2>>
  ): Stream<R | R2, E2, Either.Either<A, A2>>
}
```

Added in v2.0.0

## orElseFail

Fails with given error in case this one fails with a typed error.

See also `Stream.catchAll`.

**Signature**

```ts
export declare const orElseFail: {
  <E2>(error: LazyArg<E2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2, A>
  <R, E, A, E2>(self: Stream<R, E, A>, error: LazyArg<E2>): Stream<R, E2, A>
}
```

Added in v2.0.0

## orElseIfEmpty

Produces the specified element if this stream is empty.

**Signature**

```ts
export declare const orElseIfEmpty: {
  <A2>(element: LazyArg<A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A2 | A>
  <R, E, A, A2>(self: Stream<R, E, A>, element: LazyArg<A2>): Stream<R, E, A | A2>
}
```

Added in v2.0.0

## orElseIfEmptyChunk

Produces the specified chunk if this stream is empty.

**Signature**

```ts
export declare const orElseIfEmptyChunk: {
  <A2>(chunk: LazyArg<Chunk.Chunk<A2>>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A2 | A>
  <R, E, A, A2>(self: Stream<R, E, A>, chunk: LazyArg<Chunk.Chunk<A2>>): Stream<R, E, A | A2>
}
```

Added in v2.0.0

## orElseIfEmptyStream

Switches to the provided stream in case this one is empty.

**Signature**

```ts
export declare const orElseIfEmptyStream: {
  <R2, E2, A2>(stream: LazyArg<Stream<R2, E2, A2>>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, stream: LazyArg<Stream<R2, E2, A2>>): Stream<R | R2, E | E2, A | A2>
}
```

Added in v2.0.0

## orElseSucceed

Succeeds with the specified value if this one fails with a typed error.

**Signature**

```ts
export declare const orElseSucceed: {
  <A2>(value: LazyArg<A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, never, A2 | A>
  <R, E, A, A2>(self: Stream<R, E, A>, value: LazyArg<A2>): Stream<R, never, A | A2>
}
```

Added in v2.0.0

## refineOrDie

Keeps some of the errors, and terminates the fiber with the rest

**Signature**

```ts
export declare const refineOrDie: {
  <E, E2>(pf: (error: E) => Option.Option<E2>): <R, A>(self: Stream<R, E, A>) => Stream<R, E2, A>
  <R, A, E, E2>(self: Stream<R, E, A>, pf: (error: E) => Option.Option<E2>): Stream<R, E2, A>
}
```

Added in v2.0.0

## refineOrDieWith

Keeps some of the errors, and terminates the fiber with the rest, using the
specified function to convert the `E` into a defect.

**Signature**

```ts
export declare const refineOrDieWith: {
  <E, E2>(
    pf: (error: E) => Option.Option<E2>,
    f: (error: E) => unknown
  ): <R, A>(self: Stream<R, E, A>) => Stream<R, E2, A>
  <R, A, E, E2>(self: Stream<R, E, A>, pf: (error: E) => Option.Option<E2>, f: (error: E) => unknown): Stream<R, E2, A>
}
```

Added in v2.0.0

# filtering

## filter

Filters the elements emitted by this stream using the provided function.

**Signature**

```ts
export declare const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>
  <A, B extends A>(predicate: Predicate<B>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A, B extends A>(self: Stream<R, E, A>, refinement: Refinement<A, B>): Stream<R, E, B>
  <R, E, A>(self: Stream<R, E, A>, predicate: Predicate<A>): Stream<R, E, A>
}
```

Added in v2.0.0

## filterEffect

Effectfully filters the elements emitted by this stream.

**Signature**

```ts
export declare const filterEffect: {
  <A, X extends A, R2, E2>(
    f: (a: X) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, X extends A, R2, E2>(
    self: Stream<R, E, A>,
    f: (a: X) => Effect.Effect<R2, E2, boolean>
  ): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

# grouping

## groupAdjacentBy

Creates a pipeline that groups on adjacent keys, calculated by the
specified function.

**Signature**

```ts
export declare const groupAdjacentBy: {
  <A, K>(f: (a: A) => K): <R, E>(self: Stream<R, E, A>) => Stream<R, E, [K, Chunk.NonEmptyChunk<A>]>
  <R, E, A, K>(self: Stream<R, E, A>, f: (a: A) => K): Stream<R, E, [K, Chunk.NonEmptyChunk<A>]>
}
```

Added in v2.0.0

## groupBy

More powerful version of `Stream.groupByKey`.

**Signature**

```ts
export declare const groupBy: {
  <A, R2, E2, K, V>(
    f: (a: A) => Effect.Effect<R2, E2, readonly [K, V]>,
    options?: { readonly bufferSize?: number | undefined }
  ): <R, E>(self: Stream<R, E, A>) => GroupBy.GroupBy<R2 | R, E2 | E, K, V>
  <R, E, A, R2, E2, K, V>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, readonly [K, V]>,
    options?: { readonly bufferSize?: number | undefined }
  ): GroupBy.GroupBy<R | R2, E | E2, K, V>
}
```

Added in v2.0.0

# mapping

## as

Maps the success values of this stream to the specified constant value.

**Signature**

```ts
export declare const as: {
  <B>(value: B): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, B>
  <R, E, A, B>(self: Stream<R, E, A>, value: B): Stream<R, E, B>
}
```

Added in v2.0.0

## map

Transforms the elements of this stream using the supplied function.

**Signature**

```ts
export declare const map: {
  <A, B>(f: (a: A) => B): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>
  <R, E, A, B>(self: Stream<R, E, A>, f: (a: A) => B): Stream<R, E, B>
}
```

Added in v2.0.0

## mapAccum

Statefully maps over the elements of this stream to produce new elements.

**Signature**

```ts
export declare const mapAccum: {
  <S, A, A2>(s: S, f: (s: S, a: A) => readonly [S, A2]): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A2>
  <R, E, S, A, A2>(self: Stream<R, E, A>, s: S, f: (s: S, a: A) => readonly [S, A2]): Stream<R, E, A2>
}
```

Added in v2.0.0

## mapAccumEffect

Statefully and effectfully maps over the elements of this stream to produce
new elements.

**Signature**

```ts
export declare const mapAccumEffect: {
  <S, A, R2, E2, A2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, readonly [S, A2]>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, S, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, readonly [S, A2]>
  ): Stream<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## mapChunks

Transforms the chunks emitted by this stream.

**Signature**

```ts
export declare const mapChunks: {
  <A, B>(f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<B>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>
  <R, E, A, B>(self: Stream<R, E, A>, f: (chunk: Chunk.Chunk<A>) => Chunk.Chunk<B>): Stream<R, E, B>
}
```

Added in v2.0.0

## mapChunksEffect

Effectfully transforms the chunks emitted by this stream.

**Signature**

```ts
export declare const mapChunksEffect: {
  <A, R2, E2, B>(
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, Chunk.Chunk<B>>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, B>
  <R, E, A, R2, E2, B>(
    self: Stream<R, E, A>,
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, Chunk.Chunk<B>>
  ): Stream<R | R2, E | E2, B>
}
```

Added in v2.0.0

## mapConcat

Maps each element to an iterable, and flattens the iterables into the
output of this stream.

**Signature**

```ts
export declare const mapConcat: {
  <A, A2>(f: (a: A) => Iterable<A2>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A2>
  <R, E, A, A2>(self: Stream<R, E, A>, f: (a: A) => Iterable<A2>): Stream<R, E, A2>
}
```

Added in v2.0.0

## mapConcatChunk

Maps each element to a chunk, and flattens the chunks into the output of
this stream.

**Signature**

```ts
export declare const mapConcatChunk: {
  <A, A2>(f: (a: A) => Chunk.Chunk<A2>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A2>
  <R, E, A, A2>(self: Stream<R, E, A>, f: (a: A) => Chunk.Chunk<A2>): Stream<R, E, A2>
}
```

Added in v2.0.0

## mapConcatChunkEffect

Effectfully maps each element to a chunk, and flattens the chunks into the
output of this stream.

**Signature**

```ts
export declare const mapConcatChunkEffect: {
  <A, R2, E2, A2>(
    f: (a: A) => Effect.Effect<R2, E2, Chunk.Chunk<A2>>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, Chunk.Chunk<A2>>
  ): Stream<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## mapConcatEffect

Effectfully maps each element to an iterable, and flattens the iterables
into the output of this stream.

**Signature**

```ts
export declare const mapConcatEffect: {
  <A, R2, E2, A2>(
    f: (a: A) => Effect.Effect<R2, E2, Iterable<A2>>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, Iterable<A2>>
  ): Stream<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## mapEffect

Maps over elements of the stream with the specified effectful function.

**Signature**

```ts
export declare const mapEffect: {
  <A, R2, E2, A2>(
    f: (a: A) => Effect.Effect<R2, E2, A2>,
    options?: { readonly concurrency?: number | "unbounded" | undefined; readonly unordered?: boolean | undefined }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <A, R2, E2, A2, K>(
    f: (a: A) => Effect.Effect<R2, E2, A2>,
    options: { readonly key: (a: A) => K; readonly bufferSize?: number | undefined }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, A2>,
    options?: { readonly concurrency?: number | "unbounded" | undefined; readonly unordered?: boolean | undefined }
  ): Stream<R | R2, E | E2, A2>
  <R, E, A, R2, E2, A2, K>(
    self: Stream<R, E, A>,
    f: (a: A) => Effect.Effect<R2, E2, A2>,
    options: { readonly key: (a: A) => K; readonly bufferSize?: number | undefined }
  ): Stream<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## mapError

Transforms the errors emitted by this stream using `f`.

**Signature**

```ts
export declare const mapError: {
  <E, E2>(f: (error: E) => E2): <R, A>(self: Stream<R, E, A>) => Stream<R, E2, A>
  <R, A, E, E2>(self: Stream<R, E, A>, f: (error: E) => E2): Stream<R, E2, A>
}
```

Added in v2.0.0

## mapErrorCause

Transforms the full causes of failures emitted by this stream.

**Signature**

```ts
export declare const mapErrorCause: {
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): <R, A>(self: Stream<R, E, A>) => Stream<R, E2, A>
  <R, A, E, E2>(self: Stream<R, E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): Stream<R, E2, A>
}
```

Added in v2.0.0

# models

## Stream (interface)

A `Stream<R, E, A>` is a description of a program that, when evaluated, may
emit zero or more values of type `A`, may fail with errors of type `E`, and
uses an context of type `R`. One way to think of `Stream` is as a
`Effect` program that could emit multiple values.

`Stream` is a purely functional _pull_ based stream. Pull based streams offer
inherent laziness and backpressure, relieving users of the need to manage
buffers between operators. As an optimization, `Stream` does not emit
single values, but rather an array of values. This allows the cost of effect
evaluation to be amortized.

`Stream` forms a monad on its `A` type parameter, and has error management
facilities for its `E` type parameter, modeled similarly to `Effect` (with
some adjustments for the multiple-valued nature of `Stream`). These aspects
allow for rich and expressive composition of streams.

**Signature**

```ts
export interface Stream<R, E, A> extends Stream.Variance<R, E, A>, Pipeable {
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: StreamUnify<this>
  [Unify.ignoreSymbol]?: StreamUnifyIgnore
}
```

Added in v2.0.0

## StreamUnify (interface)

**Signature**

```ts
export interface StreamUnify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
  Stream?: () => A[Unify.typeSymbol] extends Stream<infer R0, infer E0, infer A0> | infer _ ? Stream<R0, E0, A0> : never
}
```

Added in v2.0.0

## StreamUnifyIgnore (interface)

**Signature**

```ts
export interface StreamUnifyIgnore extends Effect.EffectUnifyIgnore {
  Effect?: true
}
```

Added in v2.0.0

# sequencing

## branchAfter

Returns a `Stream` that first collects `n` elements from the input `Stream`,
and then creates a new `Stream` using the specified function, and sends all
the following elements through that.

**Signature**

```ts
export declare const branchAfter: {
  <A, R2, E2, A2>(
    n: number,
    f: (input: Chunk.Chunk<A>) => Stream<R2, E2, A2>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    n: number,
    f: (input: Chunk.Chunk<A>) => Stream<R2, E2, A2>
  ): Stream<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## flatMap

Returns a stream made of the concatenation in strict order of all the
streams produced by passing each element of this stream to `f0`

**Signature**

```ts
export declare const flatMap: {
  <A, R2, E2, A2>(
    f: (a: A) => Stream<R2, E2, A2>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
      readonly switch?: boolean | undefined
    }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    f: (a: A) => Stream<R2, E2, A2>,
    options?: {
      readonly concurrency?: number | "unbounded" | undefined
      readonly bufferSize?: number | undefined
      readonly switch?: boolean | undefined
    }
  ): Stream<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## flatten

Flattens this stream-of-streams into a stream made of the concatenation in
strict order of all the streams.

**Signature**

```ts
export declare const flatten: {
  (options?: {
    readonly concurrency?: number | "unbounded" | undefined
    readonly bufferSize?: number | undefined
  }): <R, E, R2, E2, A>(self: Stream<R, E, Stream<R2, E2, A>>) => Stream<R | R2, E | E2, A>
  <R, E, R2, E2, A>(
    self: Stream<R, E, Stream<R2, E2, A>>,
    options?: { readonly concurrency?: number | "unbounded" | undefined; readonly bufferSize?: number | undefined }
  ): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## flattenChunks

Submerges the chunks carried by this stream into the stream's structure,
while still preserving them.

**Signature**

```ts
export declare const flattenChunks: <R, E, A>(self: Stream<R, E, Chunk.Chunk<A>>) => Stream<R, E, A>
```

Added in v2.0.0

## flattenEffect

Flattens `Effect` values into the stream's structure, preserving all
information about the effect.

**Signature**

```ts
export declare const flattenEffect: {
  (options?: {
    readonly concurrency?: number | "unbounded" | undefined
    readonly unordered?: boolean | undefined
  }): <R, E, R2, E2, A>(self: Stream<R, E, Effect.Effect<R2, E2, A>>) => Stream<R | R2, E | E2, A>
  <R, E, R2, E2, A>(
    self: Stream<R, E, Effect.Effect<R2, E2, A>>,
    options?: { readonly concurrency?: number | "unbounded" | undefined; readonly unordered?: boolean | undefined }
  ): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## flattenExitOption

Unwraps `Exit` values that also signify end-of-stream by failing with `None`.

For `Exit` values that do not signal end-of-stream, prefer:

```ts
stream.mapZIO(ZIO.done(_))
```

**Signature**

```ts
export declare const flattenExitOption: <R, E, E2, A>(
  self: Stream<R, E, Exit.Exit<Option.Option<E2>, A>>
) => Stream<R, E | E2, A>
```

Added in v2.0.0

## flattenIterables

Submerges the iterables carried by this stream into the stream's structure,
while still preserving them.

**Signature**

```ts
export declare const flattenIterables: <R, E, A>(self: Stream<R, E, Iterable<A>>) => Stream<R, E, A>
```

Added in v2.0.0

## flattenTake

Unwraps `Exit` values and flatten chunks that also signify end-of-stream
by failing with `None`.

**Signature**

```ts
export declare const flattenTake: <R, E, E2, A>(self: Stream<R, E, Take.Take<E2, A>>) => Stream<R, E | E2, A>
```

Added in v2.0.0

## tap

Adds an effect to consumption of every element of the stream.

**Signature**

```ts
export declare const tap: {
  <A, X extends A, R2, E2, _>(
    f: (a: X) => Effect.Effect<R2, E2, _>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, X extends A, R2, E2, _>(
    self: Stream<R, E, A>,
    f: (a: X) => Effect.Effect<R2, E2, _>
  ): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## tapBoth

Returns a stream that effectfully "peeks" at the failure or success of
the stream.

**Signature**

```ts
export declare const tapBoth: {
  <E, XE extends E, A, XA extends A, R2, E2, X, R3, E3, X1>(options: {
    readonly onFailure: (e: XE) => Effect.Effect<R2, E2, X>
    readonly onSuccess: (a: XA) => Effect.Effect<R3, E3, X1>
  }): <R>(self: Stream<R, E, A>) => Stream<R2 | R3 | R, E | E2 | E3, A>
  <R, E, A, XE extends E, XA extends A, R2, E2, X, R3, E3, X1>(
    self: Stream<R, E, A>,
    options: {
      readonly onFailure: (e: XE) => Effect.Effect<R2, E2, X>
      readonly onSuccess: (a: XA) => Effect.Effect<R3, E3, X1>
    }
  ): Stream<R | R2 | R3, E | E2 | E3, A>
}
```

Added in v2.0.0

## tapError

Returns a stream that effectfully "peeks" at the failure of the stream.

**Signature**

```ts
export declare const tapError: {
  <E, X extends E, R2, E2, _>(
    f: (error: X) => Effect.Effect<R2, E2, _>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A>
  <R, A, E, X extends E, R2, E2, _>(
    self: Stream<R, E, A>,
    f: (error: X) => Effect.Effect<R2, E2, _>
  ): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## tapSink

Sends all elements emitted by this stream to the specified sink in addition
to emitting them.

**Signature**

```ts
export declare const tapSink: {
  <R2, E2, A>(sink: Sink.Sink<R2, E2, A, unknown, unknown>): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, R2, E2, A>(self: Stream<R, E, A>, sink: Sink.Sink<R2, E2, A, unknown, unknown>): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

# symbols

## StreamTypeId

**Signature**

```ts
export declare const StreamTypeId: typeof StreamTypeId
```

Added in v2.0.0

## StreamTypeId (type alias)

**Signature**

```ts
export type StreamTypeId = typeof StreamTypeId
```

Added in v2.0.0

# tracing

## withSpan

Wraps the stream with a new span for tracing.

**Signature**

```ts
export declare const withSpan: {
  (
    name: string,
    options?: {
      readonly attributes?: Record<string, unknown> | undefined
      readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
      readonly parent?: Tracer.ParentSpan | undefined
      readonly root?: boolean | undefined
      readonly context?: Context.Context<never> | undefined
    }
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(
    self: Stream<R, E, A>,
    name: string,
    options?: {
      readonly attributes?: Record<string, unknown> | undefined
      readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
      readonly parent?: Tracer.ParentSpan | undefined
      readonly root?: boolean | undefined
      readonly context?: Context.Context<never> | undefined
    }
  ): Stream<R, E, A>
}
```

Added in v2.0.0

# type lambdas

## StreamTypeLambda (interface)

**Signature**

```ts
export interface StreamTypeLambda extends TypeLambda {
  readonly type: Stream<this["Out2"], this["Out1"], this["Target"]>
}
```

Added in v2.0.0

# utils

## Stream (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<R, E, A> {
  readonly [StreamTypeId]: {
    _R: (_: never) => R
    _E: (_: never) => E
    _A: (_: never) => A
  }
}
```

Added in v2.0.0

### DynamicTuple (type alias)

**Signature**

```ts
export type DynamicTuple<T, N extends number> = N extends N
  ? number extends N
    ? Array<T>
    : DynamicTupleOf<T, N, []>
  : never
```

Added in v2.0.0

### DynamicTupleOf (type alias)

**Signature**

```ts
export type DynamicTupleOf<T, N extends number, R extends Array<unknown>> = R["length"] extends N
  ? R
  : DynamicTupleOf<T, N, [T, ...R]>
```

Added in v2.0.0

## accumulate

Collects each underlying Chunk of the stream into a new chunk, and emits it
on each pull.

**Signature**

```ts
export declare const accumulate: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk.Chunk<A>>
```

Added in v2.0.0

## accumulateChunks

Re-chunks the elements of the stream by accumulating each underlying chunk.

**Signature**

```ts
export declare const accumulateChunks: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
```

Added in v2.0.0

## aggregate

Aggregates elements of this stream using the provided sink for as long as
the downstream operators on the stream are busy.

This operator divides the stream into two asynchronous "islands". Operators
upstream of this operator run on one fiber, while downstream operators run
on another. Whenever the downstream fiber is busy processing elements, the
upstream fiber will feed elements into the sink until it signals
completion.

Any sink can be used here, but see `Sink.foldWeightedEffect` and
`Sink.foldUntilEffect` for sinks that cover the common usecases.

**Signature**

```ts
export declare const aggregate: {
  <R2, E2, A, A2, B>(sink: Sink.Sink<R2, E2, A | A2, A2, B>): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, B>
  <R, E, R2, E2, A, A2, B>(self: Stream<R, E, A>, sink: Sink.Sink<R2, E2, A | A2, A2, B>): Stream<R | R2, E | E2, B>
}
```

Added in v2.0.0

## aggregateWithin

Like `aggregateWithinEither`, but only returns the `Right` results.

**Signature**

```ts
export declare const aggregateWithin: {
  <R2, E2, A, A2, B, R3, C>(
    sink: Sink.Sink<R2, E2, A | A2, A2, B>,
    schedule: Schedule.Schedule<R3, Option.Option<B>, C>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R3 | R, E2 | E, B>
  <R, E, R2, E2, A, A2, B, R3, C>(
    self: Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A | A2, A2, B>,
    schedule: Schedule.Schedule<R3, Option.Option<B>, C>
  ): Stream<R | R2 | R3, E | E2, B>
}
```

Added in v2.0.0

## aggregateWithinEither

Aggregates elements using the provided sink until it completes, or until
the delay signalled by the schedule has passed.

This operator divides the stream into two asynchronous islands. Operators
upstream of this operator run on one fiber, while downstream operators run
on another. Elements will be aggregated by the sink until the downstream
fiber pulls the aggregated value, or until the schedule's delay has passed.

Aggregated elements will be fed into the schedule to determine the delays
between pulls.

**Signature**

```ts
export declare const aggregateWithinEither: {
  <R2, E2, A, A2, B, R3, C>(
    sink: Sink.Sink<R2, E2, A | A2, A2, B>,
    schedule: Schedule.Schedule<R3, Option.Option<B>, C>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R3 | R, E2 | E, Either.Either<C, B>>
  <R, E, R2, E2, A, A2, B, R3, C>(
    self: Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A | A2, A2, B>,
    schedule: Schedule.Schedule<R3, Option.Option<B>, C>
  ): Stream<R | R2 | R3, E | E2, Either.Either<C, B>>
}
```

Added in v2.0.0

## broadcast

Fan out the stream, producing a list of streams that have the same elements
as this stream. The driver stream will only ever advance the `maximumLag`
chunks before the slowest downstream stream.

**Signature**

```ts
export declare const broadcast: {
  <N extends number>(
    n: N,
    maximumLag: number
  ): <R, E, A>(
    self: Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R, never, Stream.DynamicTuple<Stream<never, E, A>, N>>
  <R, E, A, N extends number>(
    self: Stream<R, E, A>,
    n: N,
    maximumLag: number
  ): Effect.Effect<Scope.Scope | R, never, Stream.DynamicTuple<Stream<never, E, A>, N>>
}
```

Added in v2.0.0

## broadcastDynamic

Fan out the stream, producing a dynamic number of streams that have the
same elements as this stream. The driver stream will only ever advance the
`maximumLag` chunks before the slowest downstream stream.

**Signature**

```ts
export declare const broadcastDynamic: {
  (maximumLag: number): <R, E, A>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, never, Stream<never, E, A>>
  <R, E, A>(self: Stream<R, E, A>, maximumLag: number): Effect.Effect<Scope.Scope | R, never, Stream<never, E, A>>
}
```

Added in v2.0.0

## broadcastedQueues

Converts the stream to a scoped list of queues. Every value will be
replicated to every queue with the slowest queue being allowed to buffer
`maximumLag` chunks before the driver is back pressured.

Queues can unsubscribe from upstream by shutting down.

**Signature**

```ts
export declare const broadcastedQueues: {
  <N extends number>(
    n: N,
    maximumLag: number
  ): <R, E, A>(
    self: Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R, never, Stream.DynamicTuple<Queue.Dequeue<Take.Take<E, A>>, N>>
  <R, E, A, N extends number>(
    self: Stream<R, E, A>,
    n: N,
    maximumLag: number
  ): Effect.Effect<Scope.Scope | R, never, Stream.DynamicTuple<Queue.Dequeue<Take.Take<E, A>>, N>>
}
```

Added in v2.0.0

## broadcastedQueuesDynamic

Converts the stream to a scoped dynamic amount of queues. Every chunk will
be replicated to every queue with the slowest queue being allowed to buffer
`maximumLag` chunks before the driver is back pressured.

Queues can unsubscribe from upstream by shutting down.

**Signature**

```ts
export declare const broadcastedQueuesDynamic: {
  (
    maximumLag: number
  ): <R, E, A>(
    self: Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R, never, Effect.Effect<Scope.Scope, never, Queue.Dequeue<Take.Take<E, A>>>>
  <R, E, A>(
    self: Stream<R, E, A>,
    maximumLag: number
  ): Effect.Effect<Scope.Scope | R, never, Effect.Effect<Scope.Scope, never, Queue.Dequeue<Take.Take<E, A>>>>
}
```

Added in v2.0.0

## buffer

Allows a faster producer to progress independently of a slower consumer by
buffering up to `capacity` elements in a queue.

**Signature**

```ts
export declare const buffer: {
  (
    options:
      | { readonly capacity: "unbounded" }
      | { readonly capacity: number; readonly strategy?: "dropping" | "sliding" | "suspend" | undefined }
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(
    self: Stream<R, E, A>,
    options:
      | { readonly capacity: "unbounded" }
      | { readonly capacity: number; readonly strategy?: "dropping" | "sliding" | "suspend" | undefined }
  ): Stream<R, E, A>
}
```

Added in v2.0.0

## bufferChunks

Allows a faster producer to progress independently of a slower consumer by
buffering up to `capacity` chunks in a queue.

**Signature**

```ts
export declare const bufferChunks: {
  (options: {
    readonly capacity: number
    readonly strategy?: "dropping" | "sliding" | "suspend" | undefined
  }): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(
    self: Stream<R, E, A>,
    options: { readonly capacity: number; readonly strategy?: "dropping" | "sliding" | "suspend" | undefined }
  ): Stream<R, E, A>
}
```

Added in v2.0.0

## changes

Returns a new stream that only emits elements that are not equal to the
previous element emitted, using natural equality to determine whether two
elements are equal.

**Signature**

```ts
export declare const changes: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
```

Added in v2.0.0

## changesWith

Returns a new stream that only emits elements that are not equal to the
previous element emitted, using the specified function to determine whether
two elements are equal.

**Signature**

```ts
export declare const changesWith: {
  <A>(f: (x: A, y: A) => boolean): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, f: (x: A, y: A) => boolean): Stream<R, E, A>
}
```

Added in v2.0.0

## changesWithEffect

Returns a new stream that only emits elements that are not equal to the
previous element emitted, using the specified effectual function to
determine whether two elements are equal.

**Signature**

```ts
export declare const changesWithEffect: {
  <A, R2, E2>(
    f: (x: A, y: A) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2>(self: Stream<R, E, A>, f: (x: A, y: A) => Effect.Effect<R2, E2, boolean>): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## chunks

Exposes the underlying chunks of the stream as a stream of chunks of
elements.

**Signature**

```ts
export declare const chunks: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk.Chunk<A>>
```

Added in v2.0.0

## chunksWith

Performs the specified stream transformation with the chunk structure of
the stream exposed.

**Signature**

```ts
export declare const chunksWith: <R, E, A, R2, E2, A2>(
  f: (stream: Stream<R, E, Chunk.Chunk<A>>) => Stream<R2, E2, Chunk.Chunk<A2>>
) => (self: Stream<R, E, A>) => Stream<R | R2, E | E2, A2>
```

Added in v2.0.0

## combine

Combines the elements from this stream and the specified stream by
repeatedly applying the function `f` to extract an element using both sides
and conceptually "offer" it to the destination stream. `f` can maintain
some internal state to control the combining process, with the initial
state being specified by `s`.

Where possible, prefer `Stream.combineChunks` for a more efficient
implementation.

**Signature**

```ts
export declare const combine: {
  <R2, E2, A2, S, R3, E, A, R4, R5, A3>(
    that: Stream<R2, E2, A2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<R3, Option.Option<E>, A>,
      pullRight: Effect.Effect<R4, Option.Option<E2>, A2>
    ) => Effect.Effect<R5, never, Exit.Exit<Option.Option<E2 | E>, readonly [A3, S]>>
  ): <R>(self: Stream<R, E, A>) => Stream<R2 | R3 | R4 | R5 | R, E2 | E, A3>
  <R, R2, E2, A2, S, R3, E, A, R4, R5, A3>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<R3, Option.Option<E>, A>,
      pullRight: Effect.Effect<R4, Option.Option<E2>, A2>
    ) => Effect.Effect<R5, never, Exit.Exit<Option.Option<E2 | E>, readonly [A3, S]>>
  ): Stream<R | R2 | R3 | R4 | R5, E2 | E, A3>
}
```

Added in v2.0.0

## combineChunks

Combines the chunks from this stream and the specified stream by repeatedly
applying the function `f` to extract a chunk using both sides and
conceptually "offer" it to the destination stream. `f` can maintain some
internal state to control the combining process, with the initial state
being specified by `s`.

**Signature**

```ts
export declare const combineChunks: {
  <R2, E2, A2, S, R3, E, A, R4, R5, A3>(
    that: Stream<R2, E2, A2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<R3, Option.Option<E>, Chunk.Chunk<A>>,
      pullRight: Effect.Effect<R4, Option.Option<E2>, Chunk.Chunk<A2>>
    ) => Effect.Effect<R5, never, Exit.Exit<Option.Option<E2 | E>, readonly [Chunk.Chunk<A3>, S]>>
  ): <R>(self: Stream<R, E, A>) => Stream<R2 | R3 | R4 | R5 | R, E2 | E, A3>
  <R, R2, E2, A2, S, R3, E, A, R4, R5, A3>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>,
    s: S,
    f: (
      s: S,
      pullLeft: Effect.Effect<R3, Option.Option<E>, Chunk.Chunk<A>>,
      pullRight: Effect.Effect<R4, Option.Option<E2>, Chunk.Chunk<A2>>
    ) => Effect.Effect<R5, never, Exit.Exit<Option.Option<E2 | E>, readonly [Chunk.Chunk<A3>, S]>>
  ): Stream<R | R2 | R3 | R4 | R5, E2 | E, A3>
}
```

Added in v2.0.0

## concat

Concatenates the specified stream with this stream, resulting in a stream
that emits the elements from this stream and then the elements from the
specified stream.

**Signature**

```ts
export declare const concat: {
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A | A2>
}
```

Added in v2.0.0

## cross

Composes this stream with the specified stream to create a cartesian
product of elements. The `that` stream would be run multiple times, for
every element in the `this` stream.

See also `Stream.zip` for the more common point-wise variant.

**Signature**

```ts
export declare const cross: {
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, [A, A2]>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, [A, A2]>
}
```

Added in v2.0.0

## crossLeft

Composes this stream with the specified stream to create a cartesian
product of elements, but keeps only elements from this stream. The `that`
stream would be run multiple times, for every element in the `this` stream.

See also `Stream.zipLeft` for the more common point-wise variant.

**Signature**

```ts
export declare const crossLeft: {
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## crossRight

Composes this stream with the specified stream to create a cartesian
product of elements, but keeps only elements from the other stream. The
`that` stream would be run multiple times, for every element in the `this`
stream.

See also `Stream.zipRight` for the more common point-wise variant.

**Signature**

```ts
export declare const crossRight: {
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## crossWith

Composes this stream with the specified stream to create a cartesian
product of elements with a specified function. The `that` stream would be
run multiple times, for every element in the `this` stream.

See also `Stream.zipWith` for the more common point-wise variant.

**Signature**

```ts
export declare const crossWith: {
  <R2, E2, B, A, C>(
    that: Stream<R2, E2, B>,
    f: (a: A, b: B) => C
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, C>
  <R, E, R2, E2, B, A, C>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, B>,
    f: (a: A, b: B) => C
  ): Stream<R | R2, E | E2, C>
}
```

Added in v2.0.0

## debounce

Delays the emission of values by holding new values for a set duration. If
no new values arrive during that time the value is emitted, however if a
new value is received during the holding period the previous value is
discarded and the process is repeated with the new value.

This operator is useful if you have a stream of "bursty" events which
eventually settle down and you only need the final event of the burst. For
example, a search engine may only want to initiate a search after a user
has paused typing so as to not prematurely recommend results.

**Signature**

```ts
export declare const debounce: {
  (duration: Duration.DurationInput): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, duration: Duration.DurationInput): Stream<R, E, A>
}
```

Added in v2.0.0

## distributedWith

More powerful version of `Stream.broadcast`. Allows to provide a function
that determines what queues should receive which elements. The decide
function will receive the indices of the queues in the resulting list.

**Signature**

```ts
export declare const distributedWith: {
  <N extends number, A>(options: {
    readonly size: N
    readonly maximumLag: number
    readonly decide: (a: A) => Effect.Effect<never, never, Predicate<number>>
  }): <R, E>(
    self: Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R, never, Stream.DynamicTuple<Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>, N>>
  <R, E, N extends number, A>(
    self: Stream<R, E, A>,
    options: {
      readonly size: N
      readonly maximumLag: number
      readonly decide: (a: A) => Effect.Effect<never, never, Predicate<number>>
    }
  ): Effect.Effect<Scope.Scope | R, never, Stream.DynamicTuple<Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>, N>>
}
```

Added in v2.0.0

## distributedWithDynamic

More powerful version of `Stream.distributedWith`. This returns a function
that will produce new queues and corresponding indices. You can also
provide a function that will be executed after the final events are
enqueued in all queues. Shutdown of the queues is handled by the driver.
Downstream users can also shutdown queues manually. In this case the driver
will continue but no longer backpressure on them.

**Signature**

```ts
export declare const distributedWithDynamic: {
  <E, A, _>(options: {
    readonly maximumLag: number
    readonly decide: (a: A) => Effect.Effect<never, never, Predicate<number>>
  }): <R>(
    self: Stream<R, E, A>
  ) => Effect.Effect<
    Scope.Scope | R,
    never,
    Effect.Effect<never, never, [number, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>]>
  >
  <R, E, A, _>(
    self: Stream<R, E, A>,
    options: { readonly maximumLag: number; readonly decide: (a: A) => Effect.Effect<never, never, Predicate<number>> }
  ): Effect.Effect<
    Scope.Scope | R,
    never,
    Effect.Effect<never, never, [number, Queue.Dequeue<Exit.Exit<Option.Option<E>, A>>]>
  >
}
```

Added in v2.0.0

## drain

Converts this stream to a stream that executes its effects but emits no
elements. Useful for sequencing effects using streams:

**Signature**

```ts
export declare const drain: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, never>
```

Added in v2.0.0

## drainFork

Drains the provided stream in the background for as long as this stream is
running. If this stream ends before `other`, `other` will be interrupted.
If `other` fails, this stream will fail with that error.

**Signature**

```ts
export declare const drainFork: {
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## drop

Drops the specified number of elements from this stream.

**Signature**

```ts
export declare const drop: {
  (n: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A>
}
```

Added in v2.0.0

## dropRight

Drops the last specified number of elements from this stream.

**Signature**

```ts
export declare const dropRight: {
  (n: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A>
}
```

Added in v2.0.0

## dropUntil

Drops all elements of the stream until the specified predicate evaluates to
`true`.

**Signature**

```ts
export declare const dropUntil: {
  <A, X extends A>(predicate: Predicate<X>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A, X extends A>(self: Stream<R, E, A>, predicate: Predicate<X>): Stream<R, E, A>
}
```

Added in v2.0.0

## dropUntilEffect

Drops all elements of the stream until the specified effectful predicate
evaluates to `true`.

**Signature**

```ts
export declare const dropUntilEffect: {
  <A, X extends A, R2, E2>(
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, X extends A, R2, E2>(
    self: Stream<R, E, A>,
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## dropWhile

Drops all elements of the stream for as long as the specified predicate
evaluates to `true`.

**Signature**

```ts
export declare const dropWhile: {
  <A, X extends A>(predicate: Predicate<X>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A, X extends A>(self: Stream<R, E, A>, predicate: Predicate<X>): Stream<R, E, A>
}
```

Added in v2.0.0

## dropWhileEffect

Drops all elements of the stream for as long as the specified predicate
produces an effect that evalutates to `true`

**Signature**

```ts
export declare const dropWhileEffect: {
  <A, X extends A, R2, E2>(
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, X extends A, R2, E2>(
    self: Stream<R, E, A>,
    predicate: (a: X) => Effect.Effect<R2, E2, boolean>
  ): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## either

Returns a stream whose failures and successes have been lifted into an
`Either`. The resulting stream cannot fail, because the failures have been
exposed as part of the `Either` success case.

**Signature**

```ts
export declare const either: <R, E, A>(self: Stream<R, E, A>) => Stream<R, never, Either.Either<E, A>>
```

Added in v2.0.0

## ensuring

Executes the provided finalizer after this stream's finalizers run.

**Signature**

```ts
export declare const ensuring: {
  <R2, _>(finalizer: Effect.Effect<R2, never, _>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, E, A, R2, _>(self: Stream<R, E, A>, finalizer: Effect.Effect<R2, never, _>): Stream<R | R2, E, A>
}
```

Added in v2.0.0

## ensuringWith

Executes the provided finalizer after this stream's finalizers run.

**Signature**

```ts
export declare const ensuringWith: {
  <E, R2>(
    finalizer: (exit: Exit.Exit<E, unknown>) => Effect.Effect<R2, never, unknown>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, E, A, R2>(
    self: Stream<R, E, A>,
    finalizer: (exit: Exit.Exit<E, unknown>) => Effect.Effect<R2, never, unknown>
  ): Stream<R | R2, E, A>
}
```

Added in v2.0.0

## filterMap

Performs a filter and map in a single step.

**Signature**

```ts
export declare const filterMap: {
  <A, B>(pf: (a: A) => Option.Option<B>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>
  <R, E, A, B>(self: Stream<R, E, A>, pf: (a: A) => Option.Option<B>): Stream<R, E, B>
}
```

Added in v2.0.0

## filterMapEffect

Performs an effectful filter and map in a single step.

**Signature**

```ts
export declare const filterMapEffect: {
  <A, R2, E2, A2>(
    pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
  ): Stream<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## filterMapWhile

Transforms all elements of the stream for as long as the specified partial
function is defined.

**Signature**

```ts
export declare const filterMapWhile: {
  <A, A2>(pf: (a: A) => Option.Option<A2>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A2>
  <R, E, A, A2>(self: Stream<R, E, A>, pf: (a: A) => Option.Option<A2>): Stream<R, E, A2>
}
```

Added in v2.0.0

## filterMapWhileEffect

Effectfully transforms all elements of the stream for as long as the
specified partial function is defined.

**Signature**

```ts
export declare const filterMapWhileEffect: {
  <A, R2, E2, A2>(
    pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    pf: (a: A) => Option.Option<Effect.Effect<R2, E2, A2>>
  ): Stream<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## forever

Repeats this stream forever.

**Signature**

```ts
export declare const forever: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
```

Added in v2.0.0

## groupByKey

Partition a stream using a function and process each stream individually.
This returns a data structure that can be used to further filter down which
groups shall be processed.

After calling apply on the GroupBy object, the remaining groups will be
processed in parallel and the resulting streams merged in a
nondeterministic fashion.

Up to `buffer` elements may be buffered in any group stream before the
producer is backpressured. Take care to consume from all streams in order
to prevent deadlocks.

For example, to collect the first 2 words for every starting letter from a
stream of words:

```ts
import * as GroupBy from "./GroupBy"
import * as Stream from "./Stream"
import { pipe } from "./Function"

pipe(
  Stream.fromIterable(["hello", "world", "hi", "holla"]),
  Stream.groupByKey((word) => word[0]),
  GroupBy.evaluate((key, stream) =>
    pipe(
      stream,
      Stream.take(2),
      Stream.map((words) => [key, words] as const)
    )
  )
)
```

**Signature**

```ts
export declare const groupByKey: {
  <A, K>(
    f: (a: A) => K,
    options?: { readonly bufferSize?: number | undefined }
  ): <R, E>(self: Stream<R, E, A>) => GroupBy.GroupBy<R, E, K, A>
  <R, E, A, K>(
    self: Stream<R, E, A>,
    f: (a: A) => K,
    options?: { readonly bufferSize?: number | undefined }
  ): GroupBy.GroupBy<R, E, K, A>
}
```

Added in v2.0.0

## grouped

Partitions the stream with specified `chunkSize`.

**Signature**

```ts
export declare const grouped: {
  (chunkSize: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk.Chunk<A>>
  <R, E, A>(self: Stream<R, E, A>, chunkSize: number): Stream<R, E, Chunk.Chunk<A>>
}
```

Added in v2.0.0

## groupedWithin

Partitions the stream with the specified `chunkSize` or until the specified
`duration` has passed, whichever is satisfied first.

**Signature**

```ts
export declare const groupedWithin: {
  (
    chunkSize: number,
    duration: Duration.DurationInput
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk.Chunk<A>>
  <R, E, A>(self: Stream<R, E, A>, chunkSize: number, duration: Duration.DurationInput): Stream<R, E, Chunk.Chunk<A>>
}
```

Added in v2.0.0

## haltAfter

Specialized version of haltWhen which halts the evaluation of this stream
after the given duration.

An element in the process of being pulled will not be interrupted when the
given duration completes. See `interruptAfter` for this behavior.

**Signature**

```ts
export declare const haltAfter: {
  (duration: Duration.DurationInput): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, duration: Duration.DurationInput): Stream<R, E, A>
}
```

Added in v2.0.0

## haltWhen

Halts the evaluation of this stream when the provided effect completes. The
given effect will be forked as part of the returned stream, and its success
will be discarded.

An element in the process of being pulled will not be interrupted when the
effect completes. See `interruptWhen` for this behavior.

If the effect completes with a failure, the stream will emit that failure.

**Signature**

```ts
export declare const haltWhen: {
  <R2, E2, _>(effect: Effect.Effect<R2, E2, _>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, _>(self: Stream<R, E, A>, effect: Effect.Effect<R2, E2, _>): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## haltWhenDeferred

Halts the evaluation of this stream when the provided promise resolves.

If the promise completes with a failure, the stream will emit that failure.

**Signature**

```ts
export declare const haltWhenDeferred: {
  <E2, _>(deferred: Deferred.Deferred<E2, _>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2 | E, A>
  <R, E, A, E2, _>(self: Stream<R, E, A>, deferred: Deferred.Deferred<E2, _>): Stream<R, E | E2, A>
}
```

Added in v2.0.0

## identity

The identity pipeline, which does not modify streams in any way.

**Signature**

```ts
export declare const identity: <R, E, A>() => Stream<R, E, A>
```

Added in v2.0.0

## interleave

Interleaves this stream and the specified stream deterministically by
alternating pulling values from this stream and the specified stream. When
one stream is exhausted all remaining values in the other stream will be
pulled.

**Signature**

```ts
export declare const interleave: {
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A | A2>
}
```

Added in v2.0.0

## interleaveWith

Combines this stream and the specified stream deterministically using the
stream of boolean values `pull` to control which stream to pull from next.
A value of `true` indicates to pull from this stream and a value of `false`
indicates to pull from the specified stream. Only consumes as many elements
as requested by the `pull` stream. If either this stream or the specified
stream are exhausted further requests for values from that stream will be
ignored.

**Signature**

```ts
export declare const interleaveWith: {
  <R2, E2, A2, R3, E3>(
    that: Stream<R2, E2, A2>,
    decider: Stream<R3, E3, boolean>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R3 | R, E2 | E3 | E, A2 | A>
  <R, E, A, R2, E2, A2, R3, E3>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>,
    decider: Stream<R3, E3, boolean>
  ): Stream<R | R2 | R3, E | E2 | E3, A | A2>
}
```

Added in v2.0.0

## interruptAfter

Specialized version of `Stream.interruptWhen` which interrupts the
evaluation of this stream after the given `Duration`.

**Signature**

```ts
export declare const interruptAfter: {
  (duration: Duration.DurationInput): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, duration: Duration.DurationInput): Stream<R, E, A>
}
```

Added in v2.0.0

## interruptWhen

Interrupts the evaluation of this stream when the provided effect
completes. The given effect will be forked as part of this stream, and its
success will be discarded. This combinator will also interrupt any
in-progress element being pulled from upstream.

If the effect completes with a failure before the stream completes, the
returned stream will emit that failure.

**Signature**

```ts
export declare const interruptWhen: {
  <R2, E2, _>(effect: Effect.Effect<R2, E2, _>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, _>(self: Stream<R, E, A>, effect: Effect.Effect<R2, E2, _>): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## interruptWhenDeferred

Interrupts the evaluation of this stream when the provided promise
resolves. This combinator will also interrupt any in-progress element being
pulled from upstream.

If the promise completes with a failure, the stream will emit that failure.

**Signature**

```ts
export declare const interruptWhenDeferred: {
  <E2, _>(deferred: Deferred.Deferred<E2, _>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2 | E, A>
  <R, E, A, E2, _>(self: Stream<R, E, A>, deferred: Deferred.Deferred<E2, _>): Stream<R, E | E2, A>
}
```

Added in v2.0.0

## intersperse

Intersperse stream with provided `element`.

**Signature**

```ts
export declare const intersperse: {
  <A2>(element: A2): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A2 | A>
  <R, E, A, A2>(self: Stream<R, E, A>, element: A2): Stream<R, E, A | A2>
}
```

Added in v2.0.0

## intersperseAffixes

Intersperse the specified element, also adding a prefix and a suffix.

**Signature**

```ts
export declare const intersperseAffixes: {
  <A2, A3, A4>(options: {
    readonly start: A2
    readonly middle: A3
    readonly end: A4
  }): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A2 | A3 | A4 | A>
  <R, E, A, A2, A3, A4>(
    self: Stream<R, E, A>,
    options: { readonly start: A2; readonly middle: A3; readonly end: A4 }
  ): Stream<R, E, A | A2 | A3 | A4>
}
```

Added in v2.0.0

## mapBoth

Returns a stream whose failure and success channels have been mapped by the
specified `onFailure` and `onSuccess` functions.

**Signature**

```ts
export declare const mapBoth: {
  <E, E2, A, A2>(options: {
    readonly onFailure: (e: E) => E2
    readonly onSuccess: (a: A) => A2
  }): <R>(self: Stream<R, E, A>) => Stream<R, E2, A2>
  <R, E, E2, A, A2>(
    self: Stream<R, E, A>,
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ): Stream<R, E2, A2>
}
```

Added in v2.0.0

## merge

Merges this stream and the specified stream together.

New produced stream will terminate when both specified stream terminate if
no termination strategy is specified.

**Signature**

```ts
export declare const merge: {
  <R2, E2, A2>(
    that: Stream<R2, E2, A2>,
    options?: { readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined }
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>,
    options?: { readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined }
  ): Stream<R | R2, E | E2, A | A2>
}
```

Added in v2.0.0

## mergeAll

Merges a variable list of streams in a non-deterministic fashion. Up to `n`
streams may be consumed in parallel and up to `outputBuffer` chunks may be
buffered by this operator.

**Signature**

```ts
export declare const mergeAll: {
  (options: {
    readonly concurrency: number | "unbounded"
    readonly bufferSize?: number | undefined
  }): <R, E, A>(streams: Iterable<Stream<R, E, A>>) => Stream<R, E, A>
  <R, E, A>(
    streams: Iterable<Stream<R, E, A>>,
    options: { readonly concurrency: number | "unbounded"; readonly bufferSize?: number | undefined }
  ): Stream<R, E, A>
}
```

Added in v2.0.0

## mergeEither

Merges this stream and the specified stream together to produce a stream of
eithers.

**Signature**

```ts
export declare const mergeEither: {
  <R2, E2, A2>(
    that: Stream<R2, E2, A2>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, Either.Either<A, A2>>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, Either.Either<A, A2>>
}
```

Added in v2.0.0

## mergeLeft

Merges this stream and the specified stream together, discarding the values
from the right stream.

**Signature**

```ts
export declare const mergeLeft: {
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## mergeRight

Merges this stream and the specified stream together, discarding the values
from the left stream.

**Signature**

```ts
export declare const mergeRight: {
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## mergeWith

Merges this stream and the specified stream together to a common element
type with the specified mapping functions.

New produced stream will terminate when both specified stream terminate if
no termination strategy is specified.

**Signature**

```ts
export declare const mergeWith: {
  <R2, E2, A2, A, A3, A4>(
    other: Stream<R2, E2, A2>,
    options: {
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A4
      readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined
    }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A3 | A4>
  <R, E, R2, E2, A2, A, A3, A4>(
    self: Stream<R, E, A>,
    other: Stream<R2, E2, A2>,
    options: {
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A4
      readonly haltStrategy?: HaltStrategy.HaltStrategyInput | undefined
    }
  ): Stream<R | R2, E | E2, A3 | A4>
}
```

Added in v2.0.0

## mkString

Returns a combined string resulting from concatenating each of the values
from the stream.

**Signature**

```ts
export declare const mkString: <R, E>(self: Stream<R, E, string>) => Effect.Effect<R, E, string>
```

Added in v2.0.0

## onDone

Runs the specified effect if this stream ends.

**Signature**

```ts
export declare const onDone: {
  <R2, _>(cleanup: () => Effect.Effect<R2, never, _>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, E, A, R2, _>(self: Stream<R, E, A>, cleanup: () => Effect.Effect<R2, never, _>): Stream<R | R2, E, A>
}
```

Added in v2.0.0

## onError

Runs the specified effect if this stream fails, providing the error to the
effect if it exists.

Note: Unlike `Effect.onError` there is no guarantee that the provided
effect will not be interrupted.

**Signature**

```ts
export declare const onError: {
  <E, R2, _>(
    cleanup: (cause: Cause.Cause<E>) => Effect.Effect<R2, never, _>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, A, E, R2, _>(
    self: Stream<R, E, A>,
    cleanup: (cause: Cause.Cause<E>) => Effect.Effect<R2, never, _>
  ): Stream<R | R2, E, A>
}
```

Added in v2.0.0

## partition

Partition a stream using a predicate. The first stream will contain all
element evaluated to true and the second one will contain all element
evaluated to false. The faster stream may advance by up to buffer elements
further than the slower one.

**Signature**

```ts
export declare const partition: {
  <C extends A, B extends A, A = C>(
    refinement: Refinement<A, B>,
    options?: { bufferSize?: number | undefined }
  ): <R, E>(
    self: Stream<R, E, C>
  ) => Effect.Effect<Scope.Scope | R, E, [Stream<never, E, Exclude<C, B>>, Stream<never, E, B>]>
  <A>(
    predicate: Predicate<A>,
    options?: { bufferSize?: number | undefined }
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R, E, [Stream<never, E, A>, Stream<never, E, A>]>
  <R, E, C extends A, B extends A, A = C>(
    self: Stream<R, E, C>,
    refinement: Refinement<A, B>,
    options?: { bufferSize?: number | undefined }
  ): Effect.Effect<Scope.Scope | R, E, [Stream<never, E, Exclude<C, B>>, Stream<never, E, B>]>
  <R, E, A>(
    self: Stream<R, E, A>,
    predicate: Predicate<A>,
    options?: { bufferSize?: number | undefined }
  ): Effect.Effect<Scope.Scope | R, E, [Stream<never, E, A>, Stream<never, E, A>]>
}
```

Added in v2.0.0

## partitionEither

Split a stream by an effectful predicate. The faster stream may advance by
up to buffer elements further than the slower one.

**Signature**

```ts
export declare const partitionEither: {
  <A, R2, E2, A2, A3>(
    predicate: (a: A) => Effect.Effect<R2, E2, Either.Either<A2, A3>>,
    options?: { readonly bufferSize?: number | undefined }
  ): <R, E>(
    self: Stream<R, E, A>
  ) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, [Stream<never, E2 | E, A2>, Stream<never, E2 | E, A3>]>
  <R, E, A, R2, E2, A2, A3>(
    self: Stream<R, E, A>,
    predicate: (a: A) => Effect.Effect<R2, E2, Either.Either<A2, A3>>,
    options?: { readonly bufferSize?: number | undefined }
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, [Stream<never, E | E2, A2>, Stream<never, E | E2, A3>]>
}
```

Added in v2.0.0

## peel

Peels off enough material from the stream to construct a `Z` using the
provided `Sink` and then returns both the `Z` and the rest of the
`Stream` in a scope. Like all scoped values, the provided stream is
valid only within the scope.

**Signature**

```ts
export declare const peel: {
  <R2, E2, A, Z>(
    sink: Sink.Sink<R2, E2, A, A, Z>
  ): <R, E>(self: Stream<R, E, A>) => Effect.Effect<Scope.Scope | R2 | R, E2 | E, [Z, Stream<never, E, A>]>
  <R, E, R2, E2, A, Z>(
    self: Stream<R, E, A>,
    sink: Sink.Sink<R2, E2, A, A, Z>
  ): Effect.Effect<Scope.Scope | R | R2, E | E2, [Z, Stream<never, E, A>]>
}
```

Added in v2.0.0

## pipeThrough

Pipes all of the values from this stream through the provided sink.

See also `Stream.transduce`.

**Signature**

```ts
export declare const pipeThrough: {
  <R2, E2, A, L, Z>(sink: Sink.Sink<R2, E2, A, L, Z>): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, L>
  <R, E, R2, E2, A, L, Z>(self: Stream<R, E, A>, sink: Sink.Sink<R2, E2, A, L, Z>): Stream<R | R2, E | E2, L>
}
```

Added in v2.0.0

## pipeThroughChannel

Pipes all the values from this stream through the provided channel.

**Signature**

```ts
export declare const pipeThroughChannel: {
  <R2, E, E2, A, A2>(
    channel: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown>
  ): <R>(self: Stream<R, E, A>) => Stream<R2 | R, E2, A2>
  <R, R2, E, E2, A, A2>(
    self: Stream<R, E, A>,
    channel: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown>
  ): Stream<R | R2, E2, A2>
}
```

Added in v2.0.0

## pipeThroughChannelOrFail

Pipes all values from this stream through the provided channel, passing
through any error emitted by this stream unchanged.

**Signature**

```ts
export declare const pipeThroughChannelOrFail: {
  <R2, E, E2, A, A2>(
    chan: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown>
  ): <R>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A2>
  <R, R2, E, E2, A, A2>(
    self: Stream<R, E, A>,
    chan: Channel.Channel<R2, E, Chunk.Chunk<A>, unknown, E2, Chunk.Chunk<A2>, unknown>
  ): Stream<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## prepend

Emits the provided chunk before emitting any other value.

**Signature**

```ts
export declare const prepend: {
  <B>(values: Chunk.Chunk<B>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, B | A>
  <R, E, A, B>(self: Stream<R, E, A>, values: Chunk.Chunk<B>): Stream<R, E, A | B>
}
```

Added in v2.0.0

## rechunk

Re-chunks the elements of the stream into chunks of `n` elements each. The
last chunk might contain less than `n` elements.

**Signature**

```ts
export declare const rechunk: {
  (n: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A>
}
```

Added in v2.0.0

## repeat

Repeats the entire stream using the specified schedule. The stream will
execute normally, and then repeat again according to the provided schedule.

**Signature**

```ts
export declare const repeat: {
  <R2, B>(schedule: Schedule.Schedule<R2, unknown, B>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, E, A, R2, B>(self: Stream<R, E, A>, schedule: Schedule.Schedule<R2, unknown, B>): Stream<R | R2, E, A>
}
```

Added in v2.0.0

## repeatEither

Repeats the entire stream using the specified schedule. The stream will
execute normally, and then repeat again according to the provided schedule.
The schedule output will be emitted at the end of each repetition.

**Signature**

```ts
export declare const repeatEither: {
  <R2, B>(
    schedule: Schedule.Schedule<R2, unknown, B>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, Either.Either<B, A>>
  <R, E, A, R2, B>(
    self: Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>
  ): Stream<R | R2, E, Either.Either<B, A>>
}
```

Added in v2.0.0

## repeatElements

Repeats each element of the stream using the provided schedule. Repetitions
are done in addition to the first execution, which means using
`Schedule.recurs(1)` actually results in the original effect, plus an
additional recurrence, for a total of two repetitions of each value in the
stream.

**Signature**

```ts
export declare const repeatElements: {
  <R2, B>(schedule: Schedule.Schedule<R2, unknown, B>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, E, A, R2, B>(self: Stream<R, E, A>, schedule: Schedule.Schedule<R2, unknown, B>): Stream<R | R2, E, A>
}
```

Added in v2.0.0

## repeatElementsWith

Repeats each element of the stream using the provided schedule. When the
schedule is finished, then the output of the schedule will be emitted into
the stream. Repetitions are done in addition to the first execution, which
means using `Schedule.recurs(1)` actually results in the original effect,
plus an additional recurrence, for a total of two repetitions of each value
in the stream.

This function accepts two conversion functions, which allow the output of
this stream and the output of the provided schedule to be unified into a
single type. For example, `Either` or similar data type.

**Signature**

```ts
export declare const repeatElementsWith: {
  <R2, B, A, C>(
    schedule: Schedule.Schedule<R2, unknown, B>,
    options: { readonly onElement: (a: A) => C; readonly onSchedule: (b: B) => C }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E, C>
  <R, E, R2, B, A, C>(
    self: Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>,
    options: { readonly onElement: (a: A) => C; readonly onSchedule: (b: B) => C }
  ): Stream<R | R2, E, C>
}
```

Added in v2.0.0

## repeatWith

Repeats the entire stream using the specified schedule. The stream will
execute normally, and then repeat again according to the provided schedule.
The schedule output will be emitted at the end of each repetition and can
be unified with the stream elements using the provided functions.

**Signature**

```ts
export declare const repeatWith: {
  <R2, B, A, C>(
    schedule: Schedule.Schedule<R2, unknown, B>,
    options: { readonly onElement: (a: A) => C; readonly onSchedule: (b: B) => C }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E, C>
  <R, E, R2, B, A, C>(
    self: Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, unknown, B>,
    options: { readonly onElement: (a: A) => C; readonly onSchedule: (b: B) => C }
  ): Stream<R | R2, E, C>
}
```

Added in v2.0.0

## retry

When the stream fails, retry it according to the given schedule

This retries the entire stream, so will re-execute all of the stream's
acquire operations.

The schedule is reset as soon as the first element passes through the
stream again.

**Signature**

```ts
export declare const retry: {
  <R2, E, E0 extends E, _>(
    schedule: Schedule.Schedule<R2, E0, _>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, A, R2, E, E0 extends E, _>(self: Stream<R, E, A>, schedule: Schedule.Schedule<R2, E0, _>): Stream<R | R2, E, A>
}
```

Added in v2.0.0

## scan

Statefully maps over the elements of this stream to produce all
intermediate results of type `S` given an initial S.

**Signature**

```ts
export declare const scan: {
  <S, A>(s: S, f: (s: S, a: A) => S): <R, E>(self: Stream<R, E, A>) => Stream<R, E, S>
  <R, E, S, A>(self: Stream<R, E, A>, s: S, f: (s: S, a: A) => S): Stream<R, E, S>
}
```

Added in v2.0.0

## scanEffect

Statefully and effectfully maps over the elements of this stream to produce
all intermediate results of type `S` given an initial S.

**Signature**

```ts
export declare const scanEffect: {
  <S, A, R2, E2>(
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, S>
  <R, E, S, A, R2, E2>(
    self: Stream<R, E, A>,
    s: S,
    f: (s: S, a: A) => Effect.Effect<R2, E2, S>
  ): Stream<R | R2, E | E2, S>
}
```

Added in v2.0.0

## scanReduce

Statefully maps over the elements of this stream to produce all
intermediate results.

See also `Stream.scan`.

**Signature**

```ts
export declare const scanReduce: {
  <A2, A>(f: (a2: A2 | A, a: A) => A2): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A2 | A>
  <R, E, A2, A>(self: Stream<R, E, A>, f: (a2: A2 | A, a: A) => A2): Stream<R, E, A2 | A>
}
```

Added in v2.0.0

## scanReduceEffect

Statefully and effectfully maps over the elements of this stream to produce
all intermediate results.

See also `Stream.scanEffect`.

**Signature**

```ts
export declare const scanReduceEffect: <A2, A, R2, E2>(
  f: (a2: A2 | A, a: A) => Effect.Effect<R2, E2, A2 | A>
) => <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>
```

Added in v2.0.0

## schedule

Schedules the output of the stream using the provided `schedule`.

**Signature**

```ts
export declare const schedule: {
  <R2, A, A0 extends A, _>(
    schedule: Schedule.Schedule<R2, A0, _>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E, A>
  <R, E, R2, A, A0 extends A, _>(self: Stream<R, E, A>, schedule: Schedule.Schedule<R2, A0, _>): Stream<R | R2, E, A>
}
```

Added in v2.0.0

## scheduleWith

Schedules the output of the stream using the provided `schedule` and emits
its output at the end (if `schedule` is finite). Uses the provided function
to align the stream and schedule outputs on the same type.

**Signature**

```ts
export declare const scheduleWith: {
  <R2, A, A0 extends A, B, C>(
    schedule: Schedule.Schedule<R2, A0, B>,
    options: { readonly onElement: (a: A) => C; readonly onSchedule: (b: B) => C }
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E, C>
  <R, E, R2, A, A0 extends A, B, C>(
    self: Stream<R, E, A>,
    schedule: Schedule.Schedule<R2, A0, B>,
    options: { readonly onElement: (a: A) => C; readonly onSchedule: (b: B) => C }
  ): Stream<R | R2, E, C>
}
```

Added in v2.0.0

## sliding

Emits a sliding window of `n` elements.

```ts
import * as Stream from "./Stream"
import { pipe } from "./Function"

pipe(Stream.make(1, 2, 3, 4), Stream.sliding(2), Stream.runCollect)
// => Chunk(Chunk(1, 2), Chunk(2, 3), Chunk(3, 4))
```

**Signature**

```ts
export declare const sliding: {
  (chunkSize: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk.Chunk<A>>
  <R, E, A>(self: Stream<R, E, A>, chunkSize: number): Stream<R, E, Chunk.Chunk<A>>
}
```

Added in v2.0.0

## slidingSize

Like `sliding`, but with a configurable `stepSize` parameter.

**Signature**

```ts
export declare const slidingSize: {
  (chunkSize: number, stepSize: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, Chunk.Chunk<A>>
  <R, E, A>(self: Stream<R, E, A>, chunkSize: number, stepSize: number): Stream<R, E, Chunk.Chunk<A>>
}
```

Added in v2.0.0

## some

Converts an option on values into an option on errors.

**Signature**

```ts
export declare const some: <R, E, A>(self: Stream<R, E, Option.Option<A>>) => Stream<R, Option.Option<E>, A>
```

Added in v2.0.0

## someOrElse

Extracts the optional value, or returns the given 'default'.

**Signature**

```ts
export declare const someOrElse: {
  <A2>(fallback: LazyArg<A2>): <R, E, A>(self: Stream<R, E, Option.Option<A>>) => Stream<R, E, A2 | A>
  <R, E, A, A2>(self: Stream<R, E, Option.Option<A>>, fallback: LazyArg<A2>): Stream<R, E, A | A2>
}
```

Added in v2.0.0

## someOrFail

Extracts the optional value, or fails with the given error 'e'.

**Signature**

```ts
export declare const someOrFail: {
  <E2>(error: LazyArg<E2>): <R, E, A>(self: Stream<R, E, Option.Option<A>>) => Stream<R, E2 | E, A>
  <R, E, A, E2>(self: Stream<R, E, Option.Option<A>>, error: LazyArg<E2>): Stream<R, E | E2, A>
}
```

Added in v2.0.0

## split

Splits elements based on a predicate.

```ts
import * as Stream from "./Stream"
import { pipe } from "./Function"

pipe(
  Stream.range(1, 10),
  Stream.split((n) => n % 4 === 0),
  Stream.runCollect
)
// => Chunk(Chunk(1, 2, 3), Chunk(5, 6, 7), Chunk(9))
```

**Signature**

```ts
export declare const split: {
  <A>(predicate: Predicate<A>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, Chunk.Chunk<A>>
  <R, E, A>(self: Stream<R, E, A>, predicate: Predicate<A>): Stream<R, E, Chunk.Chunk<A>>
}
```

Added in v2.0.0

## splitOnChunk

Splits elements on a delimiter and transforms the splits into desired output.

**Signature**

```ts
export declare const splitOnChunk: {
  <A>(delimiter: Chunk.Chunk<A>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, Chunk.Chunk<A>>
  <R, E, A>(self: Stream<R, E, A>, delimiter: Chunk.Chunk<A>): Stream<R, E, Chunk.Chunk<A>>
}
```

Added in v2.0.0

## take

Takes the specified number of elements from this stream.

**Signature**

```ts
export declare const take: {
  (n: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A>
}
```

Added in v2.0.0

## takeRight

Takes the last specified number of elements from this stream.

**Signature**

```ts
export declare const takeRight: {
  (n: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A>
}
```

Added in v2.0.0

## takeUntil

Takes all elements of the stream until the specified predicate evaluates to
`true`.

**Signature**

```ts
export declare const takeUntil: {
  <A>(predicate: Predicate<A>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, predicate: Predicate<A>): Stream<R, E, A>
}
```

Added in v2.0.0

## takeUntilEffect

Takes all elements of the stream until the specified effectual predicate
evaluates to `true`.

**Signature**

```ts
export declare const takeUntilEffect: {
  <A, R2, E2>(
    predicate: (a: A) => Effect.Effect<R2, E2, boolean>
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2>(
    self: Stream<R, E, A>,
    predicate: (a: A) => Effect.Effect<R2, E2, boolean>
  ): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## takeWhile

Takes all elements of the stream for as long as the specified predicate
evaluates to `true`.

**Signature**

```ts
export declare const takeWhile: {
  <A, B extends A>(refinement: Refinement<A, B>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>
  <A>(predicate: Predicate<A>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A, B extends A>(self: Stream<R, E, A>, refinement: Refinement<A, B>): Stream<R, E, B>
  <R, E, A>(self: Stream<R, E, A>, predicate: Predicate<A>): Stream<R, E, A>
}
```

Added in v2.0.0

## tapErrorCause

Returns a stream that effectfully "peeks" at the cause of failure of the
stream.

**Signature**

```ts
export declare const tapErrorCause: {
  <E, X extends E, R2, E2, _>(
    f: (cause: Cause.Cause<X>) => Effect.Effect<R2, E2, _>
  ): <R, A>(self: Stream<R, E, A>) => Stream<R2 | R, E | E2, A>
  <R, A, E, X extends E, R2, E2, _>(
    self: Stream<R, E, A>,
    f: (cause: Cause.Cause<X>) => Effect.Effect<R2, E2, _>
  ): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## throttle

Delays the chunks of this stream according to the given bandwidth
parameters using the token bucket algorithm. Allows for burst in the
processing of elements by allowing the token bucket to accumulate tokens up
to a `units + burst` threshold. The weight of each chunk is determined by
the `costFn` function.

If using the "enforce" strategy, chunks that do not meet the bandwidth
constraints are dropped. If using the "shape" strategy, chunks are delayed
until they can be emitted without exceeding the bandwidth constraints.

Defaults to the "shape" strategy.

**Signature**

```ts
export declare const throttle: {
  <A>(options: {
    readonly cost: (chunk: Chunk.Chunk<A>) => number
    readonly units: number
    readonly duration: Duration.DurationInput
    readonly burst?: number | undefined
    readonly strategy?: "enforce" | "shape" | undefined
  }): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(
    self: Stream<R, E, A>,
    options: {
      readonly cost: (chunk: Chunk.Chunk<A>) => number
      readonly units: number
      readonly duration: Duration.DurationInput
      readonly burst?: number | undefined
      readonly strategy?: "enforce" | "shape" | undefined
    }
  ): Stream<R, E, A>
}
```

Added in v2.0.0

## throttleEffect

Delays the chunks of this stream according to the given bandwidth
parameters using the token bucket algorithm. Allows for burst in the
processing of elements by allowing the token bucket to accumulate tokens up
to a `units + burst` threshold. The weight of each chunk is determined by
the effectful `costFn` function.

If using the "enforce" strategy, chunks that do not meet the bandwidth
constraints are dropped. If using the "shape" strategy, chunks are delayed
until they can be emitted without exceeding the bandwidth constraints.

Defaults to the "shape" strategy.

**Signature**

```ts
export declare const throttleEffect: {
  <A, R2, E2>(options: {
    readonly cost: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, number>
    readonly units: number
    readonly duration: Duration.DurationInput
    readonly burst?: number | undefined
    readonly strategy?: "enforce" | "shape" | undefined
  }): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2>(
    self: Stream<R, E, A>,
    options: {
      readonly cost: (chunk: Chunk.Chunk<A>) => Effect.Effect<R2, E2, number>
      readonly units: number
      readonly duration: Duration.DurationInput
      readonly burst?: number | undefined
      readonly strategy?: "enforce" | "shape" | undefined
    }
  ): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## timeout

Ends the stream if it does not produce a value after the specified duration.

**Signature**

```ts
export declare const timeout: {
  (duration: Duration.DurationInput): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, duration: Duration.DurationInput): Stream<R, E, A>
}
```

Added in v2.0.0

## timeoutFail

Fails the stream with given error if it does not produce a value after d
duration.

**Signature**

```ts
export declare const timeoutFail: {
  <E2>(error: LazyArg<E2>, duration: Duration.DurationInput): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2 | E, A>
  <R, E, A, E2>(self: Stream<R, E, A>, error: LazyArg<E2>, duration: Duration.DurationInput): Stream<R, E | E2, A>
}
```

Added in v2.0.0

## timeoutFailCause

Fails the stream with given cause if it does not produce a value after d
duration.

**Signature**

```ts
export declare const timeoutFailCause: {
  <E2>(
    cause: LazyArg<Cause.Cause<E2>>,
    duration: Duration.DurationInput
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E2 | E, A>
  <R, E, A, E2>(
    self: Stream<R, E, A>,
    cause: LazyArg<Cause.Cause<E2>>,
    duration: Duration.DurationInput
  ): Stream<R, E | E2, A>
}
```

Added in v2.0.0

## timeoutTo

Switches the stream if it does not produce a value after the specified
duration.

**Signature**

```ts
export declare const timeoutTo: {
  <R2, E2, A2>(
    duration: Duration.DurationInput,
    that: Stream<R2, E2, A2>
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(
    self: Stream<R, E, A>,
    duration: Duration.DurationInput,
    that: Stream<R2, E2, A2>
  ): Stream<R | R2, E | E2, A | A2>
}
```

Added in v2.0.0

## transduce

Applies the transducer to the stream and emits its outputs.

**Signature**

```ts
export declare const transduce: {
  <R2, E2, A, Z>(sink: Sink.Sink<R2, E2, A, A, Z>): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, Z>
  <R, E, R2, E2, A, Z>(self: Stream<R, E, A>, sink: Sink.Sink<R2, E2, A, A, Z>): Stream<R | R2, E | E2, Z>
}
```

Added in v2.0.0

## when

Returns the specified stream if the given condition is satisfied, otherwise
returns an empty stream.

**Signature**

```ts
export declare const when: {
  (predicate: LazyArg<boolean>): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A>
  <R, E, A>(self: Stream<R, E, A>, predicate: LazyArg<boolean>): Stream<R, E, A>
}
```

Added in v2.0.0

## whenCaseEffect

Returns the stream when the given partial function is defined for the given
effectful value, otherwise returns an empty stream.

**Signature**

```ts
export declare const whenCaseEffect: {
  <A, R2, E2, A2>(
    pf: (a: A) => Option.Option<Stream<R2, E2, A2>>
  ): <R, E>(self: Effect.Effect<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Effect.Effect<R, E, A>,
    pf: (a: A) => Option.Option<Stream<R2, E2, A2>>
  ): Stream<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## whenEffect

Returns the stream if the given effectful condition is satisfied, otherwise
returns an empty stream.

**Signature**

```ts
export declare const whenEffect: {
  <R2, E2>(effect: Effect.Effect<R2, E2, boolean>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2>(self: Stream<R, E, A>, effect: Effect.Effect<R2, E2, boolean>): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

# zipping

## zip

Zips this stream with another point-wise and emits tuples of elements from
both streams.

The new stream will end when one of the sides ends.

**Signature**

```ts
export declare const zip: {
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, [A, A2]>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, [A, A2]>
}
```

Added in v2.0.0

## zipAll

Zips this stream with another point-wise, creating a new stream of pairs of
elements from both sides.

The defaults `defaultLeft` and `defaultRight` will be used if the streams
have different lengths and one of the streams has ended before the other.

**Signature**

```ts
export declare const zipAll: {
  <R2, E2, A2, A>(options: {
    readonly other: Stream<R2, E2, A2>
    readonly defaultSelf: A
    readonly defaultOther: A2
  }): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, [A, A2]>
  <R, E, R2, E2, A2, A>(
    self: Stream<R, E, A>,
    options: { readonly other: Stream<R2, E2, A2>; readonly defaultSelf: A; readonly defaultOther: A2 }
  ): Stream<R | R2, E | E2, [A, A2]>
}
```

Added in v2.0.0

## zipAllLeft

Zips this stream with another point-wise, and keeps only elements from this
stream.

The provided default value will be used if the other stream ends before
this one.

**Signature**

```ts
export declare const zipAllLeft: {
  <R2, E2, A2, A>(that: Stream<R2, E2, A2>, defaultLeft: A): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, R2, E2, A2, A>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>, defaultLeft: A): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## zipAllRight

Zips this stream with another point-wise, and keeps only elements from the
other stream.

The provided default value will be used if this stream ends before the
other one.

**Signature**

```ts
export declare const zipAllRight: {
  <R2, E2, A2>(
    that: Stream<R2, E2, A2>,
    defaultRight: A2
  ): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>, defaultRight: A2): Stream<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## zipAllSortedByKey

Zips this stream that is sorted by distinct keys and the specified stream
that is sorted by distinct keys to produce a new stream that is sorted by
distinct keys. Combines values associated with each key into a tuple,
using the specified values `defaultLeft` and `defaultRight` to fill in
missing values.

This allows zipping potentially unbounded streams of data by key in
constant space but the caller is responsible for ensuring that the
streams are sorted by distinct keys.

**Signature**

```ts
export declare const zipAllSortedByKey: {
  <R2, E2, A2, A, K>(options: {
    readonly other: Stream<R2, E2, readonly [K, A2]>
    readonly defaultSelf: A
    readonly defaultOther: A2
    readonly order: Order.Order<K>
  }): <R, E>(self: Stream<R, E, readonly [K, A]>) => Stream<R2 | R, E2 | E, [K, [A, A2]]>
  <R, E, R2, E2, A2, A, K>(
    self: Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream<R2, E2, readonly [K, A2]>
      readonly defaultSelf: A
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ): Stream<R | R2, E | E2, [K, [A, A2]]>
}
```

Added in v2.0.0

## zipAllSortedByKeyLeft

Zips this stream that is sorted by distinct keys and the specified stream
that is sorted by distinct keys to produce a new stream that is sorted by
distinct keys. Keeps only values from this stream, using the specified
value `default` to fill in missing values.

This allows zipping potentially unbounded streams of data by key in
constant space but the caller is responsible for ensuring that the
streams are sorted by distinct keys.

**Signature**

```ts
export declare const zipAllSortedByKeyLeft: {
  <R2, E2, A2, A, K>(options: {
    readonly other: Stream<R2, E2, readonly [K, A2]>
    readonly defaultSelf: A
    readonly order: Order.Order<K>
  }): <R, E>(self: Stream<R, E, readonly [K, A]>) => Stream<R2 | R, E2 | E, [K, A]>
  <R, E, R2, E2, A2, A, K>(
    self: Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream<R2, E2, readonly [K, A2]>
      readonly defaultSelf: A
      readonly order: Order.Order<K>
    }
  ): Stream<R | R2, E | E2, [K, A]>
}
```

Added in v2.0.0

## zipAllSortedByKeyRight

Zips this stream that is sorted by distinct keys and the specified stream
that is sorted by distinct keys to produce a new stream that is sorted by
distinct keys. Keeps only values from that stream, using the specified
value `default` to fill in missing values.

This allows zipping potentially unbounded streams of data by key in
constant space but the caller is responsible for ensuring that the
streams are sorted by distinct keys.

**Signature**

```ts
export declare const zipAllSortedByKeyRight: {
  <R2, E2, A2, K>(options: {
    readonly other: Stream<R2, E2, readonly [K, A2]>
    readonly defaultOther: A2
    readonly order: Order.Order<K>
  }): <R, E, A>(self: Stream<R, E, readonly [K, A]>) => Stream<R2 | R, E2 | E, [K, A2]>
  <R, E, A, R2, E2, A2, K>(
    self: Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream<R2, E2, readonly [K, A2]>
      readonly defaultOther: A2
      readonly order: Order.Order<K>
    }
  ): Stream<R | R2, E | E2, [K, A2]>
}
```

Added in v2.0.0

## zipAllSortedByKeyWith

Zips this stream that is sorted by distinct keys and the specified stream
that is sorted by distinct keys to produce a new stream that is sorted by
distinct keys. Uses the functions `left`, `right`, and `both` to handle
the cases where a key and value exist in this stream, that stream, or
both streams.

This allows zipping potentially unbounded streams of data by key in
constant space but the caller is responsible for ensuring that the
streams are sorted by distinct keys.

**Signature**

```ts
export declare const zipAllSortedByKeyWith: {
  <R2, E2, A, A3, A2, K>(options: {
    readonly other: Stream<R2, E2, readonly [K, A2]>
    readonly onSelf: (a: A) => A3
    readonly onOther: (a2: A2) => A3
    readonly onBoth: (a: A, a2: A2) => A3
    readonly order: Order.Order<K>
  }): <R, E>(self: Stream<R, E, readonly [K, A]>) => Stream<R2 | R, E2 | E, [K, A3]>
  <R, E, R2, E2, A, A3, A2, K>(
    self: Stream<R, E, readonly [K, A]>,
    options: {
      readonly other: Stream<R2, E2, readonly [K, A2]>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
      readonly order: Order.Order<K>
    }
  ): Stream<R | R2, E | E2, [K, A3]>
}
```

Added in v2.0.0

## zipAllWith

Zips this stream with another point-wise. The provided functions will be
used to create elements for the composed stream.

The functions `left` and `right` will be used if the streams have different
lengths and one of the streams has ended before the other.

**Signature**

```ts
export declare const zipAllWith: {
  <R2, E2, A2, A, A3>(options: {
    readonly other: Stream<R2, E2, A2>
    readonly onSelf: (a: A) => A3
    readonly onOther: (a2: A2) => A3
    readonly onBoth: (a: A, a2: A2) => A3
  }): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A3>
  <R, E, R2, E2, A2, A, A3>(
    self: Stream<R, E, A>,
    options: {
      readonly other: Stream<R2, E2, A2>
      readonly onSelf: (a: A) => A3
      readonly onOther: (a2: A2) => A3
      readonly onBoth: (a: A, a2: A2) => A3
    }
  ): Stream<R | R2, E | E2, A3>
}
```

Added in v2.0.0

## zipFlatten

Zips this stream with another point-wise and emits tuples of elements from
both streams.

The new stream will end when one of the sides ends.

**Signature**

```ts
export declare const zipFlatten: {
  <R2, E2, A2>(
    that: Stream<R2, E2, A2>
  ): <R, E, A extends readonly any[]>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, [...A, A2]>
  <R, E, A extends readonly any[], R2, E2, A2>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>
  ): Stream<R | R2, E | E2, [...A, A2]>
}
```

Added in v2.0.0

## zipLatest

Zips the two streams so that when a value is emitted by either of the two
streams, it is combined with the latest value from the other stream to
produce a result.

Note: tracking the latest value is done on a per-chunk basis. That means
that emitted elements that are not the last value in chunks will never be
used for zipping.

**Signature**

```ts
export declare const zipLatest: {
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, [A, A2]>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, [A, A2]>
}
```

Added in v2.0.0

## zipLatestWith

Zips the two streams so that when a value is emitted by either of the two
streams, it is combined with the latest value from the other stream to
produce a result.

Note: tracking the latest value is done on a per-chunk basis. That means
that emitted elements that are not the last value in chunks will never be
used for zipping.

**Signature**

```ts
export declare const zipLatestWith: {
  <R2, E2, A2, A, A3>(
    that: Stream<R2, E2, A2>,
    f: (a: A, a2: A2) => A3
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A3>
  <R, E, R2, E2, A2, A, A3>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>,
    f: (a: A, a2: A2) => A3
  ): Stream<R | R2, E | E2, A3>
}
```

Added in v2.0.0

## zipLeft

Zips this stream with another point-wise, but keeps only the outputs of
this stream.

The new stream will end when one of the sides ends.

**Signature**

```ts
export declare const zipLeft: {
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A>
}
```

Added in v2.0.0

## zipRight

Zips this stream with another point-wise, but keeps only the outputs of the
other stream.

The new stream will end when one of the sides ends.

**Signature**

```ts
export declare const zipRight: {
  <R2, E2, A2>(that: Stream<R2, E2, A2>): <R, E, A>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Stream<R, E, A>, that: Stream<R2, E2, A2>): Stream<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## zipWith

Zips this stream with another point-wise and applies the function to the
paired elements.

The new stream will end when one of the sides ends.

**Signature**

```ts
export declare const zipWith: {
  <R2, E2, A2, A, A3>(
    that: Stream<R2, E2, A2>,
    f: (a: A, a2: A2) => A3
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A3>
  <R, E, R2, E2, A2, A, A3>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>,
    f: (a: A, a2: A2) => A3
  ): Stream<R | R2, E | E2, A3>
}
```

Added in v2.0.0

## zipWithChunks

Zips this stream with another point-wise and applies the function to the
paired elements.

The new stream will end when one of the sides ends.

**Signature**

```ts
export declare const zipWithChunks: {
  <R2, E2, A2, A, A3>(
    that: Stream<R2, E2, A2>,
    f: (
      left: Chunk.Chunk<A>,
      right: Chunk.Chunk<A2>
    ) => readonly [Chunk.Chunk<A3>, Either.Either<Chunk.Chunk<A>, Chunk.Chunk<A2>>]
  ): <R, E>(self: Stream<R, E, A>) => Stream<R2 | R, E2 | E, A3>
  <R, E, R2, E2, A2, A, A3>(
    self: Stream<R, E, A>,
    that: Stream<R2, E2, A2>,
    f: (
      left: Chunk.Chunk<A>,
      right: Chunk.Chunk<A2>
    ) => readonly [Chunk.Chunk<A3>, Either.Either<Chunk.Chunk<A>, Chunk.Chunk<A2>>]
  ): Stream<R | R2, E | E2, A3>
}
```

Added in v2.0.0

## zipWithIndex

Zips this stream together with the index of elements.

**Signature**

```ts
export declare const zipWithIndex: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, [A, number]>
```

Added in v2.0.0

## zipWithNext

Zips each element with the next element if present.

**Signature**

```ts
export declare const zipWithNext: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, [A, Option.Option<A>]>
```

Added in v2.0.0

## zipWithPrevious

Zips each element with the previous element. Initially accompanied by
`None`.

**Signature**

```ts
export declare const zipWithPrevious: <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, [Option.Option<A>, A]>
```

Added in v2.0.0

## zipWithPreviousAndNext

Zips each element with both the previous and next element.

**Signature**

```ts
export declare const zipWithPreviousAndNext: <R, E, A>(
  self: Stream<R, E, A>
) => Stream<R, E, [Option.Option<A>, A, Option.Option<A>]>
```

Added in v2.0.0
