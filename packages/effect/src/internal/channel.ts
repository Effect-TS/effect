import * as Cause from "../Cause.js"
import type * as Channel from "../Channel.js"
import * as Chunk from "../Chunk.js"
import * as Context from "../Context.js"
import * as Deferred from "../Deferred.js"
import * as Effect from "../Effect.js"
import * as Either from "../Either.js"
import * as Equal from "../Equal.js"
import * as Exit from "../Exit.js"
import * as Fiber from "../Fiber.js"
import { constVoid, dual, identity, pipe } from "../Function.js"
import type { LazyArg } from "../Function.js"
import * as Layer from "../Layer.js"
import type * as MergeDecision from "../MergeDecision.js"
import type * as MergeState from "../MergeState.js"
import type * as MergeStrategy from "../MergeStrategy.js"
import * as Option from "../Option.js"
import { hasProperty, type Predicate } from "../Predicate.js"
import * as PubSub from "../PubSub.js"
import * as Queue from "../Queue.js"
import * as Ref from "../Ref.js"
import * as Scope from "../Scope.js"
import type * as SingleProducerAsyncInput from "../SingleProducerAsyncInput.js"
import type * as Tracer from "../Tracer.js"
import * as executor from "./channel/channelExecutor.js"
import type * as ChannelState from "./channel/channelState.js"
import * as mergeDecision from "./channel/mergeDecision.js"
import * as mergeState from "./channel/mergeState.js"
import * as _mergeStrategy from "./channel/mergeStrategy.js"
import * as singleProducerAsyncInput from "./channel/singleProducerAsyncInput.js"
import * as core from "./core-stream.js"
import * as MergeDecisionOpCodes from "./opCodes/channelMergeDecision.js"
import * as MergeStateOpCodes from "./opCodes/channelMergeState.js"
import * as ChannelStateOpCodes from "./opCodes/channelState.js"
import * as tracer from "./tracer.js"

/** @internal */
export const acquireUseRelease = <Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone, Acquired>(
  acquire: Effect.Effect<Env, OutErr, Acquired>,
  use: (a: Acquired) => Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired, exit: Exit.Exit<OutErr, OutDone>) => Effect.Effect<Env, never, any>
): Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone> =>
  core.flatMap(
    core.fromEffect(
      Ref.make<
        (exit: Exit.Exit<OutErr, OutDone>) => Effect.Effect<Env, never, any>
      >(() => Effect.unit)
    ),
    (ref) =>
      pipe(
        core.fromEffect(
          Effect.uninterruptible(
            Effect.tap(
              acquire,
              (a) => Ref.set(ref, (exit) => release(a, exit))
            )
          )
        ),
        core.flatMap(use),
        core.ensuringWith((exit) => Effect.flatMap(Ref.get(ref), (f) => f(exit)))
      )
  )

/** @internal */
export const as = dual<
  <OutDone2>(
    value: OutDone2
  ) => <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutDone2>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    value: OutDone2
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>
>(2, <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutDone2>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  value: OutDone2
): Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2> => map(self, () => value))

/** @internal */
export const asUnit = <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, void> => map(self, constVoid)

/** @internal */
export const buffer = <InErr, InElem, InDone>(
  options: {
    readonly empty: InElem
    readonly isEmpty: Predicate<InElem>
    readonly ref: Ref.Ref<InElem>
  }
): Channel.Channel<never, InErr, InElem, InDone, InErr, InElem, InDone> =>
  core.suspend<never, InErr, InElem, InDone, InErr, InElem, InDone>(() => {
    const doBuffer = <InErr, InElem, InDone>(
      empty: InElem,
      isEmpty: Predicate<InElem>,
      ref: Ref.Ref<InElem>
    ): Channel.Channel<never, InErr, InElem, InDone, InErr, InElem, InDone> =>
      unwrap(
        Ref.modify(ref, (inElem) =>
          isEmpty(inElem) ?
            [
              core.readWith({
                onInput: (input: InElem) =>
                  core.flatMap(
                    core.write(input),
                    () => doBuffer<InErr, InElem, InDone>(empty, isEmpty, ref)
                  ),
                onFailure: (error: InErr) => core.fail(error),
                onDone: (done: InDone) => core.succeedNow(done)
              }),
              inElem
            ] as const :
            [
              core.flatMap(
                core.write(inElem),
                () => doBuffer<InErr, InElem, InDone>(empty, isEmpty, ref)
              ),
              empty
            ] as const)
      )
    return doBuffer(options.empty, options.isEmpty, options.ref)
  })

/** @internal */
export const bufferChunk = <InErr, InElem, InDone>(
  ref: Ref.Ref<Chunk.Chunk<InElem>>
): Channel.Channel<never, InErr, Chunk.Chunk<InElem>, InDone, InErr, Chunk.Chunk<InElem>, InDone> =>
  buffer<InErr, Chunk.Chunk<InElem>, InDone>({
    empty: Chunk.empty(),
    isEmpty: Chunk.isEmpty,
    ref
  })

/** @internal */
export const catchAll = dual<
  <Env1, InErr1, InElem1, InDone1, OutErr, OutErr1, OutElem1, OutDone1>(
    f: (error: OutErr) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
  ) => <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1,
    OutElem1 | OutElem,
    OutDone1 | OutDone
  >,
  <Env, InErr, InElem, InDone, OutElem, OutDone, Env1, InErr1, InElem1, InDone1, OutErr, OutErr1, OutElem1, OutDone1>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (error: OutErr) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1,
    OutElem1 | OutElem,
    OutDone1 | OutDone
  >
>(
  2,
  <Env, InErr, InElem, InDone, OutElem, OutDone, Env1, InErr1, InElem1, InDone1, OutErr, OutErr1, OutElem1, OutDone1>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (error: OutErr) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
  ): Channel.Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1,
    OutElem | OutElem1,
    OutDone | OutDone1
  > =>
    core.catchAllCause(self, (cause) =>
      Either.match(Cause.failureOrCause(cause), {
        onLeft: f,
        onRight: core.failCause
      }))
)

/** @internal */
export const concatMap = dual<
  <OutElem, OutElem2, Env2, InErr2, InElem2, InDone2, OutErr2, _>(
    f: (o: OutElem) => Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, _>
  ) => <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<
    Env2 | Env,
    InErr & InErr2,
    InElem & InElem2,
    InDone & InDone2,
    OutErr2 | OutErr,
    OutElem2,
    unknown
  >,
  <Env, InErr, InElem, InDone, OutErr, OutDone, OutElem, OutElem2, Env2, InErr2, InElem2, InDone2, OutErr2, _>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (o: OutElem) => Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, _>
  ) => Channel.Channel<
    Env2 | Env,
    InErr & InErr2,
    InElem & InElem2,
    InDone & InDone2,
    OutErr2 | OutErr,
    OutElem2,
    unknown
  >
>(2, <Env, InErr, InElem, InDone, OutErr, OutDone, OutElem, OutElem2, Env2, InErr2, InElem2, InDone2, OutErr2, _>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, _>
): Channel.Channel<
  Env | Env2,
  InErr & InErr2,
  InElem & InElem2,
  InDone & InDone2,
  OutErr | OutErr2,
  OutElem2,
  unknown
> => core.concatMapWith(self, f, () => void 0, () => void 0))

/** @internal */
export const collect = dual<
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutElem2, OutDone>(
    pf: (o: OutElem) => Option.Option<OutElem2>
  ) => (
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone>,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutElem2, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    pf: (o: OutElem) => Option.Option<OutElem2>
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone>
>(2, <Env, InErr, InElem, InDone, OutErr, OutElem, OutElem2, OutDone>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  pf: (o: OutElem) => Option.Option<OutElem2>
): Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> => {
  const collector: Channel.Channel<Env, OutErr, OutElem, OutDone, OutErr, OutElem2, OutDone> = core
    .readWith({
      onInput: (out) =>
        Option.match(pf(out), {
          onNone: () => collector,
          onSome: (out2) => core.flatMap(core.write(out2), () => collector)
        }),
      onFailure: core.fail,
      onDone: core.succeedNow
    })
  return core.pipeTo(self, collector)
})

/** @internal */
export const concatOut = <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, unknown>,
    OutDone
  >
): Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, unknown> => core.concatAll(self)

/** @internal */
export const mapInput = dual<
  <InDone0, InDone>(
    f: (a: InDone0) => InDone
  ) => <Env, InErr, InElem, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone>,
  <Env, InErr, InElem, OutErr, OutElem, OutDone, InDone0, InDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (a: InDone0) => InDone
  ) => Channel.Channel<Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone>
>(2, <Env, InErr, InElem, OutErr, OutElem, OutDone, InDone0, InDone>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InDone0) => InDone
): Channel.Channel<Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone> => {
  const reader: Channel.Channel<never, InErr, InElem, InDone0, InErr, InElem, InDone> = core.readWith({
    onInput: (inElem: InElem) => core.flatMap(core.write(inElem), () => reader),
    onFailure: core.fail,
    onDone: (done: InDone0) => core.succeedNow(f(done))
  })
  return core.pipeTo(reader, self)
})

/** @internal */
export const mapInputEffect = dual<
  <Env1, InErr, InDone0, InDone>(
    f: (i: InDone0) => Effect.Effect<Env1, InErr, InDone>
  ) => <Env, InElem, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env1 | Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone>,
  <Env, InElem, OutErr, OutElem, OutDone, Env1, InErr, InDone0, InDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (i: InDone0) => Effect.Effect<Env1, InErr, InDone>
  ) => Channel.Channel<Env1 | Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone>
