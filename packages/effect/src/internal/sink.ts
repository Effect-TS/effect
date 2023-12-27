import * as Cause from "../Cause.js"
import type * as Channel from "../Channel.js"
import * as Chunk from "../Chunk.js"
import * as Clock from "../Clock.js"
import type * as Context from "../Context.js"
import * as Duration from "../Duration.js"
import * as Effect from "../Effect.js"
import * as Either from "../Either.js"
import * as Exit from "../Exit.js"
import { constTrue, dual, identity, pipe } from "../Function.js"
import type { LazyArg } from "../Function.js"
import * as HashMap from "../HashMap.js"
import * as HashSet from "../HashSet.js"
import type * as MergeDecision from "../MergeDecision.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty, type Predicate, type Refinement } from "../Predicate.js"
import * as PubSub from "../PubSub.js"
import * as Queue from "../Queue.js"
import * as ReadonlyArray from "../ReadonlyArray.js"
import * as Ref from "../Ref.js"
import type * as Scope from "../Scope.js"
import type * as Sink from "../Sink.js"
import * as channel from "./channel.js"
import * as mergeDecision from "./channel/mergeDecision.js"
import * as core from "./core-stream.js"

/** @internal */
export const SinkTypeId: Sink.SinkTypeId = Symbol.for("effect/Sink") as Sink.SinkTypeId

const sinkVariance = {
  /* c8 ignore next */
  _R: (_: never) => _,
  /* c8 ignore next */
  _E: (_: never) => _,
  /* c8 ignore next */
  _In: (_: unknown) => _,
  /* c8 ignore next */
  _L: (_: never) => _,
  /* c8 ignore next */
  _Z: (_: never) => _
}

/** @internal */
export class SinkImpl<out R, out E, in In, out L, out Z> implements Sink.Sink<R, E, In, L, Z> {
  readonly [SinkTypeId] = sinkVariance
  constructor(
    readonly channel: Channel.Channel<R, never, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<L>, Z>
  ) {
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const isSink = (u: unknown): u is Sink.Sink<unknown, unknown, unknown, unknown, unknown> =>
  hasProperty(u, SinkTypeId)

/** @internal */
export const suspend = <R, E, In, L, Z>(evaluate: LazyArg<Sink.Sink<R, E, In, L, Z>>): Sink.Sink<R, E, In, L, Z> =>
  new SinkImpl(core.suspend(() => toChannel(evaluate())))

/** @internal */
export const as = dual<
  <Z2>(z: Z2) => <R, E, In, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R, E, In, L, Z2>,
  <R, E, In, L, Z, Z2>(self: Sink.Sink<R, E, In, L, Z>, z: Z2) => Sink.Sink<R, E, In, L, Z2>
>(
  2,
  <R, E, In, L, Z, Z2>(self: Sink.Sink<R, E, In, L, Z>, z: Z2): Sink.Sink<R, E, In, L, Z2> => pipe(self, map(() => z))
)

/** @internal */
export const collectAll = <In>(): Sink.Sink<never, never, In, never, Chunk.Chunk<In>> =>
  new SinkImpl(collectAllLoop(Chunk.empty()))

/** @internal */
const collectAllLoop = <In>(
  acc: Chunk.Chunk<In>
): Channel.Channel<never, never, Chunk.Chunk<In>, unknown, never, never, Chunk.Chunk<In>> =>
  core.readWithCause({
    onInput: (chunk: Chunk.Chunk<In>) => collectAllLoop(pipe(acc, Chunk.appendAll(chunk))),
    onFailure: core.failCause,
    onDone: () => core.succeed(acc)
  })

/** @internal */
export const collectAllN = <In>(n: number): Sink.Sink<never, never, In, In, Chunk.Chunk<In>> =>
  suspend(() => fromChannel(collectAllNLoop(n, Chunk.empty())))

/** @internal */
const collectAllNLoop = <In>(
  n: number,
  acc: Chunk.Chunk<In>
): Channel.Channel<never, never, Chunk.Chunk<In>, unknown, never, Chunk.Chunk<In>, Chunk.Chunk<In>> =>
  core.readWithCause({
    onInput: (chunk: Chunk.Chunk<In>) => {
      const [collected, leftovers] = Chunk.splitAt(chunk, n)
      if (collected.length < n) {
        return collectAllNLoop(n - collected.length, Chunk.appendAll(acc, collected))
      }
      if (Chunk.isEmpty(leftovers)) {
        return core.succeed(Chunk.appendAll(acc, collected))
      }
      return core.flatMap(core.write(leftovers), () => core.succeed(Chunk.appendAll(acc, collected)))
    },
    onFailure: core.failCause,
    onDone: () => core.succeed(acc)
  })

/** @internal */
export const collectAllFrom = <R, E, In, L extends In, Z>(
  self: Sink.Sink<R, E, In, L, Z>
): Sink.Sink<R, E, In, L, Chunk.Chunk<Z>> =>
  collectAllWhileWith(self, {
    initial: Chunk.empty<Z>(),
    while: constTrue,
    body: (chunk, z) => pipe(chunk, Chunk.append(z))
  })

/** @internal */
export const collectAllToMap = <In, K>(
  key: (input: In) => K,
  merge: (x: In, y: In) => In
): Sink.Sink<never, never, In, never, HashMap.HashMap<K, In>> => {
  return pipe(
    foldLeftChunks(HashMap.empty<K, In>(), (map, chunk) =>
      pipe(
        chunk,
        Chunk.reduce(map, (map, input) => {
          const k: K = key(input)
          const v: In = pipe(map, HashMap.has(k)) ?
            merge(pipe(map, HashMap.unsafeGet(k)), input) :
            input
          return pipe(map, HashMap.set(k, v))
        })
      ))
  )
}

/** @internal */
export const collectAllToMapN = <In, K>(
  n: number,
  key: (input: In) => K,
  merge: (x: In, y: In) => In
): Sink.Sink<never, never, In, In, HashMap.HashMap<K, In>> => {
  return foldWeighted<HashMap.HashMap<K, In>, In>({
    initial: HashMap.empty(),
    maxCost: n,
    cost: (acc, input) => pipe(acc, HashMap.has(key(input))) ? 0 : 1,
    body: (acc, input) => {
      const k: K = key(input)
      const v: In = pipe(acc, HashMap.has(k)) ?
        merge(pipe(acc, HashMap.unsafeGet(k)), input) :
        input
      return pipe(acc, HashMap.set(k, v))
    }
  })
}

/** @internal */
export const collectAllToSet = <In>(): Sink.Sink<never, never, In, never, HashSet.HashSet<In>> =>
  foldLeftChunks<HashSet.HashSet<In>, In>(
    HashSet.empty(),
    (acc, chunk) => pipe(chunk, Chunk.reduce(acc, (acc, input) => pipe(acc, HashSet.add(input))))
  )

/** @internal */
export const collectAllToSetN = <In>(n: number): Sink.Sink<never, never, In, In, HashSet.HashSet<In>> =>
  foldWeighted<HashSet.HashSet<In>, In>({
    initial: HashSet.empty(),
    maxCost: n,
    cost: (acc, input) => HashSet.has(acc, input) ? 0 : 1,
    body: (acc, input) => HashSet.add(acc, input)
  })

/** @internal */
export const collectAllUntil = <In>(p: Predicate<In>): Sink.Sink<never, never, In, In, Chunk.Chunk<In>> => {
  return pipe(
    fold<[Chunk.Chunk<In>, boolean], In>(
      [Chunk.empty(), true],
      (tuple) => tuple[1],
      ([chunk, _], input) => [pipe(chunk, Chunk.append(input)), !p(input)]
    ),
    map((tuple) => tuple[0])
  )
}

/** @internal */
export const collectAllUntilEffect = <In, R, E>(p: (input: In) => Effect.Effect<R, E, boolean>) => {
  return pipe(
    foldEffect<[Chunk.Chunk<In>, boolean], R, E, In>(
      [Chunk.empty(), true],
      (tuple) => tuple[1],
      ([chunk, _], input) => pipe(p(input), Effect.map((bool) => [pipe(chunk, Chunk.append(input)), !bool]))
    ),
    map((tuple) => tuple[0])
  )
}

/** @internal */
export const collectAllWhile: {
  <In, Out extends In>(refinement: Refinement<In, Out>): Sink.Sink<never, never, In, In, Chunk.Chunk<Out>>
  <In>(predicate: Predicate<In>): Sink.Sink<never, never, In, In, Chunk.Chunk<In>>
} = <In>(predicate: Predicate<In>): Sink.Sink<never, never, In, In, Chunk.Chunk<In>> =>
  fromChannel(collectAllWhileReader(predicate, Chunk.empty()))

/** @internal */
const collectAllWhileReader = <In>(
  predicate: Predicate<In>,
  done: Chunk.Chunk<In>
): Channel.Channel<never, never, Chunk.Chunk<In>, unknown, never, Chunk.Chunk<In>, Chunk.Chunk<In>> =>
  core.readWith({
    onInput: (input: Chunk.Chunk<In>) => {
      const [collected, leftovers] = pipe(Chunk.toReadonlyArray(input), ReadonlyArray.span(predicate))
      if (leftovers.length === 0) {
        return collectAllWhileReader(
          predicate,
          pipe(done, Chunk.appendAll(Chunk.unsafeFromArray(collected)))
        )
      }
      return pipe(
        core.write(Chunk.unsafeFromArray(leftovers)),
        channel.zipRight(core.succeed(pipe(done, Chunk.appendAll(Chunk.unsafeFromArray(collected)))))
      )
    },
    onFailure: core.fail,
    onDone: () => core.succeed(done)
  })

/** @internal */
export const collectAllWhileEffect = <In, R, E>(
  predicate: (input: In) => Effect.Effect<R, E, boolean>
): Sink.Sink<R, E, In, In, Chunk.Chunk<In>> => fromChannel(collectAllWhileEffectReader(predicate, Chunk.empty()))

/** @internal */
const collectAllWhileEffectReader = <In, R, E>(
  predicate: (input: In) => Effect.Effect<R, E, boolean>,
  done: Chunk.Chunk<In>
): Channel.Channel<R, never, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<In>, Chunk.Chunk<In>> =>
  core.readWith({
    onInput: (input: Chunk.Chunk<In>) =>
      pipe(
        core.fromEffect(pipe(input, Effect.takeWhile(predicate), Effect.map(Chunk.unsafeFromArray))),
        core.flatMap((collected) => {
          const leftovers = pipe(input, Chunk.drop(collected.length))
          if (Chunk.isEmpty(leftovers)) {
            return collectAllWhileEffectReader(predicate, pipe(done, Chunk.appendAll(collected)))
          }
          return pipe(core.write(leftovers), channel.zipRight(core.succeed(pipe(done, Chunk.appendAll(collected)))))
        })
      ),
    onFailure: core.fail,
    onDone: () => core.succeed(done)
  })

/** @internal */
export const collectAllWhileWith = dual<
  <Z, S>(
    options: {
      readonly initial: S
      readonly while: Predicate<Z>
      readonly body: (s: S, z: Z) => S
    }
  ) => <R, E, In, L extends In>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R, E, In, L, S>,
  <R, E, In, L extends In, Z, S>(
    self: Sink.Sink<R, E, In, L, Z>,
    options: {
      readonly initial: S
      readonly while: Predicate<Z>
      readonly body: (s: S, z: Z) => S
    }
  ) => Sink.Sink<R, E, In, L, S>
>(
  2,
  <R, E, In, L extends In, Z, S>(
    self: Sink.Sink<R, E, In, L, Z>,
    options: {
      readonly initial: S
      readonly while: Predicate<Z>
      readonly body: (s: S, z: Z) => S
    }
  ): Sink.Sink<R, E, In, L, S> => {
    const refs = pipe(
      Ref.make(Chunk.empty<In>()),
      Effect.zip(Ref.make(false))
    )
    const newChannel = pipe(
      core.fromEffect(refs),
      core.flatMap(([leftoversRef, upstreamDoneRef]) => {
        const upstreamMarker: Channel.Channel<never, never, Chunk.Chunk<In>, unknown, never, Chunk.Chunk<In>, unknown> =
          core.readWith({
            onInput: (input) => pipe(core.write(input), core.flatMap(() => upstreamMarker)),
            onFailure: core.fail,
            onDone: (done) => pipe(core.fromEffect(Ref.set(upstreamDoneRef, true)), channel.as(done))
          })
        return pipe(
          upstreamMarker,
          core.pipeTo(channel.bufferChunk(leftoversRef)),
          core.pipeTo(
            collectAllWhileWithLoop(self, leftoversRef, upstreamDoneRef, options.initial, options.while, options.body)
          )
        )
      })
    )
    return new SinkImpl(newChannel)
  }
)

/** @internal */
const collectAllWhileWithLoop = <R, E, In, L extends In, Z, S>(
  self: Sink.Sink<R, E, In, L, Z>,
  leftoversRef: Ref.Ref<Chunk.Chunk<In>>,
  upstreamDoneRef: Ref.Ref<boolean>,
  currentResult: S,
  p: Predicate<Z>,
  f: (s: S, z: Z) => S
): Channel.Channel<R, never, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<L>, S> => {
  return pipe(
    toChannel(self),
    channel.doneCollect,
    channel.foldChannel({
      onFailure: core.fail,
      onSuccess: ([leftovers, doneValue]) =>
        p(doneValue)
          ? pipe(
            core.fromEffect(
              Ref.set(leftoversRef, Chunk.flatten(leftovers as Chunk.Chunk<Chunk.Chunk<In>>))
            ),
            core.flatMap(() =>
              pipe(
                core.fromEffect(Ref.get(upstreamDoneRef)),
                core.flatMap((upstreamDone) => {
                  const accumulatedResult = f(currentResult, doneValue)
                  return upstreamDone
                    ? pipe(core.write(Chunk.flatten(leftovers)), channel.as(accumulatedResult))
                    : collectAllWhileWithLoop(self, leftoversRef, upstreamDoneRef, accumulatedResult, p, f)
                })
              )
            )
          )
          : pipe(core.write(Chunk.flatten(leftovers)), channel.as(currentResult))
    })
  )
}

/** @internal */
export const collectLeftover = <R, E, In, L, Z>(
  self: Sink.Sink<R, E, In, L, Z>
): Sink.Sink<R, E, In, never, [Z, Chunk.Chunk<L>]> =>
  new SinkImpl(pipe(core.collectElements(toChannel(self)), channel.map(([chunks, z]) => [z, Chunk.flatten(chunks)])))

/** @internal */
export const mapInput = dual<
  <In0, In>(f: (input: In0) => In) => <R, E, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R, E, In0, L, Z>,
  <R, E, L, Z, In0, In>(self: Sink.Sink<R, E, In, L, Z>, f: (input: In0) => In) => Sink.Sink<R, E, In0, L, Z>
>(
  2,
  <R, E, L, Z, In0, In>(self: Sink.Sink<R, E, In, L, Z>, f: (input: In0) => In): Sink.Sink<R, E, In0, L, Z> =>
    pipe(self, mapInputChunks(Chunk.map(f)))
)

/** @internal */
export const mapInputEffect = dual<
  <In0, R2, E2, In>(
    f: (input: In0) => Effect.Effect<R2, E2, In>
  ) => <R, E, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R, E2 | E, In0, L, Z>,
  <R, E, L, Z, In0, R2, E2, In>(
    self: Sink.Sink<R, E, In, L, Z>,
    f: (input: In0) => Effect.Effect<R2, E2, In>
  ) => Sink.Sink<R2 | R, E2 | E, In0, L, Z>
>(
  2,
  <R, E, L, Z, In0, R2, E2, In>(
    self: Sink.Sink<R, E, In, L, Z>,
    f: (input: In0) => Effect.Effect<R2, E2, In>
  ): Sink.Sink<R | R2, E | E2, In0, L, Z> =>
    mapInputChunksEffect(
      self,
      (chunk) =>
        Effect.map(
          Effect.forEach(chunk, (v) => f(v)),
          Chunk.unsafeFromArray
        )
    )
)

/** @internal */
export const mapInputChunks = dual<
  <In0, In>(
    f: (chunk: Chunk.Chunk<In0>) => Chunk.Chunk<In>
  ) => <R, E, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R, E, In0, L, Z>,
  <R, E, L, Z, In0, In>(
    self: Sink.Sink<R, E, In, L, Z>,
    f: (chunk: Chunk.Chunk<In0>) => Chunk.Chunk<In>
  ) => Sink.Sink<R, E, In0, L, Z>
>(
  2,
  <R, E, L, Z, In0, In>(
    self: Sink.Sink<R, E, In, L, Z>,
    f: (chunk: Chunk.Chunk<In0>) => Chunk.Chunk<In>
  ): Sink.Sink<R, E, In0, L, Z> => {
    const loop: Channel.Channel<R, never, Chunk.Chunk<In0>, unknown, never, Chunk.Chunk<In>, unknown> = core.readWith({
      onInput: (chunk) => pipe(core.write(f(chunk)), core.flatMap(() => loop)),
      onFailure: core.fail,
      onDone: core.succeed
    })
    return new SinkImpl(pipe(loop, core.pipeTo(toChannel(self))))
  }
)

/** @internal */
export const mapInputChunksEffect = dual<
  <In0, R2, E2, In>(
    f: (chunk: Chunk.Chunk<In0>) => Effect.Effect<R2, E2, Chunk.Chunk<In>>
  ) => <R, E, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R, E2 | E, In0, L, Z>,
  <R, E, L, Z, In0, R2, E2, In>(
    self: Sink.Sink<R, E, In, L, Z>,
    f: (chunk: Chunk.Chunk<In0>) => Effect.Effect<R2, E2, Chunk.Chunk<In>>
  ) => Sink.Sink<R2 | R, E2 | E, In0, L, Z>
>(
  2,
  <R, E, L, Z, In0, R2, E2, In>(
    self: Sink.Sink<R, E, In, L, Z>,
    f: (chunk: Chunk.Chunk<In0>) => Effect.Effect<R2, E2, Chunk.Chunk<In>>
  ): Sink.Sink<R | R2, E | E2, In0, L, Z> => {
    const loop: Channel.Channel<R | R2, never, Chunk.Chunk<In0>, unknown, E2, Chunk.Chunk<In>, unknown> = core
      .readWith({
        onInput: (chunk) => pipe(core.fromEffect(f(chunk)), core.flatMap(core.write), core.flatMap(() => loop)),
        onFailure: core.fail,
        onDone: core.succeed
      })
    return new SinkImpl(pipe(loop, channel.pipeToOrFail(toChannel(self))))
  }
)

/** @internal */
export const die = (defect: unknown): Sink.Sink<never, never, unknown, never, never> => failCause(Cause.die(defect))

/** @internal */
export const dieMessage = (message: string): Sink.Sink<never, never, unknown, never, never> =>
  failCause(Cause.die(new Cause.RuntimeException(message)))

/** @internal */
export const dieSync = (evaluate: LazyArg<unknown>): Sink.Sink<never, never, unknown, never, never> =>
  failCauseSync(() => Cause.die(evaluate()))

/** @internal */
export const dimap = dual<
  <In0, In, Z, Z2>(
    options: {
      readonly onInput: (input: In0) => In
      readonly onDone: (z: Z) => Z2
    }
  ) => <R, E, L>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R, E, In0, L, Z2>,
  <R, E, L, In0, In, Z, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    options: {
      readonly onInput: (input: In0) => In
      readonly onDone: (z: Z) => Z2
    }
  ) => Sink.Sink<R, E, In0, L, Z2>
>(
  2,
  <R, E, L, In0, In, Z, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    options: {
      readonly onInput: (input: In0) => In
      readonly onDone: (z: Z) => Z2
    }
  ): Sink.Sink<R, E, In0, L, Z2> => map(mapInput(self, options.onInput), options.onDone)
)

/** @internal */
export const dimapEffect = dual<
  <In0, R2, E2, In, Z, R3, E3, Z2>(
    options: {
      readonly onInput: (input: In0) => Effect.Effect<R2, E2, In>
      readonly onDone: (z: Z) => Effect.Effect<R3, E3, Z2>
    }
  ) => <R, E, L>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R3 | R, E2 | E3 | E, In0, L, Z2>,
  <R, E, L, In0, R2, E2, In, Z, R3, E3, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    options: {
      readonly onInput: (input: In0) => Effect.Effect<R2, E2, In>
      readonly onDone: (z: Z) => Effect.Effect<R3, E3, Z2>
    }
  ) => Sink.Sink<R2 | R3 | R, E2 | E3 | E, In0, L, Z2>
>(
  2,
  <R, E, L, In0, R2, E2, In, Z, R3, E3, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    options: {
      readonly onInput: (input: In0) => Effect.Effect<R2, E2, In>
      readonly onDone: (z: Z) => Effect.Effect<R3, E3, Z2>
    }
  ): Sink.Sink<R | R2 | R3, E | E2 | E3, In0, L, Z2> =>
    mapEffect(
      mapInputEffect(self, options.onInput),
      options.onDone
    )
)

/** @internal */
export const dimapChunks = dual<
  <In0, In, Z, Z2>(
    options: {
      readonly onInput: (chunk: Chunk.Chunk<In0>) => Chunk.Chunk<In>
      readonly onDone: (z: Z) => Z2
    }
  ) => <R, E, L>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R, E, In0, L, Z2>,
  <R, E, L, In0, In, Z, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    options: {
      readonly onInput: (chunk: Chunk.Chunk<In0>) => Chunk.Chunk<In>
      readonly onDone: (z: Z) => Z2
    }
  ) => Sink.Sink<R, E, In0, L, Z2>
>(
  2,
  <R, E, L, In0, In, Z, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    options: {
      readonly onInput: (chunk: Chunk.Chunk<In0>) => Chunk.Chunk<In>
      readonly onDone: (z: Z) => Z2
    }
  ): Sink.Sink<R, E, In0, L, Z2> =>
    map(
      mapInputChunks(self, options.onInput),
      options.onDone
    )
)