>(2, <Env, InElem, OutErr, OutElem, OutDone, Env1, InErr, InDone0, InDone>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (i: InDone0) => Effect.Effect<Env1, InErr, InDone>
): Channel.Channel<Env | Env1, InErr, InElem, InDone0, OutErr, OutElem, OutDone> => {
  const reader: Channel.Channel<Env1, InErr, InElem, InDone0, InErr, InElem, InDone> = core.readWith({
    onInput: (inElem) => core.flatMap(core.write(inElem), () => reader),
    onFailure: core.fail,
    onDone: (done) => core.fromEffect(f(done))
  })
  return core.pipeTo(reader, self)
})

/** @internal */
export const mapInputError = dual<
  <InErr0, InErr>(
    f: (a: InErr0) => InErr
  ) => <Env, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env, InErr0, InElem, InDone, OutErr, OutElem, OutDone>,
  <Env, InElem, InDone, OutErr, OutElem, OutDone, InErr0, InErr>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (a: InErr0) => InErr
  ) => Channel.Channel<Env, InErr0, InElem, InDone, OutErr, OutElem, OutDone>
>(2, <Env, InElem, InDone, OutErr, OutElem, OutDone, InErr0, InErr>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InErr0) => InErr
): Channel.Channel<Env, InErr0, InElem, InDone, OutErr, OutElem, OutDone> => {
  const reader: Channel.Channel<never, InErr0, InElem, InDone, InErr, InElem, InDone> = core.readWith({
    onInput: (inElem: InElem) => core.flatMap(core.write(inElem), () => reader),
    onFailure: (error) => core.fail(f(error)),
    onDone: core.succeedNow
  })
  return core.pipeTo(reader, self)
})

/** @internal */
export const mapInputErrorEffect = dual<
  <Env1, InErr0, InErr, InDone>(
    f: (error: InErr0) => Effect.Effect<Env1, InErr, InDone>
  ) => <Env, InElem, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env1 | Env, InErr0, InElem, InDone, OutErr, OutElem, OutDone>,
  <Env, InElem, OutErr, OutElem, OutDone, Env1, InErr0, InErr, InDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (error: InErr0) => Effect.Effect<Env1, InErr, InDone>
  ) => Channel.Channel<Env1 | Env, InErr0, InElem, InDone, OutErr, OutElem, OutDone>
>(2, <Env, InElem, OutErr, OutElem, OutDone, Env1, InErr0, InErr, InDone>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (error: InErr0) => Effect.Effect<Env1, InErr, InDone>
): Channel.Channel<Env | Env1, InErr0, InElem, InDone, OutErr, OutElem, OutDone> => {
  const reader: Channel.Channel<Env1, InErr0, InElem, InDone, InErr, InElem, InDone> = core.readWith({
    onInput: (inElem) => core.flatMap(core.write(inElem), () => reader),
    onFailure: (error) => core.fromEffect(f(error)),
    onDone: core.succeedNow
  })
  return core.pipeTo(reader, self)
})

/** @internal */
export const mapInputIn = dual<
  <InElem0, InElem>(
    f: (a: InElem0) => InElem
  ) => <Env, InErr, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone>,
  <Env, InErr, InDone, OutErr, OutElem, OutDone, InElem0, InElem>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (a: InElem0) => InElem
  ) => Channel.Channel<Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone>
>(2, <Env, InErr, InDone, OutErr, OutElem, OutDone, InElem0, InElem>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InElem0) => InElem
): Channel.Channel<Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone> => {
  const reader: Channel.Channel<never, InErr, InElem0, InDone, InErr, InElem, InDone> = core.readWith({
    onInput: (inElem) => core.flatMap(core.write(f(inElem)), () => reader),
    onFailure: core.fail,
    onDone: core.succeedNow
  })
  return core.pipeTo(reader, self)
})

/** @internal */
export const mapInputInEffect = dual<
  <Env1, InErr, InElem0, InElem>(
    f: (a: InElem0) => Effect.Effect<Env1, InErr, InElem>
  ) => <Env, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env1 | Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone>,
  <Env, InDone, OutErr, OutElem, OutDone, Env1, InErr, InElem0, InElem>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (a: InElem0) => Effect.Effect<Env1, InErr, InElem>
  ) => Channel.Channel<Env1 | Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone>
>(2, <Env, InDone, OutErr, OutElem, OutDone, Env1, InErr, InElem0, InElem>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InElem0) => Effect.Effect<Env1, InErr, InElem>
): Channel.Channel<Env | Env1, InErr, InElem0, InDone, OutErr, OutElem, OutDone> => {
  const reader: Channel.Channel<Env1, InErr, InElem0, InDone, InErr, InElem, InDone> = core.readWith({
    onInput: (inElem) => core.flatMap(core.flatMap(core.fromEffect(f(inElem)), core.write), () => reader),
    onFailure: core.fail,
    onDone: core.succeedNow
  })
  return core.pipeTo(reader, self)
})

/** @internal */
export const doneCollect = <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel.Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  never,
  [Chunk.Chunk<OutElem>, OutDone]
> =>
  core.suspend(() => {
    const builder: Array<OutElem> = []
    return pipe(
      core.pipeTo(self, doneCollectReader<Env, OutErr, OutElem, OutDone>(builder)),
      core.flatMap((outDone) => core.succeed([Chunk.unsafeFromArray(builder), outDone]))
    )
  })

/** @internal */
const doneCollectReader = <Env, OutErr, OutElem, OutDone>(
  builder: Array<OutElem>
): Channel.Channel<Env, OutErr, OutElem, OutDone, OutErr, never, OutDone> => {
  return core.readWith({
    onInput: (outElem) =>
      core.flatMap(
        core.sync(() => {
          builder.push(outElem)
        }),
        () => doneCollectReader<Env, OutErr, OutElem, OutDone>(builder)
      ),
    onFailure: core.fail,
    onDone: core.succeed
  })
}

/** @internal */
export const drain = <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel.Channel<Env, InErr, InElem, InDone, OutErr, never, OutDone> => {
  const drainer: Channel.Channel<Env, OutErr, OutElem, OutDone, OutErr, never, OutDone> = core
    .readWithCause({
      onInput: () => drainer,
      onFailure: core.failCause,
      onDone: core.succeed
    })
  return core.pipeTo(self, drainer)
}

/** @internal */
export const emitCollect = <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel.Channel<Env, InErr, InElem, InDone, OutErr, [Chunk.Chunk<OutElem>, OutDone], void> =>
  core.flatMap(doneCollect(self), core.write)

/** @internal */
export const ensuring = dual<
  <Env1, Z>(
    finalizer: Effect.Effect<Env1, never, Z>
  ) => <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env1 | Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, Z>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    finalizer: Effect.Effect<Env1, never, Z>
  ) => Channel.Channel<Env1 | Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
>(2, <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, Z>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  finalizer: Effect.Effect<Env1, never, Z>
): Channel.Channel<Env | Env1, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
  core.ensuringWith(self, () => finalizer))

/** @internal */
export const context = <Env>(): Channel.Channel<
  Env,
  unknown,
  unknown,
  unknown,
  never,
  never,
  Context.Context<Env>
> => core.fromEffect(Effect.context<Env>())

/** @internal */
export const contextWith = <Env, OutDone>(
  f: (env: Context.Context<Env>) => OutDone
): Channel.Channel<Env, unknown, unknown, unknown, never, never, OutDone> => map(context<Env>(), f)

/** @internal */
export const contextWithChannel = <
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  f: (env: Context.Context<Env>) => Channel.Channel<Env1, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel.Channel<Env | Env1, InErr, InElem, InDone, OutErr, OutElem, OutDone> => core.flatMap(context<Env>(), f)

/** @internal */
export const contextWithEffect = <Env, Env1, OutErr, OutDone>(
  f: (env: Context.Context<Env>) => Effect.Effect<Env1, OutErr, OutDone>
): Channel.Channel<Env | Env1, unknown, unknown, unknown, OutErr, never, OutDone> => mapEffect(context<Env>(), f)

/** @internal */
export const flatten = <
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  OutDone2
>(
  self: Channel.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    OutElem,
    Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
  >
): Channel.Channel<
  Env | Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone2
> => core.flatMap(self, identity)

/** @internal */
export const foldChannel = dual<
  <
    Env1,
    Env2,
    InErr1,
    InErr2,
    InElem1,
    InElem2,
    InDone1,
    InDone2,
    OutErr,
    OutErr1,
    OutErr2,
    OutElem1,
    OutElem2,
    OutDone,
    OutDone1,
    OutDone2
  >(
    options: {
      readonly onFailure: (
        error: OutErr
      ) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
      readonly onSuccess: (
        done: OutDone
      ) => Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone2>
    }
  ) => <Env, InErr, InElem, InDone, OutElem>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<
    Env1 | Env2 | Env,
    InErr & InErr1 & InErr2,
    InElem & InElem1 & InElem2,
    InDone & InDone1 & InDone2,
    OutErr1 | OutErr2,
    OutElem1 | OutElem2 | OutElem,
    OutDone1 | OutDone2
  >,
  <
    Env,
    InErr,
    InElem,
    InDone,
    OutElem,
    Env1,
    Env2,
    InErr1,
    InErr2,
    InElem1,
    InElem2,
    InDone1,
    InDone2,
    OutErr,
    OutErr1,
    OutErr2,
    OutElem1,
    OutElem2,
    OutDone,
    OutDone1,
    OutDone2
  >(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    options: {
      readonly onFailure: (
        error: OutErr
      ) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
      readonly onSuccess: (
        done: OutDone
      ) => Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone2>
    }
  ) => Channel.Channel<
    Env1 | Env2 | Env,
    InErr & InErr1 & InErr2,
    InElem & InElem1 & InElem2,
    InDone & InDone1 & InDone2,
    OutErr1 | OutErr2,
    OutElem1 | OutElem2 | OutElem,
    OutDone1 | OutDone2
  >
>(2, <
  Env,
  InErr,
  InElem,
  InDone,
  OutElem,
  Env1,
  Env2,
  InErr1,
  InErr2,
  InElem1,
  InElem2,
  InDone1,
  InDone2,
  OutErr,
  OutErr1,
  OutErr2,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone1,
  OutDone2
>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  options: {
    readonly onFailure: (error: OutErr) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
    readonly onSuccess: (done: OutDone) => Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone2>
  }
): Channel.Channel<
  Env | Env1 | Env2,
  InErr & InErr1 & InErr2,
  InElem & InElem1 & InElem2,
  InDone & InDone1 & InDone2,
  OutErr2 | OutErr1,
  OutElem | OutElem2 | OutElem1,
  OutDone2 | OutDone1
> =>
  core.foldCauseChannel(self, {
    onFailure: (cause) => {
      const either = Cause.failureOrCause(cause)
      switch (either._tag) {
        case "Left": {
          return options.onFailure(either.left)
        }
        case "Right": {
          return core.failCause(either.right)
        }
      }
    },
    onSuccess: options.onSuccess
  }))

/** @internal */
export const fromEither = <E, A>(
  either: Either.Either<E, A>
): Channel.Channel<never, unknown, unknown, unknown, E, never, A> =>
  core.suspend(() => Either.match(either, { onLeft: core.fail, onRight: core.succeed }))

/** @internal */
export const fromInput = <Err, Elem, Done>(
  input: SingleProducerAsyncInput.AsyncInputConsumer<Err, Elem, Done>
): Channel.Channel<never, unknown, unknown, unknown, Err, Elem, Done> =>
  unwrap(
    input.takeWith(
      core.failCause,
      (elem) => core.flatMap(core.write(elem), () => fromInput(input)),
      core.succeed
    )
  )

/** @internal */
export const fromPubSub = <Err, Done, Elem>(
  pubsub: PubSub.PubSub<Either.Either<Exit.Exit<Err, Done>, Elem>>
): Channel.Channel<never, unknown, unknown, unknown, Err, Elem, Done> =>
  unwrapScoped(Effect.map(PubSub.subscribe(pubsub), fromQueue))

/** @internal */
export const fromPubSubScoped = <Err, Done, Elem>(
  pubsub: PubSub.PubSub<Either.Either<Exit.Exit<Err, Done>, Elem>>
): Effect.Effect<Scope.Scope, never, Channel.Channel<never, unknown, unknown, unknown, Err, Elem, Done>> =>
  Effect.map(PubSub.subscribe(pubsub), fromQueue)

/** @internal */
export const fromOption = <A>(
  option: Option.Option<A>
): Channel.Channel<never, unknown, unknown, unknown, Option.Option<never>, never, A> =>
  core.suspend(() =>
    Option.match(option, {
      onNone: () => core.fail(Option.none()),
      onSome: core.succeed
    })
  )

/** @internal */
export const fromQueue = <Err, Elem, Done>(
  queue: Queue.Dequeue<Either.Either<Exit.Exit<Err, Done>, Elem>>
): Channel.Channel<never, unknown, unknown, unknown, Err, Elem, Done> => core.suspend(() => fromQueueInternal(queue))

/** @internal */
const fromQueueInternal = <Err, Elem, Done>(
  queue: Queue.Dequeue<Either.Either<Exit.Exit<Err, Done>, Elem>>
): Channel.Channel<never, unknown, unknown, unknown, Err, Elem, Done> =>
  pipe(
    core.fromEffect(Queue.take(queue)),
    core.flatMap(Either.match({
      onLeft: Exit.match({
        onFailure: core.failCause,
        onSuccess: core.succeedNow
      }),
      onRight: (elem) =>
        core.flatMap(
          core.write(elem),
          () => fromQueueInternal<Err, Elem, Done>(queue)
        )
    }))
  )

/** @internal */
export const identityChannel = <Err, Elem, Done>(): Channel.Channel<never, Err, Elem, Done, Err, Elem, Done> =>
  core.readWith({
    onInput: (input: Elem) => core.flatMap(core.write(input), () => identityChannel<Err, Elem, Done>()),
    onFailure: core.fail,
    onDone: core.succeedNow
  })

/** @internal */
export const interruptWhen = dual<
  <Env1, OutErr1, OutDone1>(
    effect: Effect.Effect<Env1, OutErr1, OutDone1>
  ) => <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env1 | Env, InErr, InElem, InDone, OutErr1 | OutErr, OutElem, OutDone1 | OutDone>,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, OutErr1, OutDone1>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    effect: Effect.Effect<Env1, OutErr1, OutDone1>
  ) => Channel.Channel<Env1 | Env, InErr, InElem, InDone, OutErr1 | OutErr, OutElem, OutDone1 | OutDone>
>(2, <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, OutErr1, OutDone1>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  effect: Effect.Effect<Env1, OutErr1, OutDone1>
): Channel.Channel<
  Env1 | Env,
  InErr,
  InElem,
  InDone,
  OutErr | OutErr1,
  OutElem,
  OutDone | OutDone1
> =>
  mergeWith(self, {
    other: core.fromEffect(effect),
    onSelfDone: (selfDone) => mergeDecision.Done(Effect.suspend(() => selfDone)),
    onOtherDone: (effectDone) => mergeDecision.Done(Effect.suspend(() => effectDone))
  }))

/** @internal */
export const interruptWhenDeferred = dual<
  <OutErr1, OutDone1>(
    deferred: Deferred.Deferred<OutErr1, OutDone1>
  ) => <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr1 | OutErr, OutElem, OutDone1 | OutDone>,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutErr1, OutDone1>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    deferred: Deferred.Deferred<OutErr1, OutDone1>
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr1 | OutErr, OutElem, OutDone1 | OutDone>
>(2, <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutErr1, OutDone1>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  deferred: Deferred.Deferred<OutErr1, OutDone1>
): Channel.Channel<Env, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone | OutDone1> =>
  interruptWhen(self, Deferred.await(deferred)))

/** @internal */
export const map = dual<
  <OutDone, OutDone2>(
    f: (out: OutDone) => OutDone2
  ) => <Env, InErr, InElem, InDone, OutErr, OutElem>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutDone2>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (out: OutDone) => OutDone2
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>
>(2, <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutDone2>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (out: OutDone) => OutDone2
): Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2> =>
  core.flatMap(self, (a) => core.sync(() => f(a))))

/** @internal */
export const mapEffect = dual<
  <Env1, OutErr1, OutDone, OutDone1>(
    f: (o: OutDone) => Effect.Effect<Env1, OutErr1, OutDone1>
  ) => <Env, InErr, InElem, InDone, OutErr, OutElem>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env1 | Env, InErr, InElem, InDone, OutErr1 | OutErr, OutElem, OutDone1>,
  <Env, InErr, InElem, InDone, OutErr, OutElem, Env1, OutErr1, OutDone, OutDone1>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (o: OutDone) => Effect.Effect<Env1, OutErr1, OutDone1>
  ) => Channel.Channel<Env1 | Env, InErr, InElem, InDone, OutErr1 | OutErr, OutElem, OutDone1>
>(2, <Env, InErr, InElem, InDone, OutErr, OutElem, Env1, OutErr1, OutDone, OutDone1>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutDone) => Effect.Effect<Env1, OutErr1, OutDone1>
): Channel.Channel<Env | Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone1> =>
  core.flatMap(self, (z) => core.fromEffect(f(z))))

/** @internal */
export const mapError = dual<
  <OutErr, OutErr2>(
    f: (err: OutErr) => OutErr2
  ) => <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone>,
  <Env, InErr, InElem, InDone, OutElem, OutDone, OutErr, OutErr2>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (err: OutErr) => OutErr2
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone>
>(2, <Env, InErr, InElem, InDone, OutElem, OutDone, OutErr, OutErr2>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (err: OutErr) => OutErr2
): Channel.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone> => mapErrorCause(self, Cause.map(f)))

/** @internal */
export const mapErrorCause = dual<
  <OutErr, OutErr2>(
    f: (cause: Cause.Cause<OutErr>) => Cause.Cause<OutErr2>
  ) => <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone>,
  <Env, InErr, InElem, InDone, OutElem, OutDone, OutErr, OutErr2>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (cause: Cause.Cause<OutErr>) => Cause.Cause<OutErr2>
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone>
>(2, <Env, InErr, InElem, InDone, OutElem, OutDone, OutErr, OutErr2>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (cause: Cause.Cause<OutErr>) => Cause.Cause<OutErr2>
): Channel.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone> =>
  core.catchAllCause(self, (cause) => core.failCause(f(cause))))