/** @internal */
export const dimapChunksEffect = dual<
  <In0, R2, E2, In, Z, R3, E3, Z2>(
    options: {
      readonly onInput: (chunk: Chunk.Chunk<In0>) => Effect.Effect<R2, E2, Chunk.Chunk<In>>
      readonly onDone: (z: Z) => Effect.Effect<R3, E3, Z2>
    }
  ) => <R, E, L>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R3 | R, E2 | E3 | E, In0, L, Z2>,
  <R, E, L, In0, R2, E2, In, Z, R3, E3, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    options: {
      readonly onInput: (chunk: Chunk.Chunk<In0>) => Effect.Effect<R2, E2, Chunk.Chunk<In>>
      readonly onDone: (z: Z) => Effect.Effect<R3, E3, Z2>
    }
  ) => Sink.Sink<R2 | R3 | R, E2 | E3 | E, In0, L, Z2>
>(
  2,
  <R, E, L, In0, R2, E2, In, Z, R3, E3, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    options: {
      readonly onInput: (chunk: Chunk.Chunk<In0>) => Effect.Effect<R2, E2, Chunk.Chunk<In>>
      readonly onDone: (z: Z) => Effect.Effect<R3, E3, Z2>
    }
  ): Sink.Sink<R | R2 | R3, E | E2 | E3, In0, L, Z2> =>
    mapEffect(mapInputChunksEffect(self, options.onInput), options.onDone)
)

/** @internal */
export const drain: Sink.Sink<never, never, unknown, never, void> = new SinkImpl(
  channel.drain(channel.identityChannel<never, unknown, unknown>())
)

/** @internal */
export const drop = <In>(n: number): Sink.Sink<never, never, In, In, unknown> =>
  suspend(() => new SinkImpl(dropLoop(n)))

/** @internal */
const dropLoop = <In>(
  n: number
): Channel.Channel<never, never, Chunk.Chunk<In>, unknown, never, Chunk.Chunk<In>, unknown> =>
  core.readWith({
    onInput: (input: Chunk.Chunk<In>) => {
      const dropped = pipe(input, Chunk.drop(n))
      const leftover = Math.max(n - input.length, 0)
      const more = Chunk.isEmpty(input) || leftover > 0
      if (more) {
        return dropLoop(leftover)
      }
      return pipe(
        core.write(dropped),
        channel.zipRight(channel.identityChannel<never, Chunk.Chunk<In>, unknown>())
      )
    },
    onFailure: core.fail,
    onDone: () => core.unit
  })

/** @internal */
export const dropUntil = <In>(predicate: Predicate<In>): Sink.Sink<never, never, In, In, unknown> =>
  new SinkImpl(
    pipe(toChannel(dropWhile((input: In) => !predicate(input))), channel.pipeToOrFail(toChannel(drop<In>(1))))
  )

/** @internal */
export const dropUntilEffect = <In, R, E>(
  predicate: (input: In) => Effect.Effect<R, E, boolean>
): Sink.Sink<R, E, In, In, unknown> => suspend(() => new SinkImpl(dropUntilEffectReader(predicate)))

/** @internal */
const dropUntilEffectReader = <In, R, E>(
  predicate: (input: In) => Effect.Effect<R, E, boolean>
): Channel.Channel<R, E, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<In>, unknown> =>
  core.readWith({
    onInput: (input: Chunk.Chunk<In>) =>
      pipe(
        input,
        Effect.dropUntil(predicate),
        Effect.map((leftover) => {
          const more = leftover.length === 0
          return more ?
            dropUntilEffectReader(predicate) :
            pipe(
              core.write(Chunk.unsafeFromArray(leftover)),
              channel.zipRight(channel.identityChannel<E, Chunk.Chunk<In>, unknown>())
            )
        }),
        channel.unwrap
      ),
    onFailure: core.fail,
    onDone: () => core.unit
  })

/** @internal */
export const dropWhile = <In>(predicate: Predicate<In>): Sink.Sink<never, never, In, In, unknown> =>
  new SinkImpl(dropWhileReader(predicate))

/** @internal */
const dropWhileReader = <In>(
  predicate: Predicate<In>
): Channel.Channel<never, never, Chunk.Chunk<In>, unknown, never, Chunk.Chunk<In>, unknown> =>
  core.readWith({
    onInput: (input: Chunk.Chunk<In>) => {
      const out = pipe(input, Chunk.dropWhile(predicate))
      if (Chunk.isEmpty(out)) {
        return dropWhileReader(predicate)
      }
      return pipe(core.write(out), channel.zipRight(channel.identityChannel<never, Chunk.Chunk<In>, unknown>()))
    },
    onFailure: core.fail,
    onDone: core.succeedNow
  })

/** @internal */
export const dropWhileEffect = <In, R, E>(
  predicate: (input: In) => Effect.Effect<R, E, boolean>
): Sink.Sink<R, E, In, In, unknown> => suspend(() => new SinkImpl(dropWhileEffectReader(predicate)))

/** @internal */
const dropWhileEffectReader = <In, R, E>(
  predicate: (input: In) => Effect.Effect<R, E, boolean>
): Channel.Channel<R, E, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<In>, unknown> =>
  core.readWith({
    onInput: (input: Chunk.Chunk<In>) =>
      pipe(
        input,
        Effect.dropWhile(predicate),
        Effect.map((leftover) => {
          const more = leftover.length === 0
          return more ?
            dropWhileEffectReader(predicate) :
            pipe(
              core.write(Chunk.unsafeFromArray(leftover)),
              channel.zipRight(channel.identityChannel<E, Chunk.Chunk<In>, unknown>())
            )
        }),
        channel.unwrap
      ),
    onFailure: core.fail,
    onDone: () => core.unit
  })

/** @internal */
export const ensuring = dual<
  <R2, _>(
    finalizer: Effect.Effect<R2, never, _>
  ) => <R, E, In, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R, E, In, L, Z>,
  <R, E, In, L, Z, R2, _>(
    self: Sink.Sink<R, E, In, L, Z>,
    finalizer: Effect.Effect<R2, never, _>
  ) => Sink.Sink<R2 | R, E, In, L, Z>
>(
  2,
  <R, E, In, L, Z, R2, _>(
    self: Sink.Sink<R, E, In, L, Z>,
    finalizer: Effect.Effect<R2, never, _>
  ): Sink.Sink<R | R2, E, In, L, Z> => new SinkImpl(pipe(self, toChannel, channel.ensuring(finalizer)))
)

/** @internal */
export const ensuringWith = dual<
  <E, Z, R2, _>(
    finalizer: (exit: Exit.Exit<E, Z>) => Effect.Effect<R2, never, _>
  ) => <R, In, L>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R, E, In, L, Z>,
  <R, In, L, E, Z, R2, _>(
    self: Sink.Sink<R, E, In, L, Z>,
    finalizer: (exit: Exit.Exit<E, Z>) => Effect.Effect<R2, never, _>
  ) => Sink.Sink<R2 | R, E, In, L, Z>
>(
  2,
  <R, In, L, E, Z, R2, _>(
    self: Sink.Sink<R, E, In, L, Z>,
    finalizer: (exit: Exit.Exit<E, Z>) => Effect.Effect<R2, never, _>
  ): Sink.Sink<R | R2, E, In, L, Z> => new SinkImpl(pipe(self, toChannel, core.ensuringWith(finalizer)))
)

/** @internal */
export const context = <R>(): Sink.Sink<R, never, unknown, never, Context.Context<R>> => fromEffect(Effect.context<R>())

/** @internal */
export const contextWith = <R, Z>(
  f: (context: Context.Context<R>) => Z
): Sink.Sink<R, never, unknown, never, Z> => pipe(context<R>(), map(f))

/** @internal */
export const contextWithEffect = <R0, R, E, Z>(
  f: (context: Context.Context<R0>) => Effect.Effect<R, E, Z>
): Sink.Sink<R0 | R, E, unknown, never, Z> => pipe(context<R0>(), mapEffect(f))

/** @internal */
export const contextWithSink = <R0, R, E, In, L, Z>(
  f: (context: Context.Context<R0>) => Sink.Sink<R, E, In, L, Z>
): Sink.Sink<R0 | R, E, In, L, Z> =>
  new SinkImpl(channel.unwrap(pipe(Effect.contextWith((context) => toChannel(f(context))))))

/** @internal */
export const every = <In>(predicate: Predicate<In>): Sink.Sink<never, never, In, In, boolean> =>
  fold(true, identity, (acc, input) => acc && predicate(input))

/** @internal */
export const fail = <E>(e: E): Sink.Sink<never, E, unknown, never, never> => new SinkImpl(core.fail(e))

/** @internal */
export const failSync = <E>(evaluate: LazyArg<E>): Sink.Sink<never, E, unknown, never, never> =>
  new SinkImpl(core.failSync(evaluate))

/** @internal */
export const failCause = <E>(cause: Cause.Cause<E>): Sink.Sink<never, E, unknown, never, never> =>
  new SinkImpl(core.failCause(cause))

/** @internal */
export const failCauseSync = <E>(evaluate: LazyArg<Cause.Cause<E>>): Sink.Sink<never, E, unknown, never, never> =>
  new SinkImpl(core.failCauseSync(evaluate))

/** @internal */
export const filterInput: {
  <In, In1 extends In, In2 extends In1>(
    f: Refinement<In1, In2>
  ): <R, E, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R, E, In2, L, Z>
  <In, In1 extends In>(f: Predicate<In1>): <R, E, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R, E, In1, L, Z>
} = <In, In1 extends In>(f: Predicate<In1>) => {
  return <R, E, L, Z>(self: Sink.Sink<R, E, In, L, Z>): Sink.Sink<R, E, In1, L, Z> =>
    pipe(self, mapInputChunks(Chunk.filter(f)))
}

/** @internal */
export const filterInputEffect = dual<
  <R2, E2, In, In1 extends In>(
    f: (input: In1) => Effect.Effect<R2, E2, boolean>
  ) => <R, E, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R, E2 | E, In1, L, Z>,
  <R, E, L, Z, R2, E2, In, In1 extends In>(
    self: Sink.Sink<R, E, In, L, Z>,
    f: (input: In1) => Effect.Effect<R2, E2, boolean>
  ) => Sink.Sink<R2 | R, E2 | E, In1, L, Z>
>(
  2,
  <R, E, L, Z, R2, E2, In, In1 extends In>(
    self: Sink.Sink<R, E, In, L, Z>,
    f: (input: In1) => Effect.Effect<R2, E2, boolean>
  ): Sink.Sink<R | R2, E | E2, In1, L, Z> =>
    mapInputChunksEffect(
      self,
      (chunk) => Effect.map(Effect.filter(chunk, f), Chunk.unsafeFromArray)
    )
)

/** @internal */
export const findEffect = dual<
  <Z, R2, E2>(
    f: (z: Z) => Effect.Effect<R2, E2, boolean>
  ) => <R, E, In, L extends In>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R, E2 | E, In, L, Option.Option<Z>>,
  <R, E, In, L extends In, Z, R2, E2>(
    self: Sink.Sink<R, E, In, L, Z>,
    f: (z: Z) => Effect.Effect<R2, E2, boolean>
  ) => Sink.Sink<R2 | R, E2 | E, In, L, Option.Option<Z>>
>(
  2,
  <R, E, In, L extends In, Z, R2, E2>(
    self: Sink.Sink<R, E, In, L, Z>,
    f: (z: Z) => Effect.Effect<R2, E2, boolean>
  ): Sink.Sink<R | R2, E | E2, In, L, Option.Option<Z>> => {
    const newChannel = pipe(
      core.fromEffect(pipe(
        Ref.make(Chunk.empty<In>()),
        Effect.zip(Ref.make(false))
      )),
      core.flatMap(([leftoversRef, upstreamDoneRef]) => {
        const upstreamMarker: Channel.Channel<never, never, Chunk.Chunk<In>, unknown, never, Chunk.Chunk<In>, unknown> =
          core.readWith({
            onInput: (input) => pipe(core.write(input), core.flatMap(() => upstreamMarker)),
            onFailure: core.fail,
            onDone: (done) => pipe(core.fromEffect(Ref.set(upstreamDoneRef, true)), channel.as(done))
          })
        const loop: Channel.Channel<R | R2, never, Chunk.Chunk<In>, unknown, E | E2, Chunk.Chunk<L>, Option.Option<Z>> =
          channel.foldChannel(core.collectElements(toChannel(self)), {
            onFailure: core.fail,
            onSuccess: ([leftovers, doneValue]) =>
              pipe(
                core.fromEffect(f(doneValue)),
                core.flatMap((satisfied) =>
                  pipe(
                    core.fromEffect(Ref.set(leftoversRef, Chunk.flatten(leftovers))),
                    channel.zipRight(
                      pipe(
                        core.fromEffect(Ref.get(upstreamDoneRef)),
                        core.flatMap((upstreamDone) => {
                          if (satisfied) {
                            return pipe(core.write(Chunk.flatten(leftovers)), channel.as(Option.some(doneValue)))
                          }
                          if (upstreamDone) {
                            return pipe(core.write(Chunk.flatten(leftovers)), channel.as(Option.none()))
                          }
                          return loop
                        })
                      )
                    )
                  )
                )
              )
          })
        return pipe(upstreamMarker, core.pipeTo(channel.bufferChunk(leftoversRef)), core.pipeTo(loop))
      })
    )
    return new SinkImpl(newChannel)
  }
)

/** @internal */
export const fold = <S, In>(
  s: S,
  contFn: Predicate<S>,
  f: (z: S, input: In) => S
): Sink.Sink<never, never, In, In, S> => suspend(() => new SinkImpl(foldReader(s, contFn, f)))

/** @internal */
const foldReader = <S, In>(
  s: S,
  contFn: Predicate<S>,
  f: (z: S, input: In) => S
): Channel.Channel<never, never, Chunk.Chunk<In>, unknown, never, Chunk.Chunk<In>, S> => {
  if (!contFn(s)) {
    return core.succeedNow(s)
  }
  return core.readWith({
    onInput: (input: Chunk.Chunk<In>) => {
      const [nextS, leftovers] = foldChunkSplit(s, input, contFn, f, 0, input.length)
      if (Chunk.isNonEmpty(leftovers)) {
        return pipe(core.write(leftovers), channel.as(nextS))
      }
      return foldReader(nextS, contFn, f)
    },
    onFailure: core.fail,
    onDone: () => core.succeedNow(s)
  })
}

/** @internal */
const foldChunkSplit = <S, In>(
  s: S,
  chunk: Chunk.Chunk<In>,
  contFn: Predicate<S>,
  f: (z: S, input: In) => S,
  index: number,
  length: number
): [S, Chunk.Chunk<In>] => {
  if (index === length) {
    return [s, Chunk.empty()]
  }
  const s1 = f(s, pipe(chunk, Chunk.unsafeGet(index)))
  if (contFn(s1)) {
    return foldChunkSplit(s1, chunk, contFn, f, index + 1, length)
  }
  return [s1, pipe(chunk, Chunk.drop(index + 1))]
}

/** @internal */
export const foldSink = dual<
  <R1, R2, E, E1, E2, In, In1 extends In, In2 extends In, L, L1, L2, Z, Z1, Z2>(
    options: {
      readonly onFailure: (err: E) => Sink.Sink<R1, E1, In1, L1, Z1>
      readonly onSuccess: (z: Z) => Sink.Sink<R2, E2, In2, L2, Z2>
    }
  ) => <R>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R1 | R2 | R, E1 | E2, In1 & In2, L1 | L2, Z1 | Z2>,
  <R, R1, R2, E, E1, E2, In, In1 extends In, In2 extends In, L, L1, L2, Z, Z1, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    options: {
      readonly onFailure: (err: E) => Sink.Sink<R1, E1, In1, L1, Z1>
      readonly onSuccess: (z: Z) => Sink.Sink<R2, E2, In2, L2, Z2>
    }
  ) => Sink.Sink<R1 | R2 | R, E1 | E2, In1 & In2, L1 | L2, Z1 | Z2>
>(
  2,
  <R, R1, R2, E, E1, E2, In, In1 extends In, In2 extends In, L, L1, L2, Z, Z1, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    options: {
      readonly onFailure: (err: E) => Sink.Sink<R1, E1, In1, L1, Z1>
      readonly onSuccess: (z: Z) => Sink.Sink<R2, E2, In2, L2, Z2>
    }
  ): Sink.Sink<R | R1 | R2, E1 | E2, In1 & In2, L1 | L2, Z1 | Z2> => {
    const newChannel: Channel.Channel<
      R | R1 | R2,
      never,
      Chunk.Chunk<In1 & In2>,
      unknown,
      E1 | E2,
      Chunk.Chunk<L1 | L2>,
      Z1 | Z2
    > = pipe(
      toChannel(self),
      core.collectElements,
      channel.foldChannel({
        onFailure: (error) => toChannel(options.onFailure(error)),
        onSuccess: ([leftovers, z]) =>
          core.suspend(() => {
            const leftoversRef = {
              ref: pipe(leftovers, Chunk.filter(Chunk.isNonEmpty)) as Chunk.Chunk<Chunk.Chunk<L1 | L2>>
            }
            const refReader = pipe(
              core.sync(() => {
                const ref = leftoversRef.ref
                leftoversRef.ref = Chunk.empty()
                return ref
              }),
              // This cast is safe because of the L1 >: L <: In1 bound. It follows that
              // L <: In1 and therefore Chunk[L] can be safely cast to Chunk[In1].
              core.flatMap((chunk) => channel.writeChunk(chunk as Chunk.Chunk<Chunk.Chunk<In1 & In2>>))
            )
            const passthrough = channel.identityChannel<never, Chunk.Chunk<In1 & In2>, unknown>()
            const continuationSink = pipe(
              refReader,
              channel.zipRight(passthrough),
              core.pipeTo(toChannel(options.onSuccess(z)))
            )
            return core.flatMap(
              core.collectElements(continuationSink),
              ([newLeftovers, z1]) =>
                pipe(
                  core.succeed(leftoversRef.ref),
                  core.flatMap(channel.writeChunk),
                  channel.zipRight(channel.writeChunk(newLeftovers)),
                  channel.as(z1)
                )
            )
          })
      })
    )
    return new SinkImpl(newChannel)
  }
)

/** @internal */
export const foldChunks = <S, In>(
  s: S,
  contFn: Predicate<S>,
  f: (s: S, chunk: Chunk.Chunk<In>) => S
): Sink.Sink<never, never, In, never, S> => suspend(() => new SinkImpl(foldChunksReader(s, contFn, f)))

/** @internal */
const foldChunksReader = <S, In>(
  s: S,
  contFn: Predicate<S>,
  f: (s: S, chunk: Chunk.Chunk<In>) => S
): Channel.Channel<never, never, Chunk.Chunk<In>, unknown, never, never, S> => {
  if (!contFn(s)) {
    return core.succeedNow(s)
  }
  return core.readWith({
    onInput: (input: Chunk.Chunk<In>) => foldChunksReader(f(s, input), contFn, f),
    onFailure: core.fail,
    onDone: () => core.succeedNow(s)
  })
}

/** @internal */
export const foldChunksEffect = <S, R, E, In>(
  s: S,
  contFn: Predicate<S>,
  f: (s: S, chunk: Chunk.Chunk<In>) => Effect.Effect<R, E, S>
): Sink.Sink<R, E, In, In, S> => suspend(() => new SinkImpl(foldChunksEffectReader(s, contFn, f)))

/** @internal */
const foldChunksEffectReader = <S, R, E, In>(
  s: S,
  contFn: Predicate<S>,
  f: (s: S, chunk: Chunk.Chunk<In>) => Effect.Effect<R, E, S>
): Channel.Channel<R, E, Chunk.Chunk<In>, unknown, E, never, S> => {
  if (!contFn(s)) {
    return core.succeedNow(s)
  }
  return core.readWith({
    onInput: (input: Chunk.Chunk<In>) =>
      pipe(
        core.fromEffect(f(s, input)),
        core.flatMap((s) => foldChunksEffectReader(s, contFn, f))
      ),
    onFailure: core.fail,
    onDone: () => core.succeedNow(s)
  })
}

/** @internal */
export const foldEffect = <S, R, E, In>(
  s: S,
  contFn: Predicate<S>,
  f: (s: S, input: In) => Effect.Effect<R, E, S>
): Sink.Sink<R, E, In, In, S> => suspend(() => new SinkImpl(foldEffectReader(s, contFn, f)))

/** @internal */
const foldEffectReader = <S, In, R, E>(
  s: S,
  contFn: Predicate<S>,
  f: (s: S, input: In) => Effect.Effect<R, E, S>
): Channel.Channel<R, E, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<In>, S> => {
  if (!contFn(s)) {
    return core.succeedNow(s)
  }
  return core.readWith({
    onInput: (input: Chunk.Chunk<In>) =>
      pipe(
        core.fromEffect(foldChunkSplitEffect(s, input, contFn, f)),
        core.flatMap(([nextS, leftovers]) =>
          pipe(
            leftovers,
            Option.match({
              onNone: () => foldEffectReader(nextS, contFn, f),
              onSome: (leftover) => pipe(core.write(leftover), channel.as(nextS))
            })
          )
        )
      ),
    onFailure: core.fail,
    onDone: () => core.succeedNow(s)
  })
}

/** @internal */
const foldChunkSplitEffect = <S, R, E, In>(
  s: S,
  chunk: Chunk.Chunk<In>,
  contFn: Predicate<S>,
  f: (s: S, input: In) => Effect.Effect<R, E, S>
): Effect.Effect<R, E, [S, Option.Option<Chunk.Chunk<In>>]> =>
  foldChunkSplitEffectInternal(s, chunk, 0, chunk.length, contFn, f)

/** @internal */
const foldChunkSplitEffectInternal = <S, R, E, In>(
  s: S,
  chunk: Chunk.Chunk<In>,
  index: number,
  length: number,
  contFn: Predicate<S>,
  f: (s: S, input: In) => Effect.Effect<R, E, S>
): Effect.Effect<R, E, [S, Option.Option<Chunk.Chunk<In>>]> => {
  if (index === length) {
    return Effect.succeed([s, Option.none()])
  }
  return pipe(
    f(s, pipe(chunk, Chunk.unsafeGet(index))),
    Effect.flatMap((s1) =>
      contFn(s1) ?
        foldChunkSplitEffectInternal(s1, chunk, index + 1, length, contFn, f) :
        Effect.succeed([s1, Option.some(pipe(chunk, Chunk.drop(index + 1)))])
    )
  )
}