/** @internal */
export const mapOut = dual<
  <OutElem, OutElem2>(
    f: (o: OutElem) => OutElem2
  ) => <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone>,
  <Env, InErr, InElem, InDone, OutErr, OutDone, OutElem, OutElem2>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (o: OutElem) => OutElem2
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone>
>(2, <Env, InErr, InElem, InDone, OutErr, OutDone, OutElem, OutElem2>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => OutElem2
): Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> => {
  const reader: Channel.Channel<Env, OutErr, OutElem, OutDone, OutErr, OutElem2, OutDone> = core
    .readWith({
      onInput: (outElem) => core.flatMap(core.write(f(outElem)), () => reader),
      onFailure: core.fail,
      onDone: core.succeedNow
    })
  return core.pipeTo(self, reader)
})

/** @internal */
export const mapOutEffect = dual<
  <OutElem, Env1, OutErr1, OutElem1>(
    f: (o: OutElem) => Effect.Effect<Env1, OutErr1, OutElem1>
  ) => <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env1 | Env, InErr, InElem, InDone, OutErr1 | OutErr, OutElem1, OutDone>,
  <Env, InErr, InElem, InDone, OutErr, OutDone, OutElem, Env1, OutErr1, OutElem1>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (o: OutElem) => Effect.Effect<Env1, OutErr1, OutElem1>
  ) => Channel.Channel<Env1 | Env, InErr, InElem, InDone, OutErr1 | OutErr, OutElem1, OutDone>
>(2, <Env, InErr, InElem, InDone, OutErr, OutDone, OutElem, Env1, OutErr1, OutElem1>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => Effect.Effect<Env1, OutErr1, OutElem1>
): Channel.Channel<Env | Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem1, OutDone> => {
  const reader: Channel.Channel<Env | Env1, OutErr, OutElem, OutDone, OutErr | OutErr1, OutElem1, OutDone> = core
    .readWithCause({
      onInput: (outElem) =>
        pipe(
          core.fromEffect(f(outElem)),
          core.flatMap(core.write),
          core.flatMap(() => reader)
        ),
      onFailure: core.failCause,
      onDone: core.succeedNow
    })
  return core.pipeTo(self, reader)
})

/** @internal */
export const mapOutEffectPar = dual<
  <OutElem, Env1, OutErr1, OutElem1>(
    f: (o: OutElem) => Effect.Effect<Env1, OutErr1, OutElem1>,
    n: number
  ) => <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env1 | Env, InErr, InElem, InDone, OutErr1 | OutErr, OutElem1, OutDone>,
  <Env, InErr, InElem, InDone, OutErr, OutDone, OutElem, Env1, OutErr1, OutElem1>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (o: OutElem) => Effect.Effect<Env1, OutErr1, OutElem1>,
    n: number
  ) => Channel.Channel<Env1 | Env, InErr, InElem, InDone, OutErr1 | OutErr, OutElem1, OutDone>
>(3, <Env, InErr, InElem, InDone, OutErr, OutDone, OutElem, Env1, OutErr1, OutElem1>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => Effect.Effect<Env1, OutErr1, OutElem1>,
  n: number
): Channel.Channel<Env | Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem1, OutDone> =>
  pipe(
    Effect.gen(function*($) {
      const queue = yield* $(
        Effect.acquireRelease(
          Queue.bounded<Effect.Effect<Env1, OutErr | OutErr1, Either.Either<OutDone, OutElem1>>>(n),
          (queue) => Queue.shutdown(queue)
        )
      )
      const errorSignal = yield* $(Deferred.make<OutErr1, never>())
      const withPermits = n === Number.POSITIVE_INFINITY ?
        ((_: number) => identity) :
        (yield* $(Effect.makeSemaphore(n))).withPermits
      const pull = yield* $(toPull(self))
      yield* $(
        Effect.matchCauseEffect(pull, {
          onFailure: (cause) => Queue.offer(queue, Effect.failCause(cause)),
          onSuccess: (either) =>
            Either.match(
              either,
              {
                onLeft: (outDone) => {
                  const lock = withPermits(n)
                  return Effect.zipRight(
                    Effect.interruptible(lock(Effect.unit)),
                    Effect.asUnit(Queue.offer(
                      queue,
                      Effect.succeed(Either.left(outDone))
                    ))
                  )
                },
                onRight: (outElem) =>
                  Effect.gen(function*($) {
                    const deferred = yield* $(Deferred.make<OutErr1, OutElem1>())
                    const latch = yield* $(Deferred.make<never, void>())
                    yield* $(Effect.asUnit(Queue.offer(
                      queue,
                      Effect.map(Deferred.await(deferred), Either.right)
                    )))
                    yield* $(
                      Deferred.succeed<never, void>(latch, void 0),
                      Effect.zipRight(
                        pipe(
                          Effect.uninterruptibleMask((restore) =>
                            pipe(
                              Effect.exit(restore(Deferred.await(errorSignal))),
                              Effect.raceFirst(Effect.exit(restore(f(outElem)))),
                              // TODO: remove
                              Effect.flatMap((exit) => Effect.suspend(() => exit))
                            )
                          ),
                          Effect.tapErrorCause((cause) => Deferred.failCause(errorSignal, cause)),
                          Effect.intoDeferred(deferred)
                        )
                      ),
                      withPermits(1),
                      Effect.forkScoped
                    )
                    yield* $(Deferred.await(latch))
                  })
              }
            )
        }),
        Effect.forever,
        Effect.interruptible,
        Effect.forkScoped
      )
      return queue
    }),
    Effect.map((queue) => {
      const consumer: Channel.Channel<
        Env1,
        unknown,
        unknown,
        unknown,
        OutErr | OutErr1,
        OutElem1,
        OutDone
      > = unwrap(
        Effect.matchCause(Effect.flatten(Queue.take(queue)), {
          onFailure: core.failCause,
          onSuccess: Either.match({
            onLeft: core.succeedNow,
            onRight: (outElem) => core.flatMap(core.write(outElem), () => consumer)
          })
        })
      )
      return consumer
    }),
    unwrapScoped
  ))

/** @internal */
export const mergeAll = (
  options: {
    readonly concurrency: number | "unbounded"
    readonly bufferSize?: number | undefined
    readonly mergeStrategy?: MergeStrategy.MergeStrategy | undefined
  }
) => {
  return <
    Env,
    Env1,
    InErr,
    InErr1,
    InElem,
    InElem1,
    InDone,
    InDone1,
    OutErr,
    OutErr1,
    OutElem
  >(
    channels: Channel.Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, unknown>,
      unknown
    >
  ): Channel.Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem,
    unknown
  > => mergeAllWith(options)(channels, constVoid)
}

/** @internal */
export const mergeAllUnbounded = <
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem
>(
  channels: Channel.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, unknown>,
    unknown
  >
): Channel.Channel<
  Env | Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem,
  unknown
> => mergeAllWith({ concurrency: "unbounded" })(channels, constVoid)

/** @internal */
export const mergeAllUnboundedWith = <
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem,
  OutDone
>(
  channels: Channel.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, OutDone>,
    OutDone
  >,
  f: (o1: OutDone, o2: OutDone) => OutDone
): Channel.Channel<
  Env | Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem,
  OutDone
> => mergeAllWith({ concurrency: "unbounded" })(channels, f)

/** @internal */
export const mergeAllWith = (
  {
    bufferSize = 16,
    concurrency,
    mergeStrategy = _mergeStrategy.BackPressure()
  }: {
    readonly concurrency: number | "unbounded"
    readonly bufferSize?: number | undefined
    readonly mergeStrategy?: MergeStrategy.MergeStrategy | undefined
  }
) =>
<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem,
  OutDone
>(
  channels: Channel.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem, OutDone>,
    OutDone
  >,
  f: (o1: OutDone, o2: OutDone) => OutDone
): Channel.Channel<
  Env | Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem,
  OutDone