/** @internal */
export const foldLeft = <S, In>(s: S, f: (s: S, input: In) => S): Sink.Sink<never, never, In, never, S> =>
  ignoreLeftover(fold(s, constTrue, f))

/** @internal */
export const foldLeftChunks = <S, In>(
  s: S,
  f: (s: S, chunk: Chunk.Chunk<In>) => S
): Sink.Sink<never, never, In, never, S> => foldChunks(s, constTrue, f)

/** @internal */
export const foldLeftChunksEffect = <S, R, E, In>(
  s: S,
  f: (s: S, chunk: Chunk.Chunk<In>) => Effect.Effect<R, E, S>
): Sink.Sink<R, E, In, never, S> => ignoreLeftover(foldChunksEffect(s, constTrue, f))

/** @internal */
export const foldLeftEffect = <S, R, E, In>(
  s: S,
  f: (s: S, input: In) => Effect.Effect<R, E, S>
): Sink.Sink<R, E, In, In, S> => foldEffect(s, constTrue, f)

/** @internal */
export const foldUntil = <S, In>(s: S, max: number, f: (z: S, input: In) => S): Sink.Sink<never, never, In, In, S> =>
  pipe(
    fold<[S, number], In>(
      [s, 0],
      (tuple) => tuple[1] < max,
      ([output, count], input) => [f(output, input), count + 1]
    ),
    map((tuple) => tuple[0])
  )

/** @internal */
export const foldUntilEffect = <S, R, E, In>(
  s: S,
  max: number,
  f: (s: S, input: In) => Effect.Effect<R, E, S>
): Sink.Sink<R, E, In, In, S> =>
  pipe(
    foldEffect(
      [s, 0 as number] as const,
      (tuple) => tuple[1] < max,
      ([output, count], input: In) => pipe(f(output, input), Effect.map((s) => [s, count + 1] as const))
    ),
    map((tuple) => tuple[0])
  )

/** @internal */
export const foldWeighted = <S, In>(
  options: {
    readonly initial: S
    readonly maxCost: number
    readonly cost: (s: S, input: In) => number
    readonly body: (s: S, input: In) => S
  }
): Sink.Sink<never, never, In, In, S> =>
  foldWeightedDecompose({
    ...options,
    decompose: Chunk.of
  })

/** @internal */
export const foldWeightedDecompose = <S, In>(
  options: {
    readonly initial: S
    readonly maxCost: number
    readonly cost: (s: S, input: In) => number
    readonly decompose: (input: In) => Chunk.Chunk<In>
    readonly body: (s: S, input: In) => S
  }
): Sink.Sink<never, never, In, In, S> =>
  suspend(() =>
    new SinkImpl(
      foldWeightedDecomposeLoop(
        options.initial,
        0,
        false,
        options.maxCost,
        options.cost,
        options.decompose,
        options.body
      )
    )
  )

/** @internal */
const foldWeightedDecomposeLoop = <S, In>(
  s: S,
  cost: number,
  dirty: boolean,
  max: number,
  costFn: (s: S, input: In) => number,
  decompose: (input: In) => Chunk.Chunk<In>,
  f: (s: S, input: In) => S
): Channel.Channel<never, never, Chunk.Chunk<In>, unknown, never, Chunk.Chunk<In>, S> =>
  core.readWith({
    onInput: (input: Chunk.Chunk<In>) => {
      const [nextS, nextCost, nextDirty, leftovers] = foldWeightedDecomposeFold(
        input,
        0,
        s,
        cost,
        dirty,
        max,
        costFn,
        decompose,
        f
      )
      if (Chunk.isNonEmpty(leftovers)) {
        return pipe(core.write(leftovers), channel.zipRight(core.succeedNow(nextS)))
      }
      if (cost > max) {
        return core.succeedNow(nextS)
      }
      return foldWeightedDecomposeLoop(nextS, nextCost, nextDirty, max, costFn, decompose, f)
    },
    onFailure: core.fail,
    onDone: () => core.succeedNow(s)
  })

/** @internal */
const foldWeightedDecomposeFold = <In, S>(
  input: Chunk.Chunk<In>,
  index: number,
  s: S,
  cost: number,
  dirty: boolean,
  max: number,
  costFn: (s: S, input: In) => number,
  decompose: (input: In) => Chunk.Chunk<In>,
  f: (s: S, input: In) => S
): [S, number, boolean, Chunk.Chunk<In>] => {
  if (index === input.length) {
    return [s, cost, dirty, Chunk.empty<In>()]
  }
  const elem = pipe(input, Chunk.unsafeGet(index))
  const total = cost + costFn(s, elem)
  if (total <= max) {
    return foldWeightedDecomposeFold(input, index + 1, f(s, elem), total, true, max, costFn, decompose, f)
  }
  const decomposed = decompose(elem)
  if (decomposed.length <= 1 && !dirty) {
    // If `elem` cannot be decomposed, we need to cross the `max` threshold. To
    // minimize "injury", we only allow this when we haven't added anything else
    // to the aggregate (dirty = false).
    return [f(s, elem), total, true, pipe(input, Chunk.drop(index + 1))]
  }
  if (decomposed.length <= 1 && dirty) {
    // If the state is dirty and `elem` cannot be decomposed, we stop folding
    // and include `elem` in the leftovers.
    return [s, cost, dirty, pipe(input, Chunk.drop(index))]
  }
  // `elem` got decomposed, so we will recurse with the decomposed elements pushed
  // into the chunk we're processing and see if we can aggregate further.
  const next = pipe(decomposed, Chunk.appendAll(pipe(input, Chunk.drop(index + 1))))
  return foldWeightedDecomposeFold(next, 0, s, cost, dirty, max, costFn, decompose, f)
}

/** @internal */
export const foldWeightedDecomposeEffect = <S, In, R, E, R2, E2, R3, E3>(
  options: {
    readonly initial: S
    readonly maxCost: number
    readonly cost: (s: S, input: In) => Effect.Effect<R, E, number>
    readonly decompose: (input: In) => Effect.Effect<R2, E2, Chunk.Chunk<In>>
    readonly body: (s: S, input: In) => Effect.Effect<R3, E3, S>
  }
): Sink.Sink<R | R2 | R3, E | E2 | E3, In, In, S> =>
  suspend(() =>
    new SinkImpl(
      foldWeightedDecomposeEffectLoop(
        options.initial,
        options.maxCost,
        options.cost,
        options.decompose,
        options.body,
        0,
        false
      )
    )
  )

/** @internal */
export const foldWeightedEffect = <S, In, R, E, R2, E2>(
  options: {
    readonly initial: S
    readonly maxCost: number
    readonly cost: (s: S, input: In) => Effect.Effect<R, E, number>
    readonly body: (s: S, input: In) => Effect.Effect<R2, E2, S>
  }
): Sink.Sink<R | R2, E | E2, In, In, S> =>
  foldWeightedDecomposeEffect({
    ...options,
    decompose: (input) => Effect.succeed(Chunk.of(input))
  })

/** @internal */
const foldWeightedDecomposeEffectLoop = <S, In, R, E, R2, E2, R3, E3>(
  s: S,
  max: number,
  costFn: (s: S, input: In) => Effect.Effect<R, E, number>,
  decompose: (input: In) => Effect.Effect<R2, E2, Chunk.Chunk<In>>,
  f: (s: S, input: In) => Effect.Effect<R3, E3, S>,
  cost: number,
  dirty: boolean
): Channel.Channel<R | R2 | R3, E | E2 | E3, Chunk.Chunk<In>, unknown, E | E2 | E3, Chunk.Chunk<In>, S> =>
  core.readWith({
    onInput: (input: Chunk.Chunk<In>) =>
      pipe(
        core.fromEffect(foldWeightedDecomposeEffectFold(s, max, costFn, decompose, f, input, dirty, cost, 0)),
        core.flatMap(([nextS, nextCost, nextDirty, leftovers]) => {
          if (Chunk.isNonEmpty(leftovers)) {
            return pipe(core.write(leftovers), channel.zipRight(core.succeedNow(nextS)))
          }
          if (cost > max) {
            return core.succeedNow(nextS)
          }
          return foldWeightedDecomposeEffectLoop(nextS, max, costFn, decompose, f, nextCost, nextDirty)
        })
      ),
    onFailure: core.fail,
    onDone: () => core.succeedNow(s)
  })

/** @internal */
const foldWeightedDecomposeEffectFold = <S, In, R, E, R2, E2, R3, E3>(
  s: S,
  max: number,
  costFn: (s: S, input: In) => Effect.Effect<R, E, number>,
  decompose: (input: In) => Effect.Effect<R2, E2, Chunk.Chunk<In>>,
  f: (s: S, input: In) => Effect.Effect<R3, E3, S>,
  input: Chunk.Chunk<In>,
  dirty: boolean,
  cost: number,
  index: number
): Effect.Effect<R | R2 | R3, E | E2 | E3, [S, number, boolean, Chunk.Chunk<In>]> => {
  if (index === input.length) {
    return Effect.succeed([s, cost, dirty, Chunk.empty<In>()])
  }
  const elem = pipe(input, Chunk.unsafeGet(index))
  return pipe(
    costFn(s, elem),
    Effect.map((newCost) => cost + newCost),
    Effect.flatMap((total) => {
      if (total <= max) {
        return pipe(
          f(s, elem),
          Effect.flatMap((s) =>
            foldWeightedDecomposeEffectFold(s, max, costFn, decompose, f, input, true, total, index + 1)
          )
        )
      }
      return pipe(
        decompose(elem),
        Effect.flatMap((decomposed) => {
          if (decomposed.length <= 1 && !dirty) {
            // If `elem` cannot be decomposed, we need to cross the `max` threshold. To
            // minimize "injury", we only allow this when we haven't added anything else
            // to the aggregate (dirty = false).
            return pipe(
              f(s, elem),
              Effect.map((s) => [s, total, true, pipe(input, Chunk.drop(index + 1))])
            )
          }
          if (decomposed.length <= 1 && dirty) {
            // If the state is dirty and `elem` cannot be decomposed, we stop folding
            // and include `elem` in th leftovers.
            return Effect.succeed([s, cost, dirty, pipe(input, Chunk.drop(index))])
          }
          // `elem` got decomposed, so we will recurse with the decomposed elements pushed
          // into the chunk we're processing and see if we can aggregate further.
          const next = pipe(decomposed, Chunk.appendAll(pipe(input, Chunk.drop(index + 1))))
          return foldWeightedDecomposeEffectFold(s, max, costFn, decompose, f, next, dirty, cost, 0)
        })
      )
    })
  )
}