> =>
  pipe(
    Effect.gen(function*($) {
      const concurrencyN = concurrency === "unbounded" ? Number.MAX_SAFE_INTEGER : concurrency
      const input = yield* $(singleProducerAsyncInput.make<
        InErr & InErr1,
        InElem & InElem1,
        InDone & InDone1
      >())
      const queueReader = fromInput(input)
      const queue = yield* $(
        Effect.acquireRelease(
          Queue.bounded<Effect.Effect<Env, OutErr | OutErr1, Either.Either<OutDone, OutElem>>>(bufferSize),
          (queue) => Queue.shutdown(queue)
        )
      )
      const cancelers = yield* $(
        Effect.acquireRelease(
          Queue.unbounded<Deferred.Deferred<never, void>>(),
          (queue) => Queue.shutdown(queue)
        )
      )
      const lastDone = yield* $(Ref.make<Option.Option<OutDone>>(Option.none()))
      const errorSignal = yield* $(Deferred.make<never, void>())
      const withPermits = (yield* $(Effect.makeSemaphore(concurrencyN)))
        .withPermits
      const pull = yield* $(toPull(channels))
      const evaluatePull = (
        pull: Effect.Effect<Env | Env1, OutErr | OutErr1, Either.Either<OutDone, OutElem>>
      ) =>
        pipe(
          Effect.flatMap(
            pull,
            Either.match({
              onLeft: (done) => Effect.succeed(Option.some(done)),
              onRight: (outElem) =>
                Effect.as(
                  Queue.offer(queue, Effect.succeed(Either.right(outElem))),
                  Option.none()
                )
            })
          ),
          Effect.repeatUntil(Option.isSome),
          Effect.flatMap((outDone) =>
            Ref.update(
              lastDone,
              Option.match({
                onNone: () => Option.some(outDone.value),
                onSome: (lastDone) => Option.some(f(lastDone, outDone.value))
              })
            )
          ),
          Effect.catchAllCause((cause) =>
            Cause.isInterrupted(cause) ?
              Effect.failCause(cause) :
              pipe(
                Queue.offer(queue, Effect.failCause(cause)),
                Effect.zipRight(Deferred.succeed(errorSignal, void 0)),
                Effect.asUnit
              )
          )
        )
      yield* $(
        Effect.matchCauseEffect(pull, {
          onFailure: (cause) =>
            pipe(
              Queue.offer(queue, Effect.failCause(cause)),
              Effect.zipRight(Effect.succeed(false))
            ),
          onSuccess: Either.match({
            onLeft: (outDone) =>
              Effect.raceWith(Deferred.await(errorSignal), withPermits(concurrencyN)(Effect.unit), {
                onSelfDone: (_, permitAcquisition) => Effect.as(Fiber.interrupt(permitAcquisition), false),
                onOtherDone: (_, failureAwait) =>
                  Effect.zipRight(
                    Fiber.interrupt(failureAwait),
                    pipe(
                      Ref.get(lastDone),
                      Effect.flatMap(Option.match({
                        onNone: () => Queue.offer(queue, Effect.succeed(Either.left(outDone))),
                        onSome: (lastDone) => Queue.offer(queue, Effect.succeed(Either.left(f(lastDone, outDone))))
                      })),
                      Effect.as(false)
                    )
                  )
              }),
            onRight: (channel) =>
              _mergeStrategy.match(mergeStrategy, {
                onBackPressure: () =>
                  Effect.gen(function*($) {
                    const latch = yield* $(Deferred.make<never, void>())
                    const raceEffects: Effect.Effect<Env | Env1, OutErr | OutErr1, void> = pipe(
                      queueReader,
                      core.pipeTo(channel),
                      toPull,
                      Effect.flatMap((pull) =>
                        Effect.race(
                          evaluatePull(pull),
                          Deferred.await(errorSignal)
                        )
                      ),
                      Effect.scoped
                    )
                    yield* $(
                      Deferred.succeed<never, void>(latch, void 0),
                      Effect.zipRight(raceEffects),
                      withPermits(1),
                      Effect.forkScoped
                    )
                    yield* $(Deferred.await(latch))
                    const errored = yield* $(Deferred.isDone(errorSignal))
                    return !errored
                  }),
                onBufferSliding: () =>
                  Effect.gen(function*($) {
                    const canceler = yield* $(Deferred.make<never, void>())
                    const latch = yield* $(Deferred.make<never, void>())
                    const size = yield* $(Queue.size(cancelers))
                    yield* $(
                      Queue.take(cancelers),
                      Effect.flatMap((_) => Deferred.succeed<never, void>(_, void 0)),
                      Effect.when(() => size >= concurrencyN)
                    )
                    yield* $(Queue.offer(cancelers, canceler))
                    const raceEffects: Effect.Effect<Env | Env1, OutErr | OutErr1, void> = pipe(
                      queueReader,
                      core.pipeTo(channel),
                      toPull,
                      Effect.flatMap((pull) =>
                        pipe(
                          evaluatePull(pull),
                          Effect.race(Deferred.await(errorSignal)),
                          Effect.race(Deferred.await(canceler))
                        )
                      ),
                      Effect.scoped
                    )
                    yield* $(
                      Deferred.succeed<never, void>(latch, void 0),
                      Effect.zipRight(raceEffects),
                      withPermits(1),
                      Effect.forkScoped
                    )
                    yield* $(Deferred.await(latch))
                    const errored = yield* $(Deferred.isDone(errorSignal))
                    return !errored
                  })
              })
          })
        }),
        Effect.repeatWhile(identity),
        Effect.forkScoped
      )
      return [queue, input] as const
    }),
    Effect.map(([queue, input]) => {
      const consumer: Channel.Channel<
        Env | Env1,
        unknown,
        unknown,
        unknown,
        OutErr | OutErr1,
        OutElem,
        OutDone
      > = pipe(
        Queue.take(queue),
        Effect.flatten,
        Effect.matchCause({
          onFailure: core.failCause,
          onSuccess: Either.match({
            onLeft: core.succeedNow,
            onRight: (outElem) => core.flatMap(core.write(outElem), () => consumer)
          })
        }),
        unwrap
      )
      return core.embedInput(consumer, input)
    }),
    unwrapScoped
  )

/** @internal */
export const mergeMap = dual<
  <OutElem, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>(
    f: (outElem: OutElem) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>,
    options: {
      readonly concurrency: number | "unbounded"
      readonly bufferSize?: number | undefined
      readonly mergeStrategy?: MergeStrategy.MergeStrategy | undefined
    }
  ) => <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1 | OutErr,
    OutElem1,
    unknown
  >,
  <Env, InErr, InElem, InDone, OutErr, OutDone, OutElem, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (outElem: OutElem) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>,
    options: {
      readonly concurrency: number | "unbounded"
      readonly bufferSize?: number | undefined
      readonly mergeStrategy?: MergeStrategy.MergeStrategy | undefined
    }
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1 | OutErr,
    OutElem1,
    unknown
  >
>(3, <Env, InErr, InElem, InDone, OutErr, OutDone, OutElem, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (outElem: OutElem) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>,
  options: {
    readonly concurrency: number | "unbounded"
    readonly bufferSize?: number | undefined
    readonly mergeStrategy?: MergeStrategy.MergeStrategy | undefined
  }
): Channel.Channel<
  Env | Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem1,
  unknown
> => mergeAll(options)(mapOut(self, f)))

/** @internal */
export const mergeOut = dual<
  (
    n: number
  ) => <Env, Env1, InErr, InErr1, InElem, InElem1, InDone, InDone1, OutErr, OutErr1, OutElem1, OutDone, Z>(
    self: Channel.Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>,
      OutDone
    >
  ) => Channel.Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem1,
    unknown
  >,
  <Env, Env1, InErr, InErr1, InElem, InElem1, InDone, InDone1, OutErr, OutErr1, OutElem1, OutDone, Z>(
    self: Channel.Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>,
      OutDone
    >,
    n: number
  ) => Channel.Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem1,
    unknown
  >
>(2, <Env, Env1, InErr, InErr1, InElem, InElem1, InDone, InDone1, OutErr, OutErr1, OutElem1, OutDone, Z>(
  self: Channel.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>,
    OutDone
  >,
  n: number
): Channel.Channel<
  Env | Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem1,
  unknown
> => mergeAll({ concurrency: n })(mapOut(self, identity)))

/** @internal */
export const mergeOutWith = dual<
  <OutDone1>(
    n: number,
    f: (o1: OutDone1, o2: OutDone1) => OutDone1
  ) => <Env, Env1, InErr, InErr1, InElem, InElem1, InDone, InDone1, OutErr, OutErr1, OutElem1>(
    self: Channel.Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
      OutDone1
    >
  ) => Channel.Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem1,
    OutDone1
  >,
  <Env, Env1, InErr, InErr1, InElem, InElem1, InDone, InDone1, OutErr, OutErr1, OutElem1, OutDone1>(
    self: Channel.Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
      OutDone1
    >,
    n: number,
    f: (o1: OutDone1, o2: OutDone1) => OutDone1
  ) => Channel.Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem1,
    OutDone1
  >
>(3, <Env, Env1, InErr, InErr1, InElem, InElem1, InDone, InDone1, OutErr, OutErr1, OutElem1, OutDone1>(
  self: Channel.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
    OutDone1
  >,
  n: number,
  f: (o1: OutDone1, o2: OutDone1) => OutDone1
): Channel.Channel<
  Env | Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem1,
  OutDone1
> => mergeAllWith({ concurrency: n })(mapOut(self, identity), f))

/** @internal */
export const mergeWith = dual<
  <Env1, InErr1, InElem1, InDone1, OutErr, OutErr1, OutErr2, OutErr3, OutElem1, OutDone, OutDone1, OutDone2, OutDone3>(
    options: {
      readonly other: Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
      readonly onSelfDone: (
        exit: Exit.Exit<OutErr, OutDone>
      ) => MergeDecision.MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>
      readonly onOtherDone: (
        ex: Exit.Exit<OutErr1, OutDone1>
      ) => MergeDecision.MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>
    }
  ) => <Env, InErr, InElem, InDone, OutElem>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr2 | OutErr3,
    OutElem1 | OutElem,
    OutDone2 | OutDone3
  >,
  <
    Env,
    InErr,
    InElem,
    InDone,
    OutElem,
    Env1,
    InErr1,
    InElem1,
    InDone1,
    OutErr,
    OutErr1,
    OutErr2,
    OutErr3,
    OutElem1,
    OutDone,
    OutDone1,
    OutDone2,
    OutDone3
  >(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    options: {
      readonly other: Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
      readonly onSelfDone: (
        exit: Exit.Exit<OutErr, OutDone>
      ) => MergeDecision.MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>
      readonly onOtherDone: (
        ex: Exit.Exit<OutErr1, OutDone1>
      ) => MergeDecision.MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>
    }
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr2 | OutErr3,
    OutElem1 | OutElem,
    OutDone2 | OutDone3
  >
>(2, <
  Env,
  InErr,
  InElem,
  InDone,
  OutElem,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr,
  OutErr1,
  OutErr2,
  OutErr3,
  OutElem1,
  OutDone,
  OutDone1,
  OutDone2,
  OutDone3
>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  options: {
    readonly other: Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
    readonly onSelfDone: (
      exit: Exit.Exit<OutErr, OutDone>
    ) => MergeDecision.MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>
    readonly onOtherDone: (
      ex: Exit.Exit<OutErr1, OutDone1>
    ) => MergeDecision.MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>
  }
): Channel.Channel<
  Env1 | Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr2 | OutErr3,
  OutElem | OutElem1,
  OutDone2 | OutDone3
> =>
  unwrapScoped(
    Effect.flatMap(
      singleProducerAsyncInput.make<
        InErr & InErr1,
        InElem & InElem1,
        InDone & InDone1
      >(),
      (input) => {
        const queueReader = fromInput(input)
        return Effect.map(
          Effect.zip(
            toPull(core.pipeTo(queueReader, self)),
            toPull(core.pipeTo(queueReader, options.other))
          ),
          ([pullL, pullR]) => {
            type State = MergeState.MergeState<
              Env | Env1,
              OutErr,
              OutErr1,
              OutErr2 | OutErr3,
              OutElem | OutElem1,
              OutDone,
              OutDone1,
              OutDone2 | OutDone3
            >

            const handleSide = <Err, Done, Err2, Done2>(
              exit: Exit.Exit<Err, Either.Either<Done, OutElem | OutElem1>>,
              fiber: Fiber.Fiber<Err2, Either.Either<Done2, OutElem | OutElem1>>,
              pull: Effect.Effect<Env | Env1, Err, Either.Either<Done, OutElem | OutElem1>>
            ) =>
            (
              done: (
                ex: Exit.Exit<Err, Done>
              ) => MergeDecision.MergeDecision<
                Env | Env1,
                Err2,
                Done2,
                OutErr2 | OutErr3,
                OutDone2 | OutDone3
              >,
              both: (
                f1: Fiber.Fiber<Err, Either.Either<Done, OutElem | OutElem1>>,
                f2: Fiber.Fiber<Err2, Either.Either<Done2, OutElem | OutElem1>>
              ) => State,
              single: (
                f: (
                  ex: Exit.Exit<Err2, Done2>
                ) => Effect.Effect<Env | Env1, OutErr2 | OutErr3, OutDone2 | OutDone3>
              ) => State
            ): Effect.Effect<
              Env | Env1,
              never,
              Channel.Channel<
                Env | Env1,
                unknown,
                unknown,
                unknown,
                OutErr2 | OutErr3,
                OutElem | OutElem1,
                OutDone2 | OutDone3
              >
            > => {
              const onDecision = (
                decision: MergeDecision.MergeDecision<
                  Env | Env1,
                  Err2,
                  Done2,
                  OutErr2 | OutErr3,
                  OutDone2 | OutDone3
                >
              ): Effect.Effect<
                never,
                never,
                Channel.Channel<
                  Env | Env1,
                  unknown,
                  unknown,
                  unknown,
                  OutErr2 | OutErr3,
                  OutElem | OutElem1,
                  OutDone2 | OutDone3
                >
              > => {
                const op = decision as mergeDecision.Primitive
                if (op._tag === MergeDecisionOpCodes.OP_DONE) {
                  return Effect.succeed(
                    core.fromEffect(
                      Effect.zipRight(
                        Fiber.interrupt(fiber),
                        op.effect
                      )
                    )
                  )
                }
                return Effect.map(
                  Fiber.await(fiber),
                  Exit.match({
                    onFailure: (cause) => core.fromEffect(op.f(Exit.failCause(cause))),
                    onSuccess: Either.match({
                      onLeft: (done) => core.fromEffect(op.f(Exit.succeed(done))),
                      onRight: (elem) => zipRight(core.write(elem), go(single(op.f)))
                    })
                  })
                )
              }

              return Exit.match(exit, {
                onFailure: (cause) => onDecision(done(Exit.failCause(cause))),
                onSuccess: Either.match({
                  onLeft: (z) => onDecision(done(Exit.succeed(z))),
                  onRight: (elem) =>
                    Effect.succeed(
                      core.flatMap(core.write(elem), () =>
                        core.flatMap(
                          core.fromEffect(Effect.forkDaemon(pull)),
                          (leftFiber) => go(both(leftFiber, fiber))
                        ))
                    )
                })
              })
            }

            const go = (
              state: State
            ): Channel.Channel<
              Env | Env1,
              unknown,
              unknown,
              unknown,
              OutErr2 | OutErr3,
              OutElem | OutElem1,
              OutDone2 | OutDone3
            > => {
              switch (state._tag) {
                case MergeStateOpCodes.OP_BOTH_RUNNING: {
                  const leftJoin = Effect.interruptible(Fiber.join(state.left))
                  const rightJoin = Effect.interruptible(Fiber.join(state.right))
                  return unwrap(
                    Effect.raceWith(leftJoin, rightJoin, {
                      onSelfDone: (leftExit, rf) =>
                        Effect.zipRight(
                          Fiber.interrupt(rf),
                          handleSide(leftExit, state.right, pullL)(
                            options.onSelfDone,
                            mergeState.BothRunning,
                            (f) => mergeState.LeftDone(f)
                          )
                        ),
                      onOtherDone: (rightExit, lf) =>
                        Effect.zipRight(
                          Fiber.interrupt(lf),
                          handleSide(rightExit, state.left, pullR)(
                            options.onOtherDone as (
                              ex: Exit.Exit<InErr1 | OutErr1, OutDone1>
                            ) => MergeDecision.MergeDecision<
                              Env1 | Env,
                              OutErr,
                              OutDone,
                              OutErr2 | OutErr3,
                              OutDone2 | OutDone3
                            >,
                            (left, right) => mergeState.BothRunning(right, left),
                            (f) => mergeState.RightDone(f)
                          )
                        )
                    })
                  )
                }
                case MergeStateOpCodes.OP_LEFT_DONE: {
                  return unwrap(
                    Effect.map(
                      Effect.exit(pullR),
                      Exit.match({
                        onFailure: (cause) => core.fromEffect(state.f(Exit.failCause(cause))),
                        onSuccess: Either.match({
                          onLeft: (done) => core.fromEffect(state.f(Exit.succeed(done))),
                          onRight: (elem) =>
                            core.flatMap(
                              core.write(elem),
                              () => go(mergeState.LeftDone(state.f))
                            )
                        })
                      })
                    )
                  )
                }
                case MergeStateOpCodes.OP_RIGHT_DONE: {
                  return unwrap(
                    Effect.map(
                      Effect.exit(pullL),
                      Exit.match({
                        onFailure: (cause) => core.fromEffect(state.f(Exit.failCause(cause))),
                        onSuccess: Either.match({
                          onLeft: (done) => core.fromEffect(state.f(Exit.succeed(done))),
                          onRight: (elem) =>
                            core.flatMap(
                              core.write(elem),
                              () => go(mergeState.RightDone(state.f))
                            )
                        })
                      })
                    )
                  )
                }
              }
            }

            return pipe(
              core.fromEffect(
                Effect.zipWith(
                  Effect.forkDaemon(pullL),
                  Effect.forkDaemon(pullR),
                  (left, right): State =>
                    mergeState.BothRunning<
                      Env | Env1,
                      OutErr,
                      OutErr1,
                      OutErr2 | OutErr3,
                      OutElem | OutElem1,
                      OutDone,
                      OutDone1,
                      OutDone2 | OutDone3
                    >(left, right)
                )
              ),
              core.flatMap(go),
              core.embedInput(input)
            )
          }
        )
      }
    )
  ))

/** @internal */
export const never: Channel.Channel<never, unknown, unknown, unknown, never, never, never> = core.fromEffect(
  Effect.never
)

/** @internal */
export const orDie = dual<
  <E>(
    error: LazyArg<E>
  ) => <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env, InErr, InElem, InDone, never, OutElem, OutDone>,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, E>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    error: LazyArg<E>
  ) => Channel.Channel<Env, InErr, InElem, InDone, never, OutElem, OutDone>
>(2, <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, E>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  error: LazyArg<E>
): Channel.Channel<Env, InErr, InElem, InDone, never, OutElem, OutDone> => orDieWith(self, error))

/** @internal */
export const orDieWith = dual<
  <OutErr>(
    f: (e: OutErr) => unknown
  ) => <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env, InErr, InElem, InDone, never, OutElem, OutDone>,
  <Env, InErr, InElem, InDone, OutElem, OutDone, OutErr>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (e: OutErr) => unknown
  ) => Channel.Channel<Env, InErr, InElem, InDone, never, OutElem, OutDone>
>(2, <Env, InErr, InElem, InDone, OutElem, OutDone, OutErr>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (e: OutErr) => unknown
): Channel.Channel<Env, InErr, InElem, InDone, never, OutElem, OutDone> =>
  catchAll(self, (e) => {
    throw f(e)
  }) as Channel.Channel<Env, InErr, InElem, InDone, never, OutElem, OutDone>)

/** @internal */
export const orElse = dual<
  <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    that: LazyArg<Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>>
  ) => <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1,
    OutElem1 | OutElem,
    OutDone1 | OutDone
  >,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    that: LazyArg<Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>>
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1,
    OutElem1 | OutElem,
    OutDone1 | OutDone
  >