/** @internal */
export const flatMap = dual<
  <R1, E1, In, In1 extends In, L, L1, Z, Z1>(
    f: (z: Z) => Sink.Sink<R1, E1, In1, L1, Z1>
  ) => <R, E>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R1 | R, E1 | E, In & In1, L | L1, Z1>,
  <R, E, R1, E1, In, In1 extends In, L, L1, Z, Z1>(
    self: Sink.Sink<R, E, In, L, Z>,
    f: (z: Z) => Sink.Sink<R1, E1, In1, L1, Z1>
  ) => Sink.Sink<R1 | R, E1 | E, In & In1, L | L1, Z1>
>(
  2,
  <R, E, R1, E1, In, In1 extends In, L, L1, Z, Z1>(
    self: Sink.Sink<R, E, In, L, Z>,
    f: (z: Z) => Sink.Sink<R1, E1, In1, L1, Z1>
  ): Sink.Sink<R | R1, E | E1, In & In1, L | L1, Z1> => foldSink(self, { onFailure: fail, onSuccess: f })
)

/** @internal */
export const forEach = <In, R, E, _>(f: (input: In) => Effect.Effect<R, E, _>): Sink.Sink<R, E, In, never, void> => {
  const process: Channel.Channel<R, E, Chunk.Chunk<In>, unknown, E, never, void> = core.readWithCause({
    onInput: (input: Chunk.Chunk<In>) =>
      pipe(core.fromEffect(Effect.forEach(input, (v) => f(v), { discard: true })), core.flatMap(() => process)),
    onFailure: core.failCause,
    onDone: () => core.unit
  })
  return new SinkImpl(process)
}

/** @internal */
export const forEachChunk = <In, R, E, _>(
  f: (input: Chunk.Chunk<In>) => Effect.Effect<R, E, _>
): Sink.Sink<R, E, In, never, void> => {
  const process: Channel.Channel<R, E, Chunk.Chunk<In>, unknown, E, never, void> = core.readWithCause({
    onInput: (input: Chunk.Chunk<In>) => pipe(core.fromEffect(f(input)), core.flatMap(() => process)),
    onFailure: core.failCause,
    onDone: () => core.unit
  })
  return new SinkImpl(process)
}

/** @internal */
export const forEachWhile = <In, R, E>(
  f: (input: In) => Effect.Effect<R, E, boolean>
): Sink.Sink<R, E, In, In, void> => {
  const process: Channel.Channel<R, E, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<In>, void> = core.readWithCause({
    onInput: (input: Chunk.Chunk<In>) => forEachWhileReader(f, input, 0, input.length, process),
    onFailure: core.failCause,
    onDone: () => core.unit
  })
  return new SinkImpl(process)
}

/** @internal */
const forEachWhileReader = <In, R, E>(
  f: (input: In) => Effect.Effect<R, E, boolean>,
  input: Chunk.Chunk<In>,
  index: number,
  length: number,
  cont: Channel.Channel<R, E, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<In>, void>
): Channel.Channel<R, E, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<In>, void> => {
  if (index === length) {
    return cont
  }
  return pipe(
    core.fromEffect(f(pipe(input, Chunk.unsafeGet(index)))),
    core.flatMap((bool) =>
      bool ?
        forEachWhileReader(f, input, index + 1, length, cont) :
        core.write(pipe(input, Chunk.drop(index)))
    ),
    channel.catchAll((error) => pipe(core.write(pipe(input, Chunk.drop(index))), channel.zipRight(core.fail(error))))
  )
}

/** @internal */
export const forEachChunkWhile = <In, R, E>(
  f: (input: Chunk.Chunk<In>) => Effect.Effect<R, E, boolean>
): Sink.Sink<R, E, In, In, void> => {
  const reader: Channel.Channel<R, E, Chunk.Chunk<In>, unknown, E, never, void> = core.readWith({
    onInput: (input: Chunk.Chunk<In>) =>
      pipe(
        core.fromEffect(f(input)),
        core.flatMap((cont) => cont ? reader : core.unit)
      ),
    onFailure: core.fail,
    onDone: () => core.unit
  })
  return new SinkImpl(reader)
}

/** @internal */
export const fromChannel = <R, E, In, L, Z>(
  channel: Channel.Channel<R, never, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<L>, Z>
): Sink.Sink<R, E, In, L, Z> => new SinkImpl(channel)

/** @internal */
export const fromEffect = <R, E, Z>(effect: Effect.Effect<R, E, Z>): Sink.Sink<R, E, unknown, never, Z> =>
  new SinkImpl(core.fromEffect(effect))

/** @internal */
export const fromPubSub = <In>(
  pubsub: PubSub.PubSub<In>,
  options?: {
    readonly shutdown?: boolean | undefined
  }
): Sink.Sink<never, never, In, never, void> => fromQueue(pubsub, options)

/** @internal */
export const fromPush = <R, E, In, L, Z>(
  push: Effect.Effect<
    R,
    never,
    (_: Option.Option<Chunk.Chunk<In>>) => Effect.Effect<R, readonly [Either.Either<E, Z>, Chunk.Chunk<L>], void>
  >
): Sink.Sink<Exclude<R, Scope.Scope>, E, In, L, Z> =>
  new SinkImpl(channel.unwrapScoped(pipe(push, Effect.map(fromPushPull))))

const fromPushPull = <R, E, In, L, Z>(
  push: (
    option: Option.Option<Chunk.Chunk<In>>
  ) => Effect.Effect<R, readonly [Either.Either<E, Z>, Chunk.Chunk<L>], void>
): Channel.Channel<R, never, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<L>, Z> =>
  core.readWith({
    onInput: (input: Chunk.Chunk<In>) =>
      channel.foldChannel(core.fromEffect(push(Option.some(input))), {
        onFailure: ([either, leftovers]) =>
          Either.match(either, {
            onLeft: (error) => pipe(core.write(leftovers), channel.zipRight(core.fail(error))),
            onRight: (z) => pipe(core.write(leftovers), channel.zipRight(core.succeedNow(z)))
          }),
        onSuccess: () => fromPushPull(push)
      }),
    onFailure: core.fail,
    onDone: () =>
      channel.foldChannel(core.fromEffect(push(Option.none())), {
        onFailure: ([either, leftovers]) =>
          Either.match(either, {
            onLeft: (error) => pipe(core.write(leftovers), channel.zipRight(core.fail(error))),
            onRight: (z) => pipe(core.write(leftovers), channel.zipRight(core.succeedNow(z)))
          }),
        onSuccess: () =>
          core.fromEffect(
            Effect.dieMessage(
              "BUG: Sink.fromPush - please report an issue at https://github.com/Effect-TS/effect/issues"
            )
          )
      })
  })

/** @internal */
export const fromQueue = <In>(
  queue: Queue.Enqueue<In>,
  options?: {
    readonly shutdown?: boolean | undefined
  }
): Sink.Sink<never, never, In, never, void> =>
  options?.shutdown ?
    unwrapScoped(
      Effect.map(
        Effect.acquireRelease(Effect.succeed(queue), Queue.shutdown),
        fromQueue
      )
    ) :
    forEachChunk((input: Chunk.Chunk<In>) => pipe(Queue.offerAll(queue, input)))

/** @internal */
export const head = <In>(): Sink.Sink<never, never, In, In, Option.Option<In>> =>
  fold(
    Option.none() as Option.Option<In>,
    Option.isNone,
    (option, input) =>
      Option.match(option, {
        onNone: () => Option.some(input),
        onSome: () => option
      })
  )

/** @internal */
export const ignoreLeftover = <R, E, In, L, Z>(self: Sink.Sink<R, E, In, L, Z>): Sink.Sink<R, E, In, never, Z> =>
  new SinkImpl(channel.drain(toChannel(self)))

/** @internal */
export const last = <In>(): Sink.Sink<never, never, In, In, Option.Option<In>> =>
  foldLeftChunks(Option.none<In>(), (s, input) => Option.orElse(Chunk.last(input), () => s))

/** @internal */
export const leftover = <L>(chunk: Chunk.Chunk<L>): Sink.Sink<never, never, unknown, L, void> =>
  new SinkImpl(core.suspend(() => core.write(chunk)))

/** @internal */
export const map = dual<
  <Z, Z2>(f: (z: Z) => Z2) => <R, E, In, L>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R, E, In, L, Z2>,
  <R, E, In, L, Z, Z2>(self: Sink.Sink<R, E, In, L, Z>, f: (z: Z) => Z2) => Sink.Sink<R, E, In, L, Z2>
>(2, <R, E, In, L, Z, Z2>(self: Sink.Sink<R, E, In, L, Z>, f: (z: Z) => Z2): Sink.Sink<R, E, In, L, Z2> => {
  return new SinkImpl(pipe(toChannel(self), channel.map(f)))
})

/** @internal */
export const mapEffect = dual<
  <Z, R2, E2, Z2>(
    f: (z: Z) => Effect.Effect<R2, E2, Z2>
  ) => <R, E, In, L>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R, E2 | E, In, L, Z2>,
  <R, E, In, L, Z, R2, E2, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    f: (z: Z) => Effect.Effect<R2, E2, Z2>
  ) => Sink.Sink<R2 | R, E2 | E, In, L, Z2>
>(
  2,
  <R, E, In, L, Z, R2, E2, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    f: (z: Z) => Effect.Effect<R2, E2, Z2>
  ): Sink.Sink<R | R2, E | E2, In, L, Z2> => new SinkImpl(pipe(toChannel(self), channel.mapEffect(f)))
)

/** @internal */
export const mapError = dual<
  <E, E2>(f: (error: E) => E2) => <R, In, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R, E2, In, L, Z>,
  <R, In, L, Z, E, E2>(self: Sink.Sink<R, E, In, L, Z>, f: (error: E) => E2) => Sink.Sink<R, E2, In, L, Z>
>(
  2,
  <R, In, L, Z, E, E2>(self: Sink.Sink<R, E, In, L, Z>, f: (error: E) => E2): Sink.Sink<R, E2, In, L, Z> =>
    new SinkImpl(pipe(toChannel(self), channel.mapError(f)))
)

/** @internal */
export const mapLeftover = dual<
  <L, L2>(f: (leftover: L) => L2) => <R, E, In, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R, E, In, L2, Z>,
  <R, E, In, Z, L, L2>(self: Sink.Sink<R, E, In, L, Z>, f: (leftover: L) => L2) => Sink.Sink<R, E, In, L2, Z>
>(
  2,
  <R, E, In, Z, L, L2>(self: Sink.Sink<R, E, In, L, Z>, f: (leftover: L) => L2): Sink.Sink<R, E, In, L2, Z> =>
    new SinkImpl(pipe(toChannel(self), channel.mapOut(Chunk.map(f))))
)

/** @internal */
export const never: Sink.Sink<never, never, unknown, never, never> = fromEffect(Effect.never)

/** @internal */
export const orElse = dual<
  <R2, E2, In2, L2, Z2>(
    that: LazyArg<Sink.Sink<R2, E2, In2, L2, Z2>>
  ) => <R, E, In, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R, E2 | E, In & In2, L2 | L, Z2 | Z>,
  <R, E, In, L, Z, R2, E2, In2, L2, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    that: LazyArg<Sink.Sink<R2, E2, In2, L2, Z2>>
  ) => Sink.Sink<R2 | R, E2 | E, In & In2, L2 | L, Z2 | Z>