>(
  2,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    that: LazyArg<Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>>
  ): Channel.Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1,
    OutElem | OutElem1,
    OutDone | OutDone1
  > => catchAll(self, that)
)

/** @internal */
export const pipeToOrFail = dual<
  <Env2, OutElem, OutDone, OutErr2, OutElem2, OutDone2>(
    that: Channel.Channel<Env2, never, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
  ) => <Env, InErr, InElem, InDone, OutErr>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env2 | Env, InErr, InElem, InDone, OutErr2 | OutErr, OutElem2, OutDone2>,
  <Env, InErr, InElem, InDone, OutErr, Env2, OutElem, OutDone, OutErr2, OutElem2, OutDone2>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    that: Channel.Channel<Env2, never, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
  ) => Channel.Channel<Env2 | Env, InErr, InElem, InDone, OutErr2 | OutErr, OutElem2, OutDone2>
>(2, <Env, InErr, InElem, InDone, OutErr, Env2, OutElem, OutDone, OutErr2, OutElem2, OutDone2>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: Channel.Channel<Env2, never, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
): Channel.Channel<Env | Env2, InErr, InElem, InDone, OutErr | OutErr2, OutElem2, OutDone2> =>
  core.suspend(() => {
    let channelException: Channel.ChannelException<OutErr | OutErr2> | undefined = undefined

    const reader: Channel.Channel<Env, OutErr, OutElem, OutDone, never, OutElem, OutDone> = core
      .readWith({
        onInput: (outElem) => core.flatMap(core.write(outElem), () => reader),
        onFailure: (outErr) => {
          channelException = ChannelException(outErr)
          return core.failCause(Cause.die(channelException))
        },
        onDone: core.succeedNow
      })

    const writer: Channel.Channel<
      Env2,
      OutErr2,
      OutElem2,
      OutDone2,
      OutErr2,
      OutElem2,
      OutDone2
    > = core.readWithCause({
      onInput: (outElem) => pipe(core.write(outElem), core.flatMap(() => writer)),
      onFailure: (cause) =>
        Cause.isDieType(cause) &&
          isChannelException(cause.defect) &&
          Equal.equals(cause.defect, channelException)
          ? core.fail(cause.defect.error as OutErr2)
          : core.failCause(cause),
      onDone: core.succeedNow
    })

    return core.pipeTo(core.pipeTo(core.pipeTo(self, reader), that), writer)
  }))

/** @internal */
export const provideService = dual<
  <T extends Context.Tag<any, any>>(
    tag: T,
    service: Context.Tag.Service<T>
  ) => <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Exclude<Env, Context.Tag.Identifier<T>>, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, T extends Context.Tag<any, any>>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    tag: T,
    service: Context.Tag.Service<T>
  ) => Channel.Channel<Exclude<Env, Context.Tag.Identifier<T>>, InErr, InElem, InDone, OutErr, OutElem, OutDone>
>(3, <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, T extends Context.Tag<any, any>>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  tag: T,
  service: Context.Tag.Service<T>
): Channel.Channel<Exclude<Env, Context.Tag.Identifier<T>>, InErr, InElem, InDone, OutErr, OutElem, OutDone> => {
  return core.flatMap(
    context<any>(),
    (context) => core.provideContext(self, Context.add(context, tag, service))
  )
})

/** @internal */
export const provideLayer = dual<
  <Env0, Env, OutErr2>(
    layer: Layer.Layer<Env0, OutErr2, Env>
  ) => <InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env0, InErr, InElem, InDone, OutErr2 | OutErr, OutElem, OutDone>,
  <InErr, InElem, InDone, OutErr, OutElem, OutDone, Env0, Env, OutErr2>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    layer: Layer.Layer<Env0, OutErr2, Env>
  ) => Channel.Channel<Env0, InErr, InElem, InDone, OutErr2 | OutErr, OutElem, OutDone>
>(2, <InErr, InElem, InDone, OutErr, OutElem, OutDone, Env0, Env, OutErr2>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  layer: Layer.Layer<Env0, OutErr2, Env>
): Channel.Channel<Env0, InErr, InElem, InDone, OutErr | OutErr2, OutElem, OutDone> =>
  unwrapScoped(Effect.map(Layer.build(layer), (env) => core.provideContext(self, env))))

/** @internal */
export const mapInputContext = dual<
  <Env0, Env>(
    f: (env: Context.Context<Env0>) => Context.Context<Env>
  ) => <InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env0, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  <InErr, InElem, InDone, OutErr, OutElem, OutDone, Env0, Env>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (env: Context.Context<Env0>) => Context.Context<Env>
  ) => Channel.Channel<Env0, InErr, InElem, InDone, OutErr, OutElem, OutDone>
>(2, <InErr, InElem, InDone, OutErr, OutElem, OutDone, Env0, Env>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (env: Context.Context<Env0>) => Context.Context<Env>
): Channel.Channel<Env0, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
  contextWithChannel((context: Context.Context<Env0>) => core.provideContext(self, f(context))))

/** @internal */
export const provideSomeLayer = dual<
  <Env0, Env2, OutErr2>(
    layer: Layer.Layer<Env0, OutErr2, Env2>
  ) => <R, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env0 | Exclude<R, Env2>, InErr, InElem, InDone, OutErr2 | OutErr, OutElem, OutDone>,
  <R, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env0, Env2, OutErr2>(
    self: Channel.Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    layer: Layer.Layer<Env0, OutErr2, Env2>
  ) => Channel.Channel<Env0 | Exclude<R, Env2>, InErr, InElem, InDone, OutErr2 | OutErr, OutElem, OutDone>
>(2, <R, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env0, Env2, OutErr2>(
  self: Channel.Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  layer: Layer.Layer<Env0, OutErr2, Env2>
): Channel.Channel<Env0 | Exclude<R, Env2>, InErr, InElem, InDone, OutErr | OutErr2, OutElem, OutDone> =>
  // @ts-expect-error
  provideLayer(self, Layer.merge(Layer.context<Exclude<R, Env2>>(), layer)))

/** @internal */
export const read = <In>(): Channel.Channel<
  never,
  unknown,
  In,
  unknown,
  Option.Option<never>,
  never,
  In
> => core.readOrFail<In, Option.Option<never>>(Option.none())

/** @internal */
export const repeated = <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> => core.flatMap(self, () => repeated(self))

/** @internal */
export const run = <Env, InErr, InDone, OutErr, OutDone>(
  self: Channel.Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): Effect.Effect<Env, OutErr, OutDone> => Effect.scoped(executor.runScoped(self))

/** @internal */
export const runCollect = <Env, InErr, InDone, OutErr, OutElem, OutDone>(
  self: Channel.Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): Effect.Effect<Env, OutErr, [Chunk.Chunk<OutElem>, OutDone]> => executor.run(core.collectElements(self))

/** @internal */
export const runDrain = <Env, InErr, InDone, OutElem, OutErr, OutDone>(
  self: Channel.Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): Effect.Effect<Env, OutErr, OutDone> => executor.run(drain(self))

/** @internal */
export const scoped = <R, E, A>(
  effect: Effect.Effect<R, E, A>
): Channel.Channel<Exclude<R, Scope.Scope>, unknown, unknown, unknown, E, A, unknown> =>
  unwrap(
    Effect.uninterruptibleMask((restore) =>
      Effect.map(Scope.make(), (scope) =>
        core.acquireReleaseOut(
          Effect.tapErrorCause(
            restore(Scope.extend(scope)(effect)),
            (cause) => Scope.close(scope, Exit.failCause(cause))
          ),
          (_, exit) => Scope.close(scope, exit)
        ))
    )
  )

/** @internal */
export const service = <T extends Context.Tag<any, any>>(
  tag: T
): Channel.Channel<Context.Tag.Identifier<T>, unknown, unknown, unknown, never, never, Context.Tag.Service<T>> =>
  core.fromEffect(tag)

/** @internal */
export const serviceWith = <T extends Context.Tag<any, any>>(tag: T) =>
<OutDone>(
  f: (resource: Context.Tag.Service<T>) => OutDone
): Channel.Channel<Context.Tag.Identifier<T>, unknown, unknown, unknown, never, never, OutDone> => map(service(tag), f)

/** @internal */
export const serviceWithChannel =
  <T extends Context.Tag<any, any>>(tag: T) =>
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    f: (resource: Context.Tag.Service<T>) => Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel.Channel<Env | Context.Tag.Identifier<T>, InErr, InElem, InDone, OutErr, OutElem, OutDone> =>
    core.flatMap(service(tag), f)

/** @internal */
export const serviceWithEffect = <T extends Context.Tag<any, any>>(tag: T) =>
<Env, OutErr, OutDone>(
  f: (resource: Context.Tag.Service<T>) => Effect.Effect<Env, OutErr, OutDone>
): Channel.Channel<Env | Context.Tag.Identifier<T>, unknown, unknown, unknown, OutErr, never, OutDone> =>
  mapEffect(service(tag), f)

/** @internal */
export const toPubSub = <Err, Done, Elem>(
  pubsub: PubSub.PubSub<Either.Either<Exit.Exit<Err, Done>, Elem>>
): Channel.Channel<never, Err, Elem, Done, never, never, unknown> => toQueue(pubsub)