>(
  2,
  <R, E, In, L, Z, R2, E2, In2, L2, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    that: LazyArg<Sink.Sink<R2, E2, In2, L2, Z2>>
  ): Sink.Sink<R | R2, E | E2, In & In2, L | L2, Z | Z2> =>
    new SinkImpl<R | R2, E | E2, In & In2, L | L2, Z | Z2>(
      pipe(toChannel(self), channel.orElse(() => toChannel(that())))
    )
)

/** @internal */
export const provideContext = dual<
  <R>(context: Context.Context<R>) => <E, In, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<never, E, In, L, Z>,
  <E, In, L, Z, R>(self: Sink.Sink<R, E, In, L, Z>, context: Context.Context<R>) => Sink.Sink<never, E, In, L, Z>
>(
  2,
  <E, In, L, Z, R>(self: Sink.Sink<R, E, In, L, Z>, context: Context.Context<R>): Sink.Sink<never, E, In, L, Z> =>
    new SinkImpl(pipe(toChannel(self), core.provideContext(context)))
)

/** @internal */
export const race = dual<
  <R1, E1, In1, L1, Z1>(
    that: Sink.Sink<R1, E1, In1, L1, Z1>
  ) => <R, E, In, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R1 | R, E1 | E, In & In1, L1 | L, Z1 | Z>,
  <R, E, In, L, Z, R1, E1, In1, L1, Z1>(
    self: Sink.Sink<R, E, In, L, Z>,
    that: Sink.Sink<R1, E1, In1, L1, Z1>
  ) => Sink.Sink<R1 | R, E1 | E, In & In1, L1 | L, Z1 | Z>
>(
  2,
  <R, E, In, L, Z, R1, E1, In1, L1, Z1>(
    self: Sink.Sink<R, E, In, L, Z>,
    that: Sink.Sink<R1, E1, In1, L1, Z1>
  ): Sink.Sink<R | R1, E | E1, In & In1, L | L1, Z | Z1> => pipe(self, raceBoth(that), map(Either.merge))
)

/** @internal */
export const raceBoth = dual<
  <R1, E1, In1, L1, Z1>(
    that: Sink.Sink<R1, E1, In1, L1, Z1>,
    options?: {
      readonly capacity?: number | undefined
    }
  ) => <R, E, In, L, Z>(
    self: Sink.Sink<R, E, In, L, Z>
  ) => Sink.Sink<R1 | R, E1 | E, In & In1, L1 | L, Either.Either<Z, Z1>>,
  <R, E, In, L, Z, R1, E1, In1, L1, Z1>(
    self: Sink.Sink<R, E, In, L, Z>,
    that: Sink.Sink<R1, E1, In1, L1, Z1>,
    options?: {
      readonly capacity?: number | undefined
    }
  ) => Sink.Sink<R1 | R, E1 | E, In & In1, L1 | L, Either.Either<Z, Z1>>
>(
  (args) => isSink(args[1]),
  <R, E, In, L, Z, R1, E1, In1, L1, Z1>(
    self: Sink.Sink<R, E, In, L, Z>,
    that: Sink.Sink<R1, E1, In1, L1, Z1>,
    options?: {
      readonly capacity?: number | undefined
    }
  ): Sink.Sink<R | R1, E | E1, In & In1, L | L1, Either.Either<Z, Z1>> =>
    raceWith(self, {
      other: that,
      onSelfDone: (selfDone) => mergeDecision.Done(Effect.map(selfDone, Either.left)),
      onOtherDone: (thatDone) => mergeDecision.Done(Effect.map(thatDone, Either.right)),
      capacity: options?.capacity ?? 16
    })
)

/** @internal */
export const raceWith = dual<
  <R2, E2, In2, L2, Z2, E, Z, Z3, Z4>(
    options: {
      readonly other: Sink.Sink<R2, E2, In2, L2, Z2>
      readonly onSelfDone: (exit: Exit.Exit<E, Z>) => MergeDecision.MergeDecision<R2, E2, Z2, E2 | E, Z3>
      readonly onOtherDone: (exit: Exit.Exit<E2, Z2>) => MergeDecision.MergeDecision<R2, E, Z, E2 | E, Z4>
      readonly capacity?: number | undefined
    }
  ) => <R, In, L>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R, E2 | E, In & In2, L2 | L, Z3 | Z4>,
  <R, In, L, R2, E2, In2, L2, Z2, E, Z, Z3, Z4>(
    self: Sink.Sink<R, E, In, L, Z>,
    options: {
      readonly other: Sink.Sink<R2, E2, In2, L2, Z2>
      readonly onSelfDone: (exit: Exit.Exit<E, Z>) => MergeDecision.MergeDecision<R2, E2, Z2, E2 | E, Z3>
      readonly onOtherDone: (exit: Exit.Exit<E2, Z2>) => MergeDecision.MergeDecision<R2, E, Z, E2 | E, Z4>
      readonly capacity?: number | undefined
    }
  ) => Sink.Sink<R2 | R, E2 | E, In & In2, L2 | L, Z3 | Z4>
>(
  2,
  <R, In, L, R2, E2, In2, L2, Z2, E, Z, Z3, Z4>(
    self: Sink.Sink<R, E, In, L, Z>,
    options: {
      readonly other: Sink.Sink<R2, E2, In2, L2, Z2>
      readonly onSelfDone: (exit: Exit.Exit<E, Z>) => MergeDecision.MergeDecision<R2, E2, Z2, E2 | E, Z3>
      readonly onOtherDone: (exit: Exit.Exit<E2, Z2>) => MergeDecision.MergeDecision<R2, E, Z, E2 | E, Z4>
      readonly capacity?: number | undefined
    }
  ): Sink.Sink<R | R2, E | E2, In & In2, L | L2, Z3 | Z4> => {
    const scoped = Effect.gen(function*($) {
      const pubsub = yield* $(
        PubSub.bounded<Either.Either<Exit.Exit<never, unknown>, Chunk.Chunk<In & In2>>>(options?.capacity ?? 16)
      )
      const channel1 = yield* $(channel.fromPubSubScoped(pubsub))
      const channel2 = yield* $(channel.fromPubSubScoped(pubsub))
      const reader = channel.toPubSub(pubsub)
      const writer = pipe(
        channel1,
        core.pipeTo(toChannel(self)),
        channel.mergeWith({
          other: pipe(channel2, core.pipeTo(toChannel(options.other))),
          onSelfDone: options.onSelfDone,
          onOtherDone: options.onOtherDone
        })
      )
      const racedChannel: Channel.Channel<
        R | R2,
        never,
        Chunk.Chunk<In & In2>,
        unknown,
        E | E2,
        Chunk.Chunk<L | L2>,
        Z3 | Z4
      > = channel.mergeWith(reader, {
        other: writer,
        onSelfDone: (_) => mergeDecision.Await((exit) => Effect.suspend(() => exit)),
        onOtherDone: (done) => mergeDecision.Done(Effect.suspend(() => done))
      })
      return new SinkImpl(racedChannel)
    })
    return unwrapScoped(scoped)
  }
)

/** @internal */
export const refineOrDie = dual<
  <E, E2>(
    pf: (error: E) => Option.Option<E2>
  ) => <R, In, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R, E2, In, L, Z>,
  <R, In, L, Z, E, E2>(
    self: Sink.Sink<R, E, In, L, Z>,
    pf: (error: E) => Option.Option<E2>
  ) => Sink.Sink<R, E2, In, L, Z>
>(
  2,
  <R, In, L, Z, E, E2>(
    self: Sink.Sink<R, E, In, L, Z>,
    pf: (error: E) => Option.Option<E2>
  ): Sink.Sink<R, E2, In, L, Z> => pipe(self, refineOrDieWith(pf, identity))
)

/** @internal */
export const refineOrDieWith = dual<
  <E, E2>(
    pf: (error: E) => Option.Option<E2>,
    f: (error: E) => unknown
  ) => <R, In, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R, E2, In, L, Z>,
  <R, In, L, Z, E, E2>(
    self: Sink.Sink<R, E, In, L, Z>,
    pf: (error: E) => Option.Option<E2>,
    f: (error: E) => unknown
  ) => Sink.Sink<R, E2, In, L, Z>
>(
  3,
  <R, In, L, Z, E, E2>(
    self: Sink.Sink<R, E, In, L, Z>,
    pf: (error: E) => Option.Option<E2>,
    f: (error: E) => unknown
  ): Sink.Sink<R, E2, In, L, Z> => {
    const newChannel = pipe(
      self,
      toChannel,
      channel.catchAll((error) =>
        Option.match(pf(error), {
          onNone: () => core.failCauseSync(() => Cause.die(f(error))),
          onSome: core.fail
        })
      )
    )
    return new SinkImpl(newChannel)
  }
)

/** @internal */
export const service = <T extends Context.Tag<any, any>>(
  tag: T
): Sink.Sink<Context.Tag.Identifier<T>, never, unknown, never, Context.Tag.Service<T>> => serviceWith(tag, identity)

/** @internal */
export const serviceWith = <T extends Context.Tag<any, any>, Z>(
  tag: T,
  f: (service: Context.Tag.Service<T>) => Z
): Sink.Sink<Context.Tag.Identifier<T>, never, unknown, never, Z> => fromEffect(Effect.map(tag, f))

/** @internal */
export const serviceWithEffect = <T extends Context.Tag<any, any>, R, E, Z>(
  tag: T,
  f: (service: Context.Tag.Service<T>) => Effect.Effect<R, E, Z>
): Sink.Sink<R | Context.Tag.Identifier<T>, E, unknown, never, Z> => fromEffect(Effect.flatMap(tag, f))

/** @internal */
export const serviceWithSink = <T extends Context.Tag<any, any>, R, E, In, L, Z>(
  tag: T,
  f: (service: Context.Tag.Service<T>) => Sink.Sink<R, E, In, L, Z>
): Sink.Sink<R | Context.Tag.Identifier<T>, E, In, L, Z> =>
  new SinkImpl(pipe(Effect.map(tag, (service) => toChannel(f(service))), channel.unwrap))

/** @internal */
export const some = <In>(predicate: Predicate<In>): Sink.Sink<never, never, In, In, boolean> =>
  fold(false, (bool) => !bool, (acc, input) => acc || predicate(input))

/** @internal */
export const splitWhere = dual<
  <In>(f: Predicate<In>) => <R, E, L extends In, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R, E, In, In, Z>,
  <R, E, L extends In, Z, In>(self: Sink.Sink<R, E, In, L, Z>, f: Predicate<In>) => Sink.Sink<R, E, In, In, Z>
>(2, <R, E, L extends In, Z, In>(self: Sink.Sink<R, E, In, L, Z>, f: Predicate<In>): Sink.Sink<R, E, In, In, Z> => {
  const newChannel = pipe(
    core.fromEffect(Ref.make(Chunk.empty<In>())),
    core.flatMap((ref) =>
      pipe(
        splitWhereSplitter<E, In>(false, ref, f),
        channel.pipeToOrFail(toChannel(self)),
        core.collectElements,
        core.flatMap(([leftovers, z]) =>
          pipe(
            core.fromEffect(Ref.get(ref)),
            core.flatMap((leftover) =>
              pipe(
                core.write<Chunk.Chunk<In>>(pipe(leftover, Chunk.appendAll(Chunk.flatten(leftovers)))),
                channel.zipRight(core.succeed(z))
              )
            )
          )
        )
      )
    )
  )
  return new SinkImpl(newChannel)
})