/** @internal */
export const toPull = <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Effect.Effect<Env | Scope.Scope, never, Effect.Effect<Env, OutErr, Either.Either<OutDone, OutElem>>> =>
  Effect.map(
    Effect.acquireRelease(
      Effect.sync(() => new executor.ChannelExecutor(self, void 0, identity)),
      (exec, exit) => {
        const finalize = exec.close(exit)
        return finalize === undefined ? Effect.unit : finalize
      }
    ),
    (exec) => Effect.suspend(() => interpretToPull(exec.run() as ChannelState.ChannelState<Env, OutErr>, exec))
  )

/** @internal */
const interpretToPull = <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channelState: ChannelState.ChannelState<Env, OutErr>,
  exec: executor.ChannelExecutor<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Effect.Effect<Env, OutErr, Either.Either<OutDone, OutElem>> => {
  const state = channelState as ChannelState.Primitive
  switch (state._tag) {
    case ChannelStateOpCodes.OP_DONE: {
      return Exit.match(exec.getDone(), {
        onFailure: Effect.failCause,
        onSuccess: (done): Effect.Effect<Env, OutErr, Either.Either<OutDone, OutElem>> =>
          Effect.succeed(Either.left(done))
      })
    }
    case ChannelStateOpCodes.OP_EMIT: {
      return Effect.succeed(Either.right(exec.getEmit()))
    }
    case ChannelStateOpCodes.OP_FROM_EFFECT: {
      return pipe(
        state.effect as Effect.Effect<Env, OutErr, Either.Either<OutDone, OutElem>>,
        Effect.flatMap(() => interpretToPull(exec.run() as ChannelState.ChannelState<Env, OutErr>, exec))
      )
    }
    case ChannelStateOpCodes.OP_READ: {
      return executor.readUpstream(
        state,
        () => interpretToPull(exec.run() as ChannelState.ChannelState<Env, OutErr>, exec),
        (cause) => Effect.failCause(cause) as Effect.Effect<Env, OutErr, Either.Either<OutDone, OutElem>>
      )
    }
  }
}

/** @internal */
export const toQueue = <Err, Done, Elem>(
  queue: Queue.Enqueue<Either.Either<Exit.Exit<Err, Done>, Elem>>
): Channel.Channel<never, Err, Elem, Done, never, never, unknown> => core.suspend(() => toQueueInternal(queue))

/** @internal */
const toQueueInternal = <Err, Done, Elem>(
  queue: Queue.Enqueue<Either.Either<Exit.Exit<Err, Done>, Elem>>
): Channel.Channel<never, Err, Elem, Done, never, never, unknown> => {
  return core.readWithCause({
    onInput: (elem) =>
      core.flatMap(
        core.fromEffect(Queue.offer(queue, Either.right(elem))),
        () => toQueueInternal(queue)
      ),
    onFailure: (cause) => core.fromEffect(pipe(Queue.offer(queue, Either.left(Exit.failCause(cause))))),
    onDone: (done) => core.fromEffect(pipe(Queue.offer(queue, Either.left(Exit.succeed(done)))))
  })
}

/** @internal */
export const unwrap = <R, E, R2, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channel: Effect.Effect<R, E, Channel.Channel<R2, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
): Channel.Channel<R | R2, InErr, InElem, InDone, E | OutErr, OutElem, OutDone> => flatten(core.fromEffect(channel))

/** @internal */
export const unwrapScoped = <
  R,
  E,
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: Effect.Effect<R, E, Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
): Channel.Channel<
  Exclude<R, Scope.Scope> | Env,
  InErr,
  InElem,
  InDone,
  E | OutErr,
  OutElem,
  OutDone
> =>
  core.concatAllWith(
    scoped(self),
    (d, _) => d,
    (d, _) => d
  )

/** @internal */
export const updateService = dual<
  <T extends Context.Tag<any, any>>(
    tag: T,
    f: (resource: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ) => <R, InErr, InDone, OutElem, OutErr, OutDone>(
    self: Channel.Channel<R, InErr, unknown, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<T | R, InErr, unknown, InDone, OutErr, OutElem, OutDone>,
  <R, InErr, InDone, OutElem, OutErr, OutDone, T extends Context.Tag<any, any>>(
    self: Channel.Channel<R, InErr, unknown, InDone, OutErr, OutElem, OutDone>,
    tag: T,
    f: (resource: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ) => Channel.Channel<T | R, InErr, unknown, InDone, OutErr, OutElem, OutDone>
>(3, <R, InErr, InDone, OutElem, OutErr, OutDone, T extends Context.Tag<any, any>>(
  self: Channel.Channel<R, InErr, unknown, InDone, OutErr, OutElem, OutDone>,
  tag: T,
  f: (resource: Context.Tag.Service<T>) => Context.Tag.Service<T>
): Channel.Channel<R | T, InErr, unknown, InDone, OutErr, OutElem, OutDone> =>
  mapInputContext(self, (context: Context.Context<R>) =>
    Context.merge(
      context,
      Context.make(tag, f(Context.unsafeGet(context, tag)))
    )))

/** @internal */
export const withSpan = dual<
  (
    name: string,
    options?: {
      readonly attributes?: Record<string, unknown> | undefined
      readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
      readonly parent?: Tracer.ParentSpan | undefined
      readonly root?: boolean | undefined
      readonly context?: Context.Context<never> | undefined
    }
  ) => <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Exclude<Env, Tracer.ParentSpan>, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    name: string,
    options?: {
      readonly attributes?: Record<string, unknown> | undefined
      readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
      readonly parent?: Tracer.ParentSpan | undefined
      readonly root?: boolean | undefined
      readonly context?: Context.Context<never> | undefined
    }
  ) => Channel.Channel<Exclude<Env, Tracer.ParentSpan>, InErr, InElem, InDone, OutErr, OutElem, OutDone>
>(3, (self, name, options) =>
  unwrapScoped(
    Effect.flatMap(
      Effect.context(),
      (context) =>
        Effect.map(
          Effect.makeSpanScoped(name, options),
          (span) => core.provideContext(self, Context.add(context, tracer.spanTag, span))
        )
    )
  ) as any)

/** @internal */
export const writeAll = <OutElem>(
  ...outs: Array<OutElem>
): Channel.Channel<never, unknown, unknown, unknown, never, OutElem, void> => writeChunk(Chunk.fromIterable(outs))

/** @internal */
export const writeChunk = <OutElem>(
  outs: Chunk.Chunk<OutElem>
): Channel.Channel<never, unknown, unknown, unknown, never, OutElem, void> => writeChunkWriter(0, outs.length, outs)

/** @internal */
const writeChunkWriter = <OutElem>(
  idx: number,
  len: number,
  chunk: Chunk.Chunk<OutElem>
): Channel.Channel<never, unknown, unknown, unknown, never, OutElem, void> => {
  return idx === len
    ? core.unit
    : pipe(
      core.write(pipe(chunk, Chunk.unsafeGet(idx))),
      core.flatMap(() => writeChunkWriter(idx + 1, len, chunk))
    )
}

/** @internal */
export const zip = dual<
  <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    that: Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1 | OutErr,
    OutElem1 | OutElem,
    readonly [OutDone, OutDone1]
  >,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    that: Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1 | OutErr,
    OutElem1 | OutElem,
    readonly [OutDone, OutDone1]
  >
>(
  (args) => core.isChannel(args[1]),
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    that: Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): Channel.Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    readonly [OutDone, OutDone1]
  > =>
    options?.concurrent ?
      mergeWith(self, {
        other: that,
        onSelfDone: (exit1) => mergeDecision.Await((exit2) => Effect.suspend(() => Exit.zip(exit1, exit2))),
        onOtherDone: (exit2) => mergeDecision.Await((exit1) => Effect.suspend(() => Exit.zip(exit1, exit2)))
      }) :
      core.flatMap(self, (a) => map(that, (b) => [a, b] as const))
)

/** @internal */
export const zipLeft = dual<
  <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    that: Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1 | OutErr,
    OutElem1 | OutElem,
    OutDone
  >,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    that: Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1 | OutErr,
    OutElem1 | OutElem,
    OutDone
  >
>(
  (args) => core.isChannel(args[1]),
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    that: Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): Channel.Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    OutDone
  > =>
    options?.concurrent ?
      map(zip(self, that, { concurrent: true }), (tuple) => tuple[0]) :
      core.flatMap(self, (z) => as(that, z))
)

/** @internal */
export const zipRight = dual<
  <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    that: Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1 | OutErr,
    OutElem1 | OutElem,
    OutDone1
  >,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    that: Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1 | OutErr,
    OutElem1 | OutElem,
    OutDone1
  >
>(
  (args) => core.isChannel(args[1]),
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    that: Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): Channel.Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    OutDone1
  > =>
    options?.concurrent ?
      map(zip(self, that, { concurrent: true }), (tuple) => tuple[1]) :
      core.flatMap(self, () => that)
)

/** @internal */
export const ChannelExceptionTypeId: Channel.ChannelExceptionTypeId = Symbol.for(
  "effect/Channel/ChannelException"
) as Channel.ChannelExceptionTypeId

/** @internal */
export const ChannelException = <E>(error: E): Channel.ChannelException<E> => ({
  _tag: "ChannelException",
  [ChannelExceptionTypeId]: ChannelExceptionTypeId,
  error
})

/** @internal */
export const isChannelException = (u: unknown): u is Channel.ChannelException<unknown> =>
  hasProperty(u, ChannelExceptionTypeId)