/** @internal */
const splitWhereSplitter = <E, A>(
  written: boolean,
  leftovers: Ref.Ref<Chunk.Chunk<A>>,
  f: Predicate<A>
): Channel.Channel<never, never, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, unknown> =>
  core.readWithCause({
    onInput: (input) => {
      if (Chunk.isEmpty(input)) {
        return splitWhereSplitter<E, A>(written, leftovers, f)
      }
      if (written) {
        const index = indexWhere(input, f)
        if (index === -1) {
          return channel.zipRight(
            core.write(input),
            splitWhereSplitter<E, A>(true, leftovers, f)
          )
        }
        const [left, right] = Chunk.splitAt(input, index)
        return channel.zipRight(
          core.write(left),
          core.fromEffect(Ref.set(leftovers, right))
        )
      }
      const index = indexWhere(input, f, 1)
      if (index === -1) {
        return channel.zipRight(
          core.write(input),
          splitWhereSplitter<E, A>(true, leftovers, f)
        )
      }
      const [left, right] = pipe(input, Chunk.splitAt(Math.max(index, 1)))
      return channel.zipRight(core.write(left), core.fromEffect(Ref.set(leftovers, right)))
    },
    onFailure: core.failCause,
    onDone: core.succeed
  })

/** @internal */
const indexWhere = <A>(self: Chunk.Chunk<A>, predicate: Predicate<A>, from = 0): number => {
  const iterator = self[Symbol.iterator]()
  let index = 0
  let result = -1
  let next: IteratorResult<A, any>
  while (result < 0 && (next = iterator.next()) && !next.done) {
    const a = next.value
    if (index >= from && predicate(a)) {
      result = index
    }
    index = index + 1
  }
  return result
}

/** @internal */
export const succeed = <Z>(z: Z): Sink.Sink<never, never, unknown, never, Z> => new SinkImpl(core.succeed(z))

/** @internal */
export const sum: Sink.Sink<never, never, number, never, number> = foldLeftChunks(
  0,
  (acc, chunk) => acc + Chunk.reduce(chunk, 0, (s, a) => s + a)
)

/** @internal */
export const summarized = dual<
  <R2, E2, Z2, Z3>(
    summary: Effect.Effect<R2, E2, Z2>,
    f: (start: Z2, end: Z2) => Z3
  ) => <R, E, In, L, Z>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R, E2 | E, In, L, [Z, Z3]>,
  <R, E, In, L, Z, R2, E2, Z2, Z3>(
    self: Sink.Sink<R, E, In, L, Z>,
    summary: Effect.Effect<R2, E2, Z2>,
    f: (start: Z2, end: Z2) => Z3
  ) => Sink.Sink<R2 | R, E2 | E, In, L, [Z, Z3]>
>(
  3,
  <R, E, In, L, Z, R2, E2, Z2, Z3>(
    self: Sink.Sink<R, E, In, L, Z>,
    summary: Effect.Effect<R2, E2, Z2>,
    f: (start: Z2, end: Z2) => Z3
  ): Sink.Sink<R | R2, E | E2, In, L, [Z, Z3]> => {
    const newChannel = pipe(
      core.fromEffect(summary),
      core.flatMap((start) =>
        pipe(
          self,
          toChannel,
          core.flatMap((done) =>
            pipe(
              core.fromEffect(summary),
              channel.map((end) => [done, f(start, end)])
            )
          )
        )
      )
    )
    return new SinkImpl(newChannel)
  }
)

/** @internal */
export const sync = <Z>(evaluate: LazyArg<Z>): Sink.Sink<never, never, unknown, never, Z> =>
  new SinkImpl(core.sync(evaluate))

/** @internal */
export const take = <In>(n: number): Sink.Sink<never, never, In, In, Chunk.Chunk<In>> =>
  pipe(
    foldChunks<Chunk.Chunk<In>, In>(
      Chunk.empty(),
      (chunk) => chunk.length < n,
      (acc, chunk) => pipe(acc, Chunk.appendAll(chunk))
    ),
    flatMap((acc) => {
      const [taken, leftover] = pipe(acc, Chunk.splitAt(n))
      return new SinkImpl(pipe(core.write(leftover), channel.zipRight(core.succeedNow(taken))))
    })
  )

/** @internal */
export const toChannel = <R, E, In, L, Z>(
  self: Sink.Sink<R, E, In, L, Z>
): Channel.Channel<R, never, Chunk.Chunk<In>, unknown, E, Chunk.Chunk<L>, Z> =>
  Effect.isEffect(self) ?
    toChannel(fromEffect(self as Effect.Effect<R, E, Z>)) :
    (self as SinkImpl<R, E, In, L, Z>).channel

/** @internal */
export const unwrap = <R, E, R2, E2, In, L, Z>(
  effect: Effect.Effect<R, E, Sink.Sink<R2, E2, In, L, Z>>
): Sink.Sink<R | R2, E | E2, In, L, Z> =>
  new SinkImpl(
    channel.unwrap(pipe(effect, Effect.map((sink) => toChannel(sink))))
  )

/** @internal */
export const unwrapScoped = <R, E, In, L, Z>(
  effect: Effect.Effect<R, E, Sink.Sink<R, E, In, L, Z>>
): Sink.Sink<Exclude<R, Scope.Scope>, E, In, L, Z> => {
  return new SinkImpl(channel.unwrapScoped(pipe(effect, Effect.map((sink) => toChannel(sink)))))
}

/** @internal */
export const withDuration = <R, E, In, L, Z>(
  self: Sink.Sink<R, E, In, L, Z>
): Sink.Sink<R, E, In, L, [Z, Duration.Duration]> =>
  pipe(self, summarized(Clock.currentTimeMillis, (start, end) => Duration.millis(end - start)))

/** @internal */
export const zip = dual<
  <R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    that: Sink.Sink<R2, E2, In2, L2, Z2>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => <R, E>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R, E2 | E, In & In2, L | L2, [Z, Z2]>,
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    that: Sink.Sink<R2, E2, In2, L2, Z2>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => Sink.Sink<R2 | R, E2 | E, In & In2, L | L2, [Z, Z2]>
>(
  (args) => isSink(args[1]),
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    that: Sink.Sink<R2, E2, In2, L2, Z2>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): Sink.Sink<R | R2, E | E2, In & In2, L | L2, [Z, Z2]> => zipWith(self, that, (z, z2) => [z, z2], options)
)

/** @internal */
export const zipLeft = dual<
  <R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    that: Sink.Sink<R2, E2, In2, L2, Z2>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => <R, E>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R, E2 | E, In & In2, L | L2, Z>,
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    that: Sink.Sink<R2, E2, In2, L2, Z2>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => Sink.Sink<R2 | R, E2 | E, In & In2, L | L2, Z>
>(
  (args) => isSink(args[1]),
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    that: Sink.Sink<R2, E2, In2, L2, Z2>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): Sink.Sink<R | R2, E | E2, In & In2, L | L2, Z> => zipWith(self, that, (z, _) => z, options)
)

/** @internal */
export const zipRight = dual<
  <R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    that: Sink.Sink<R2, E2, In2, L2, Z2>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => <R, E>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R, E2 | E, In & In2, L | L2, Z2>,
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    that: Sink.Sink<R2, E2, In2, L2, Z2>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => Sink.Sink<R2 | R, E2 | E, In & In2, L | L2, Z2>
>(
  (args) => isSink(args[1]),
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2>(
    self: Sink.Sink<R, E, In, L, Z>,
    that: Sink.Sink<R2, E2, In2, L2, Z2>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): Sink.Sink<R | R2, E | E2, In & In2, L | L2, Z2> => zipWith(self, that, (_, z2) => z2, options)
)

/** @internal */
export const zipWith = dual<
  <R2, E2, In, In2 extends In, L, L2, Z, Z2, Z3>(
    that: Sink.Sink<R2, E2, In2, L2, Z2>,
    f: (z: Z, z1: Z2) => Z3,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => <R, E>(self: Sink.Sink<R, E, In, L, Z>) => Sink.Sink<R2 | R, E2 | E, In & In2, L | L2, Z3>,
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2, Z3>(
    self: Sink.Sink<R, E, In, L, Z>,
    that: Sink.Sink<R2, E2, In2, L2, Z2>,
    f: (z: Z, z1: Z2) => Z3,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => Sink.Sink<R2 | R, E2 | E, In & In2, L | L2, Z3>
>(
  (args) => isSink(args[1]),
  <R, E, R2, E2, In, In2 extends In, L, L2, Z, Z2, Z3>(
    self: Sink.Sink<R, E, In, L, Z>,
    that: Sink.Sink<R2, E2, In2, L2, Z2>,
    f: (z: Z, z1: Z2) => Z3,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): Sink.Sink<R | R2, E | E2, In & In2, L | L2, Z3> =>
    options?.concurrent ?
      raceWith(self, {
        other: that,
        onSelfDone: Exit.match({
          onFailure: (cause) => mergeDecision.Done(Effect.failCause(cause)),
          onSuccess: (leftZ) =>
            mergeDecision.Await<R | R2, E2, Z2, E | E2, Z3>(
              Exit.match({
                onFailure: Effect.failCause,
                onSuccess: (rightZ) => Effect.succeed(f(leftZ, rightZ))
              })
            )
        }),
        onOtherDone: Exit.match({
          onFailure: (cause) => mergeDecision.Done(Effect.failCause(cause)),
          onSuccess: (rightZ) =>
            mergeDecision.Await<R | R2, E, Z, E | E2, Z3>(
              Exit.match({
                onFailure: Effect.failCause,
                onSuccess: (leftZ) => Effect.succeed(f(leftZ, rightZ))
              })
            )
        })
      }) :
      flatMap(self, (z) => map(that, (z2) => f(z, z2)))
)

// Circular with Channel

/** @internal */
export const channelToSink = <Env, InErr, InElem, OutErr, OutElem, OutDone>(
  self: Channel.Channel<Env, InErr, Chunk.Chunk<InElem>, unknown, OutErr, Chunk.Chunk<OutElem>, OutDone>
): Sink.Sink<Env, OutErr, InElem, OutElem, OutDone> => new SinkImpl(self)

// Constants

/** @internal */
export const count: Sink.Sink<never, never, unknown, never, number> = foldLeftChunks(
  0,
  (acc, chunk) => acc + chunk.length
)

/** @internal */
export const mkString: Sink.Sink<never, never, unknown, never, string> = suspend(() => {
  const strings: Array<string> = []
  return pipe(
    foldLeftChunks<void, unknown>(void 0, (_, elems) =>
      Chunk.map(elems, (elem) => {
        strings.push(String(elem))
      })),
    map(() => strings.join(""))
  )
})

/** @internal */
export const timed: Sink.Sink<never, never, unknown, never, Duration.Duration> = pipe(
  withDuration(drain),
  map((tuple) => tuple[1])
)
