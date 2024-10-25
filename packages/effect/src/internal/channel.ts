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
export const acquireUseRelease = <Acquired, OutErr, Env, OutElem1, InElem, InErr, OutDone, InDone>(
  acquire: Effect.Effect<Acquired, OutErr, Env>,
  use: (a: Acquired) => Channel.Channel<OutElem1, InElem, OutErr, InErr, OutDone, InDone, Env>,
  release: (a: Acquired, exit: Exit.Exit<OutDone, OutErr>) => Effect.Effect<any, never, Env>
): Channel.Channel<OutElem1, InElem, OutErr, InErr, OutDone, InDone, Env> =>
  core.flatMap(
    core.fromEffect(
      Ref.make<
        (exit: Exit.Exit<OutDone, OutErr>) => Effect.Effect<any, never, Env>
      >(() => Effect.void)
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
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone2, InDone, Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutDone2>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    value: OutDone2
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone2, InDone, Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutDone2>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  value: OutDone2
): Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone2, InDone, Env> => map(self, () => value))

/** @internal */
export const asVoid = <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
): Channel.Channel<OutElem, InElem, OutErr, InErr, void, InDone, Env> => map(self, constVoid)

/** @internal */
export const buffer = <InElem, InErr, InDone>(
  options: {
    readonly empty: InElem
    readonly isEmpty: Predicate<InElem>
    readonly ref: Ref.Ref<InElem>
  }
): Channel.Channel<InElem, InElem, InErr, InErr, InDone, InDone> =>
  core.suspend(() => {
    const doBuffer = <InErr, InElem, InDone>(
      empty: InElem,
      isEmpty: Predicate<InElem>,
      ref: Ref.Ref<InElem>
    ): Channel.Channel<InElem, InElem, InErr, InErr, InDone, InDone> =>
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
export const bufferChunk = <InElem, InErr, InDone>(
  ref: Ref.Ref<Chunk.Chunk<InElem>>
): Channel.Channel<Chunk.Chunk<InElem>, Chunk.Chunk<InElem>, InErr, InErr, InDone, InDone> =>
  buffer({
    empty: Chunk.empty(),
    isEmpty: Chunk.isEmpty,
    ref
  })

/** @internal */
export const catchAll = dual<
  <OutErr, OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>(
    f: (error: OutErr) => Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>
  ) => <OutElem, InElem, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<
    OutElem1 | OutElem,
    InElem & InElem1,
    OutErr1,
    InErr & InErr1,
    OutDone1 | OutDone,
    InDone & InDone1,
    Env1 | Env
  >,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (error: OutErr) => Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>
  ) => Channel.Channel<
    OutElem1 | OutElem,
    InElem & InElem1,
    OutErr1,
    InErr & InErr1,
    OutDone1 | OutDone,
    InDone & InDone1,
    Env1 | Env
  >
>(
  2,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (error: OutErr) => Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>
  ): Channel.Channel<
    OutElem | OutElem1,
    InElem & InElem1,
    OutErr1,
    InErr & InErr1,
    OutDone | OutDone1,
    InDone & InDone1,
    Env | Env1
  > =>
    core.catchAllCause(self, (cause) =>
      Either.match(Cause.failureOrCause(cause), {
        onLeft: f,
        onRight: core.failCause
      }))
)

/** @internal */
export const concatMap = dual<
  <OutElem, OutElem2, InElem2, OutErr2, InErr2, X, InDone2, Env2>(
    f: (o: OutElem) => Channel.Channel<OutElem2, InElem2, OutErr2, InErr2, X, InDone2, Env2>
  ) => <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<
    OutElem2,
    InElem & InElem2,
    OutErr2 | OutErr,
    InErr & InErr2,
    unknown,
    InDone & InDone2,
    Env2 | Env
  >,
  <Env, InErr, InElem, InDone, OutErr, OutDone, OutElem, OutElem2, Env2, InErr2, InElem2, InDone2, OutErr2, X>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (o: OutElem) => Channel.Channel<OutElem2, InElem2, OutErr2, InErr2, X, InDone2, Env2>
  ) => Channel.Channel<
    OutElem2,
    InElem & InElem2,
    OutErr2 | OutErr,
    InErr & InErr2,
    unknown,
    InDone & InDone2,
    Env2 | Env
  >
>(2, <Env, InErr, InElem, InDone, OutErr, OutDone, OutElem, OutElem2, Env2, InErr2, InElem2, InDone2, OutErr2, X>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (o: OutElem) => Channel.Channel<OutElem2, InElem2, OutErr2, InErr2, X, InDone2, Env2>
): Channel.Channel<
  OutElem2,
  InElem & InElem2,
  OutErr | OutErr2,
  InErr & InErr2,
  unknown,
  InDone & InDone2,
  Env | Env2
> => core.concatMapWith(self, f, () => void 0, () => void 0))

/** @internal */
export const collect = dual<
  <OutElem, OutElem2>(
    pf: (o: OutElem) => Option.Option<OutElem2>
  ) => <InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem>
  ) => Channel.Channel<OutElem2, InElem, OutErr, InErr, OutDone, InDone, Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem2>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    pf: (o: OutElem) => Option.Option<OutElem2>
  ) => Channel.Channel<OutElem2, InElem, OutErr, InErr, OutDone, InDone, Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem2>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  pf: (o: OutElem) => Option.Option<OutElem2>
): Channel.Channel<OutElem2, InElem, OutErr, InErr, OutDone, InDone, Env> => {
  const collector: Channel.Channel<OutElem2, OutElem, OutErr, OutErr, OutDone, OutDone, Env> = core
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
export const concatOut = <OutElem, InElem, OutErr, InErr, InDone, Env, OutDone>(
  self: Channel.Channel<
    Channel.Channel<OutElem, InElem, OutErr, InErr, unknown, InDone, Env>,
    InElem,
    OutErr,
    InErr,
    OutDone,
    InDone,
    Env
  >
): Channel.Channel<OutElem, InElem, OutErr, InErr, unknown, InDone, Env> => core.concatAll(self)

/** @internal */
export const mapInput = dual<
  <InDone0, InDone>(
    f: (a: InDone0) => InDone
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone0, Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, InDone0>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (a: InDone0) => InDone
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone0, Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, InDone0>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (a: InDone0) => InDone
): Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone0, Env> => {
  const reader: Channel.Channel<InElem, InElem, InErr, InErr, InDone, InDone0> = core.readWith({
    onInput: (inElem: InElem) => core.flatMap(core.write(inElem), () => reader),
    onFailure: core.fail,
    onDone: (done: InDone0) => core.succeedNow(f(done))
  })
  return core.pipeTo(reader, self)
})

/** @internal */
export const mapInputEffect = dual<
  <InDone0, InDone, InErr, Env1>(
    f: (i: InDone0) => Effect.Effect<InDone, InErr, Env1>
  ) => <OutElem, InElem, OutErr, OutDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone0, Env1 | Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, InDone0, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (i: InDone0) => Effect.Effect<InDone, InErr, Env1>
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone0, Env1 | Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, InDone0, Env1>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (i: InDone0) => Effect.Effect<InDone, InErr, Env1>
): Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone0, Env | Env1> => {
  const reader: Channel.Channel<InElem, InElem, InErr, InErr, InDone, InDone0, Env1> = core.readWith({
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
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr0, OutDone, InDone, Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, InErr0>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (a: InErr0) => InErr
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr0, OutDone, InDone, Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, InErr0>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (a: InErr0) => InErr
): Channel.Channel<OutElem, InElem, OutErr, InErr0, OutDone, InDone, Env> => {
  const reader: Channel.Channel<InElem, InElem, InErr, InErr0, InDone, InDone> = core.readWith({
    onInput: (inElem: InElem) => core.flatMap(core.write(inElem), () => reader),
    onFailure: (error) => core.fail(f(error)),
    onDone: core.succeedNow
  })
  return core.pipeTo(reader, self)
})

/** @internal */
export const mapInputErrorEffect = dual<
  <InErr0, InDone, InErr, Env1>(
    f: (error: InErr0) => Effect.Effect<InDone, InErr, Env1>
  ) => <OutElem, InElem, OutErr, OutDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr0, OutDone, InDone, Env1 | Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, InErr0, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (error: InErr0) => Effect.Effect<InDone, InErr, Env1>
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr0, OutDone, InDone, Env1 | Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, InErr0, Env1>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (error: InErr0) => Effect.Effect<InDone, InErr, Env1>
): Channel.Channel<OutElem, InElem, OutErr, InErr0, OutDone, InDone, Env | Env1> => {
  const reader: Channel.Channel<InElem, InElem, InErr, InErr0, InDone, InDone, Env1> = core.readWith({
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
  ) => <OutElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem0, OutErr, InErr, OutDone, InDone, Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, InElem0>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (a: InElem0) => InElem
  ) => Channel.Channel<OutElem, InElem0, OutErr, InErr, OutDone, InDone, Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, InElem0>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (a: InElem0) => InElem
): Channel.Channel<OutElem, InElem0, OutErr, InErr, OutDone, InDone, Env> => {
  const reader: Channel.Channel<InElem, InElem0, InErr, InErr, InDone, InDone> = core.readWith({
    onInput: (inElem) => core.flatMap(core.write(f(inElem)), () => reader),
    onFailure: core.fail,
    onDone: core.succeedNow
  })
  return core.pipeTo(reader, self)
})

/** @internal */
export const mapInputInEffect = dual<
  <InElem0, InElem, InErr, Env1>(
    f: (a: InElem0) => Effect.Effect<InElem, InErr, Env1>
  ) => <OutElem, OutErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem0, OutErr, InErr, OutDone, InDone, Env1 | Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, InElem0, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (a: InElem0) => Effect.Effect<InElem, InErr, Env1>
  ) => Channel.Channel<OutElem, InElem0, OutErr, InErr, OutDone, InDone, Env1 | Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, InElem0, Env1>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (a: InElem0) => Effect.Effect<InElem, InErr, Env1>
): Channel.Channel<OutElem, InElem0, OutErr, InErr, OutDone, InDone, Env | Env1> => {
  const reader: Channel.Channel<InElem, InElem0, InErr, InErr, InDone, InDone, Env1> = core.readWith({
    onInput: (inElem) => core.flatMap(core.flatMap(core.fromEffect(f(inElem)), core.write), () => reader),
    onFailure: core.fail,
    onDone: core.succeedNow
  })
  return core.pipeTo(reader, self)
})

/** @internal */
export const doneCollect = <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
): Channel.Channel<never, InElem, OutErr, InErr, [Chunk.Chunk<OutElem>, OutDone], InDone, Env> =>
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
): Channel.Channel<never, OutElem, OutErr, OutErr, OutDone, OutDone, Env> => {
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
export const drain = <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
): Channel.Channel<never, InElem, OutErr, InErr, OutDone, InDone, Env> => {
  const drainer: Channel.Channel<never, OutElem, OutErr, OutErr, OutDone, OutDone, Env> = core
    .readWithCause({
      onInput: () => drainer,
      onFailure: core.failCause,
      onDone: core.succeed
    })
  return core.pipeTo(self, drainer)
}

/** @internal */
export const emitCollect = <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
): Channel.Channel<[Chunk.Chunk<OutElem>, OutDone], InElem, OutErr, InErr, void, InDone, Env> =>
  core.flatMap(doneCollect(self), core.write)

/** @internal */
export const ensuring = dual<
  <Z, Env1>(
    finalizer: Effect.Effect<Z, never, Env1>
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env1 | Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, Z, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    finalizer: Effect.Effect<Z, never, Env1>
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env1 | Env>
>(2, <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, Z>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  finalizer: Effect.Effect<Z, never, Env1>
): Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env | Env1> =>
  core.ensuringWith(self, () => finalizer))

/** @internal */
export const context = <Env>(): Channel.Channel<never, unknown, never, unknown, Context.Context<Env>, unknown, Env> =>
  core.fromEffect(Effect.context<Env>())

/** @internal */
export const contextWith = <Env, OutDone>(
  f: (env: Context.Context<Env>) => OutDone
): Channel.Channel<never, unknown, never, unknown, OutDone, unknown, Env> => map(context<Env>(), f)

/** @internal */
export const contextWithChannel = <
  Env,
  OutElem,
  InElem,
  OutErr,
  InErr,
  OutDone,
  InDone,
  Env1
>(
  f: (env: Context.Context<Env>) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env1>
): Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env | Env1> => core.flatMap(context<Env>(), f)

/** @internal */
export const contextWithEffect = <Env, OutDone, OutErr, Env1>(
  f: (env: Context.Context<Env>) => Effect.Effect<OutDone, OutErr, Env1>
): Channel.Channel<never, unknown, OutErr, unknown, OutDone, unknown, Env | Env1> => mapEffect(context<Env>(), f)

/** @internal */
export const flatten = <
  OutElem,
  InElem,
  OutErr,
  InErr,
  OutElem1,
  InElem1,
  OutErr1,
  InErr1,
  OutDone2,
  InDone1,
  Env1,
  InDone,
  Env
>(
  self: Channel.Channel<
    OutElem,
    InElem,
    OutErr,
    InErr,
    Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone2, InDone1, Env1>,
    InDone,
    Env
  >
): Channel.Channel<
  OutElem | OutElem1,
  InElem & InElem1,
  OutErr | OutErr1,
  InErr & InErr1,
  OutDone2,
  InDone & InDone1,
  Env | Env1
> => core.flatMap(self, identity)

/** @internal */
export const foldChannel = dual<
  <
    OutErr,
    OutElem1,
    InElem1,
    OutErr1,
    InErr1,
    OutDone1,
    InDone1,
    Env1,
    OutDone,
    OutElem2,
    InElem2,
    OutErr2,
    InErr2,
    OutDone2,
    InDone2,
    Env2
  >(
    options: {
      readonly onFailure: (
        error: OutErr
      ) => Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>
      readonly onSuccess: (
        done: OutDone
      ) => Channel.Channel<OutElem2, InElem2, OutErr2, InErr2, OutDone2, InDone2, Env2>
    }
  ) => <Env, InErr, InElem, InDone, OutElem>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<
    OutElem1 | OutElem2 | OutElem,
    InElem & InElem1 & InElem2,
    OutErr1 | OutErr2,
    InErr & InErr1 & InErr2,
    OutDone1 | OutDone2,
    InDone & InDone1 & InDone2,
    Env1 | Env2 | Env
  >,
  <
    OutElem,
    InElem,
    OutErr,
    InErr,
    OutDone,
    InDone,
    Env,
    OutElem1,
    InElem1,
    OutErr1,
    InErr1,
    OutDone1,
    InDone1,
    Env1,
    OutElem2,
    InElem2,
    OutErr2,
    InErr2,
    OutDone2,
    InDone2,
    Env2
  >(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    options: {
      readonly onFailure: (
        error: OutErr
      ) => Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>
      readonly onSuccess: (
        done: OutDone
      ) => Channel.Channel<OutElem2, InElem2, OutErr2, InErr2, OutDone2, InDone2, Env2>
    }
  ) => Channel.Channel<
    OutElem1 | OutElem2 | OutElem,
    InElem & InElem1 & InElem2,
    OutErr1 | OutErr2,
    InErr & InErr1 & InErr2,
    OutDone1 | OutDone2,
    InDone & InDone1 & InDone2,
    Env1 | Env2 | Env
  >
>(2, <
  OutElem,
  InElem,
  OutErr,
  InErr,
  OutDone,
  InDone,
  Env,
  OutElem1,
  InElem1,
  OutErr1,
  InErr1,
  OutDone1,
  InDone1,
  Env1,
  OutElem2,
  InElem2,
  OutErr2,
  InErr2,
  OutDone2,
  InDone2,
  Env2
>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  options: {
    readonly onFailure: (error: OutErr) => Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>
    readonly onSuccess: (done: OutDone) => Channel.Channel<OutElem2, InElem2, OutErr2, InErr2, OutDone2, InDone2, Env2>
  }
): Channel.Channel<
  OutElem | OutElem2 | OutElem1,
  InElem & InElem1 & InElem2,
  OutErr2 | OutErr1,
  InErr & InErr1 & InErr2,
  OutDone2 | OutDone1,
  InDone & InDone1 & InDone2,
  Env | Env1 | Env2
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
export const fromEither = <R, L>(
  either: Either.Either<R, L>
): Channel.Channel<never, unknown, L, unknown, R, unknown> =>
  core.suspend(() => Either.match(either, { onLeft: core.fail, onRight: core.succeed }))

/** @internal */
export const fromInput = <Err, Elem, Done>(
  input: SingleProducerAsyncInput.AsyncInputConsumer<Err, Elem, Done>
): Channel.Channel<Elem, unknown, Err, unknown, Done, unknown> =>
  unwrap(
    input.takeWith(
      core.failCause,
      (elem) => core.flatMap(core.write(elem), () => fromInput(input)),
      core.succeed
    )
  )

/** @internal */
export const fromPubSub = <Done, Err, Elem>(
  pubsub: PubSub.PubSub<Either.Either<Elem, Exit.Exit<Done, Err>>>
): Channel.Channel<Elem, unknown, Err, unknown, Done, unknown> =>
  unwrapScoped(Effect.map(PubSub.subscribe(pubsub), fromQueue))

/** @internal */
export const fromPubSubScoped = <Done, Err, Elem>(
  pubsub: PubSub.PubSub<Either.Either<Elem, Exit.Exit<Done, Err>>>
): Effect.Effect<Channel.Channel<Elem, unknown, Err, unknown, Done, unknown>, never, Scope.Scope> =>
  Effect.map(PubSub.subscribe(pubsub), fromQueue)

/** @internal */
export const fromOption = <A>(
  option: Option.Option<A>
): Channel.Channel<never, unknown, Option.Option<never>, unknown, A, unknown> =>
  core.suspend(() =>
    Option.match(option, {
      onNone: () => core.fail(Option.none()),
      onSome: core.succeed
    })
  )

/** @internal */
export const fromQueue = <Done, Err, Elem>(
  queue: Queue.Dequeue<Either.Either<Elem, Exit.Exit<Done, Err>>>
): Channel.Channel<Elem, unknown, Err, unknown, Done, unknown> => core.suspend(() => fromQueueInternal(queue))

/** @internal */
const fromQueueInternal = <Done, Err, Elem>(
  queue: Queue.Dequeue<Either.Either<Elem, Exit.Exit<Done, Err>>>
): Channel.Channel<Elem, unknown, Err, unknown, Done, unknown> =>
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
          () => fromQueueInternal(queue)
        )
    }))
  )

/** @internal */
export const identityChannel = <Elem, Err, Done>(): Channel.Channel<Elem, Elem, Err, Err, Done, Done> =>
  core.readWith({
    onInput: (input: Elem) => core.flatMap(core.write(input), () => identityChannel()),
    onFailure: core.fail,
    onDone: core.succeedNow
  })

/** @internal */
export const interruptWhen = dual<
  <OutDone1, OutErr1, Env1>(
    effect: Effect.Effect<OutDone1, OutErr1, Env1>
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr1 | OutErr, InErr, OutDone1 | OutDone, InDone, Env1 | Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutDone1, OutErr1, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    effect: Effect.Effect<OutDone1, OutErr1, Env1>
  ) => Channel.Channel<OutElem, InElem, OutErr1 | OutErr, InErr, OutDone1 | OutDone, InDone, Env1 | Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutDone1, OutErr1, Env1>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  effect: Effect.Effect<OutDone1, OutErr1, Env1>
): Channel.Channel<OutElem, InElem, OutErr | OutErr1, InErr, OutDone | OutDone1, InDone, Env1 | Env> =>
  mergeWith(self, {
    other: core.fromEffect(effect),
    onSelfDone: (selfDone) => mergeDecision.Done(Effect.suspend(() => selfDone)),
    onOtherDone: (effectDone) => mergeDecision.Done(Effect.suspend(() => effectDone))
  }))

/** @internal */
export const interruptWhenDeferred = dual<
  <OutDone1, OutErr1>(
    deferred: Deferred.Deferred<OutDone1, OutErr1>
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr1 | OutErr, InErr, OutDone1 | OutDone, InDone, Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutDone1, OutErr1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    deferred: Deferred.Deferred<OutDone1, OutErr1>
  ) => Channel.Channel<OutElem, InElem, OutErr1 | OutErr, InErr, OutDone1 | OutDone, InDone, Env>
>(2, <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutErr1, OutDone1>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  deferred: Deferred.Deferred<OutDone1, OutErr1>
): Channel.Channel<OutElem, InElem, OutErr | OutErr1, InErr, OutDone | OutDone1, InDone, Env> =>
  interruptWhen(self, Deferred.await(deferred)))

/** @internal */
export const map = dual<
  <OutDone, OutDone2>(
    f: (out: OutDone) => OutDone2
  ) => <OutElem, InElem, OutErr, InErr, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone2, InDone, Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutDone2>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (out: OutDone) => OutDone2
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone2, InDone, Env>
>(2, <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutDone2>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (out: OutDone) => OutDone2
): Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone2, InDone, Env> =>
  core.flatMap(self, (a) => core.sync(() => f(a))))

/** @internal */
export const mapEffect = dual<
  <OutDone, OutDone1, OutErr1, Env1>(
    f: (o: OutDone) => Effect.Effect<OutDone1, OutErr1, Env1>
  ) => <OutElem, InElem, OutErr, InErr, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr1 | OutErr, InErr, OutDone1, InDone, Env1 | Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutDone1, OutErr1, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (o: OutDone) => Effect.Effect<OutDone1, OutErr1, Env1>
  ) => Channel.Channel<OutElem, InElem, OutErr1 | OutErr, InErr, OutDone1, InDone, Env1 | Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutDone1, OutErr1, Env1>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (o: OutDone) => Effect.Effect<OutDone1, OutErr1, Env1>
): Channel.Channel<OutElem, InElem, OutErr | OutErr1, InErr, OutDone1, InDone, Env | Env1> =>
  core.flatMap(self, (z) => core.fromEffect(f(z))))

/** @internal */
export const mapError = dual<
  <OutErr, OutErr2>(
    f: (err: OutErr) => OutErr2
  ) => <OutElem, InElem, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr2, InErr, OutDone, InDone, Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutErr2>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (err: OutErr) => OutErr2
  ) => Channel.Channel<OutElem, InElem, OutErr2, InErr, OutDone, InDone, Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutErr2>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (err: OutErr) => OutErr2
): Channel.Channel<OutElem, InElem, OutErr2, InErr, OutDone, InDone, Env> => mapErrorCause(self, Cause.map(f)))

/** @internal */
export const mapErrorCause = dual<
  <OutErr, OutErr2>(
    f: (cause: Cause.Cause<OutErr>) => Cause.Cause<OutErr2>
  ) => <OutElem, InElem, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr2, InErr, OutDone, InDone, Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutErr2>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (cause: Cause.Cause<OutErr>) => Cause.Cause<OutErr2>
  ) => Channel.Channel<OutElem, InElem, OutErr2, InErr, OutDone, InDone, Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutErr2>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (cause: Cause.Cause<OutErr>) => Cause.Cause<OutErr2>
): Channel.Channel<OutElem, InElem, OutErr2, InErr, OutDone, InDone, Env> =>
  core.catchAllCause(self, (cause) => core.failCause(f(cause))))

/** @internal */
export const mapOut = dual<
  <OutElem, OutElem2>(
    f: (o: OutElem) => OutElem2
  ) => <InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem2, InElem, OutErr, InErr, OutDone, InDone, Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem2>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (o: OutElem) => OutElem2
  ) => Channel.Channel<OutElem2, InElem, OutErr, InErr, OutDone, InDone, Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem2>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (o: OutElem) => OutElem2
): Channel.Channel<OutElem2, InElem, OutErr, InErr, OutDone, InDone, Env> => {
  const reader: Channel.Channel<OutElem2, OutElem, OutErr, OutErr, OutDone, OutDone, Env> = core
    .readWith({
      onInput: (outElem) => core.flatMap(core.write(f(outElem)), () => reader),
      onFailure: core.fail,
      onDone: core.succeedNow
    })
  return core.pipeTo(self, reader)
})

/** @internal */
export const mapOutEffect = dual<
  <OutElem, OutElem1, OutErr1, Env1>(
    f: (o: OutElem) => Effect.Effect<OutElem1, OutErr1, Env1>
  ) => <InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem1, InElem, OutErr1 | OutErr, InErr, OutDone, InDone, Env1 | Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem1, OutErr1, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (o: OutElem) => Effect.Effect<OutElem1, OutErr1, Env1>
  ) => Channel.Channel<OutElem1, InElem, OutErr1 | OutErr, InErr, OutDone, InDone, Env1 | Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem1, OutErr1, Env1>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (o: OutElem) => Effect.Effect<OutElem1, OutErr1, Env1>
): Channel.Channel<OutElem1, InElem, OutErr | OutErr1, InErr, OutDone, InDone, Env | Env1> => {
  const reader: Channel.Channel<OutElem1, OutElem, OutErr | OutErr1, OutErr, OutDone, OutDone, Env | Env1> = core
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
  <OutElem, OutElem1, OutErr1, Env1>(
    f: (o: OutElem) => Effect.Effect<OutElem1, OutErr1, Env1>,
    n: number
  ) => <InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem1, InElem, OutErr1 | OutErr, InErr, OutDone, InDone, Env1 | Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem1, OutErr1, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (o: OutElem) => Effect.Effect<OutElem1, OutErr1, Env1>,
    n: number
  ) => Channel.Channel<OutElem1, InElem, OutErr1 | OutErr, InErr, OutDone, InDone, Env1 | Env>
>(3, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem1, OutErr1, Env1>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (o: OutElem) => Effect.Effect<OutElem1, OutErr1, Env1>,
  n: number
): Channel.Channel<OutElem1, InElem, OutErr | OutErr1, InErr, OutDone, InDone, Env | Env1> =>
  pipe(
    Effect.gen(function*($) {
      const queue = yield* $(
        Effect.acquireRelease(
          Queue.bounded<Effect.Effect<Either.Either<OutElem1, OutDone>, OutErr | OutErr1, Env1>>(n),
          (queue) => Queue.shutdown(queue)
        )
      )
      const errorSignal = yield* $(Deferred.make<never, OutErr1>())
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
                    Effect.interruptible(lock(Effect.void)),
                    Effect.asVoid(Queue.offer(
                      queue,
                      Effect.succeed(Either.left(outDone))
                    ))
                  )
                },
                onRight: (outElem) =>
                  Effect.gen(function*($) {
                    const deferred = yield* $(Deferred.make<OutElem1, OutErr1>())
                    const latch = yield* $(Deferred.make<void>())
                    yield* $(Effect.asVoid(Queue.offer(
                      queue,
                      Effect.map(Deferred.await(deferred), Either.right)
                    )))
                    yield* $(
                      Deferred.succeed(latch, void 0),
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
      const consumer: Channel.Channel<OutElem1, unknown, OutErr | OutErr1, unknown, OutDone, unknown, Env1> = unwrap(
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
    OutElem,
    InElem1,
    OutErr1,
    InErr1,
    InDone1,
    Env1,
    InElem,
    OutErr,
    InErr,
    InDone,
    Env
  >(
    channels: Channel.Channel<
      Channel.Channel<OutElem, InElem1, OutErr1, InErr1, unknown, InDone1, Env1>,
      InElem,
      OutErr,
      InErr,
      unknown,
      InDone,
      Env
    >
  ): Channel.Channel<
    OutElem,
    InElem & InElem1,
    OutErr | OutErr1,
    InErr & InErr1,
    unknown,
    InDone & InDone1,
    Env | Env1
  > => mergeAllWith(options)(channels, constVoid)
}

/** @internal */
export const mergeAllUnbounded = <
  OutElem,
  InElem1,
  OutErr1,
  InErr1,
  InDone1,
  Env1,
  InElem,
  OutErr,
  InErr,
  InDone,
  Env
>(
  channels: Channel.Channel<
    Channel.Channel<OutElem, InElem1, OutErr1, InErr1, unknown, InDone1, Env1>,
    InElem,
    OutErr,
    InErr,
    unknown,
    InDone,
    Env
  >
): Channel.Channel<
  OutElem,
  InElem & InElem1,
  OutErr | OutErr1,
  InErr & InErr1,
  unknown,
  InDone & InDone1,
  Env | Env1
> => mergeAllWith({ concurrency: "unbounded" })(channels, constVoid)

/** @internal */
export const mergeAllUnboundedWith = <
  OutElem,
  InElem1,
  OutErr1,
  InErr1,
  OutDone,
  InDone1,
  Env1,
  InElem,
  OutErr,
  InErr,
  InDone,
  Env
>(
  channels: Channel.Channel<
    Channel.Channel<OutElem, InElem1, OutErr1, InErr1, OutDone, InDone1, Env1>,
    InElem,
    OutErr,
    InErr,
    OutDone,
    InDone,
    Env
  >,
  f: (o1: OutDone, o2: OutDone) => OutDone
): Channel.Channel<
  OutElem,
  InElem & InElem1,
  OutErr | OutErr1,
  InErr & InErr1,
  OutDone,
  InDone & InDone1,
  Env | Env1
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
<OutElem, InElem1, OutErr1, InErr1, OutDone, InDone1, Env1, InElem, OutErr, InErr, InDone, Env>(
  channels: Channel.Channel<
    Channel.Channel<OutElem, InElem1, OutErr1, InErr1, OutDone, InDone1, Env1>,
    InElem,
    OutErr,
    InErr,
    OutDone,
    InDone,
    Env
  >,
  f: (o1: OutDone, o2: OutDone) => OutDone
): Channel.Channel<
  OutElem,
  InElem & InElem1,
  OutErr | OutErr1,
  InErr & InErr1,
  OutDone,
  InDone & InDone1,
  Env | Env1
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
          Queue.bounded<Effect.Effect<Either.Either<OutElem, OutDone>, OutErr | OutErr1, Env>>(bufferSize),
          (queue) => Queue.shutdown(queue)
        )
      )
      const cancelers = yield* $(
        Effect.acquireRelease(
          Queue.unbounded<Deferred.Deferred<void>>(),
          (queue) => Queue.shutdown(queue)
        )
      )
      const lastDone = yield* $(Ref.make<Option.Option<OutDone>>(Option.none()))
      const errorSignal = yield* $(Deferred.make<void>())
      const withPermits = (yield* $(Effect.makeSemaphore(concurrencyN)))
        .withPermits
      const pull = yield* $(toPull(channels))
      const evaluatePull = (
        pull: Effect.Effect<Either.Either<OutElem, OutDone>, OutErr | OutErr1, Env | Env1>
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
          Effect.repeat({ until: (_): _ is Option.Some<OutDone> => Option.isSome(_) }),
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
                Effect.asVoid
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
              Effect.raceWith(
                Effect.interruptible(Deferred.await(errorSignal)),
                Effect.interruptible(withPermits(concurrencyN)(Effect.void)),
                {
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
                }
              ),
            onRight: (channel) =>
              _mergeStrategy.match(mergeStrategy, {
                onBackPressure: () =>
                  Effect.gen(function*($) {
                    const latch = yield* $(Deferred.make<void>())
                    const raceEffects: Effect.Effect<void, OutErr | OutErr1, Env | Env1> = pipe(
                      queueReader,
                      core.pipeTo(channel),
                      toPull,
                      Effect.flatMap((pull) =>
                        Effect.race(
                          evaluatePull(pull),
                          Effect.interruptible(Deferred.await(errorSignal))
                        )
                      ),
                      Effect.scoped
                    )
                    yield* $(
                      Deferred.succeed(latch, void 0),
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
                    const canceler = yield* $(Deferred.make<void>())
                    const latch = yield* $(Deferred.make<void>())
                    const size = yield* $(Queue.size(cancelers))
                    yield* $(
                      Queue.take(cancelers),
                      Effect.flatMap((_) => Deferred.succeed(_, void 0)),
                      Effect.when(() => size >= concurrencyN)
                    )
                    yield* $(Queue.offer(cancelers, canceler))
                    const raceEffects: Effect.Effect<void, OutErr | OutErr1, Env | Env1> = pipe(
                      queueReader,
                      core.pipeTo(channel),
                      toPull,
                      Effect.flatMap((pull) =>
                        pipe(
                          evaluatePull(pull),
                          Effect.race(Effect.interruptible(Deferred.await(errorSignal))),
                          Effect.race(Effect.interruptible(Deferred.await(canceler)))
                        )
                      ),
                      Effect.scoped
                    )
                    yield* $(
                      Deferred.succeed(latch, void 0),
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
        Effect.repeat({ while: (_) => _ }),
        Effect.forkScoped
      )
      return [queue, input] as const
    }),
    Effect.map(([queue, input]) => {
      const consumer: Channel.Channel<OutElem, unknown, OutErr | OutErr1, unknown, OutDone, unknown, Env | Env1> = pipe(
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
  <OutElem, OutElem1, InElem1, OutErr1, InErr1, Z, InDone1, Env1>(
    f: (outElem: OutElem) => Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, Z, InDone1, Env1>,
    options: {
      readonly concurrency: number | "unbounded"
      readonly bufferSize?: number | undefined
      readonly mergeStrategy?: MergeStrategy.MergeStrategy | undefined
    }
  ) => <InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<
    OutElem1,
    InElem & InElem1,
    OutErr1 | OutErr,
    InErr & InErr1,
    unknown,
    InDone & InDone1,
    Env1 | Env
  >,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem1, InElem1, OutErr1, InErr1, Z, InDone1, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (outElem: OutElem) => Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, Z, InDone1, Env1>,
    options: {
      readonly concurrency: number | "unbounded"
      readonly bufferSize?: number | undefined
      readonly mergeStrategy?: MergeStrategy.MergeStrategy | undefined
    }
  ) => Channel.Channel<
    OutElem1,
    InElem & InElem1,
    OutErr1 | OutErr,
    InErr & InErr1,
    unknown,
    InDone & InDone1,
    Env1 | Env
  >
>(3, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem1, InElem1, OutErr1, InErr1, Z, InDone1, Env1>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (outElem: OutElem) => Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, Z, InDone1, Env1>,
  options: {
    readonly concurrency: number | "unbounded"
    readonly bufferSize?: number | undefined
    readonly mergeStrategy?: MergeStrategy.MergeStrategy | undefined
  }
): Channel.Channel<
  OutElem1,
  InElem & InElem1,
  OutErr | OutErr1,
  InErr & InErr1,
  unknown,
  InDone & InDone1,
  Env | Env1
> => mergeAll(options)(mapOut(self, f)))

/** @internal */
export const mergeOut = dual<
  (
    n: number
  ) => <OutElem1, InElem1, OutErr1, InErr1, Z, InDone1, Env1, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<
      Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, Z, InDone1, Env1>,
      InElem,
      OutErr,
      InErr,
      OutDone,
      InDone,
      Env
    >
  ) => Channel.Channel<
    OutElem1,
    InElem & InElem1,
    OutErr | OutErr1,
    InErr & InErr1,
    unknown,
    InDone & InDone1,
    Env | Env1
  >,
  <OutElem1, InElem1, OutErr1, InErr1, Z, InDone1, Env1, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<
      Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, Z, InDone1, Env1>,
      InElem,
      OutErr,
      InErr,
      OutDone,
      InDone,
      Env
    >,
    n: number
  ) => Channel.Channel<
    OutElem1,
    InElem & InElem1,
    OutErr | OutErr1,
    InErr & InErr1,
    unknown,
    InDone & InDone1,
    Env | Env1
  >
>(2, <OutElem1, InElem1, OutErr1, InErr1, Z, InDone1, Env1, InElem, OutErr, InErr, OutDone, InDone, Env>(
  self: Channel.Channel<
    Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, Z, InDone1, Env1>,
    InElem,
    OutErr,
    InErr,
    OutDone,
    InDone,
    Env
  >,
  n: number
): Channel.Channel<
  OutElem1,
  InElem & InElem1,
  OutErr | OutErr1,
  InErr & InErr1,
  unknown,
  InDone & InDone1,
  Env | Env1
> => mergeAll({ concurrency: n })(mapOut(self, identity)))

/** @internal */
export const mergeOutWith = dual<
  <OutDone1>(
    n: number,
    f: (o1: OutDone1, o2: OutDone1) => OutDone1
  ) => <OutElem1, InElem1, OutErr1, InErr1, InDone1, Env1, InElem, OutErr, InErr, InDone, Env>(
    self: Channel.Channel<
      Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>,
      InElem,
      OutErr,
      InErr,
      OutDone1,
      InDone,
      Env
    >
  ) => Channel.Channel<
    OutElem1,
    InElem & InElem1,
    OutErr | OutErr1,
    InErr & InErr1,
    OutDone1,
    InDone & InDone1,
    Env | Env1
  >,
  <OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1, InElem, OutErr, InErr, InDone, Env>(
    self: Channel.Channel<
      Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>,
      InElem,
      OutErr,
      InErr,
      OutDone1,
      InDone,
      Env
    >,
    n: number,
    f: (o1: OutDone1, o2: OutDone1) => OutDone1
  ) => Channel.Channel<
    OutElem1,
    InElem & InElem1,
    OutErr | OutErr1,
    InErr & InErr1,
    OutDone1,
    InDone & InDone1,
    Env | Env1
  >
>(3, <OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1, InElem, OutErr, InErr, InDone, Env>(
  self: Channel.Channel<
    Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>,
    InElem,
    OutErr,
    InErr,
    OutDone1,
    InDone,
    Env
  >,
  n: number,
  f: (o1: OutDone1, o2: OutDone1) => OutDone1
): Channel.Channel<
  OutElem1,
  InElem & InElem1,
  OutErr | OutErr1,
  InErr & InErr1,
  OutDone1,
  InDone & InDone1,
  Env | Env1
> => mergeAllWith({ concurrency: n })(mapOut(self, identity), f))

/** @internal */
export const mergeWith = dual<
  <OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1, OutDone, OutErr, OutErr2, OutDone2, OutErr3, OutDone3>(
    options: {
      readonly other: Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>
      readonly onSelfDone: (
        exit: Exit.Exit<OutDone, OutErr>
      ) => MergeDecision.MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>
      readonly onOtherDone: (
        ex: Exit.Exit<OutDone1, OutErr1>
      ) => MergeDecision.MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>
    }
  ) => <Env, InErr, InElem, InDone, OutElem>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<
    OutElem1 | OutElem,
    InElem & InElem1,
    OutErr2 | OutErr3,
    InErr & InErr1,
    OutDone2 | OutDone3,
    InDone & InDone1,
    Env1 | Env
  >,
  <
    OutElem,
    InElem,
    OutErr,
    InErr,
    OutDone,
    InDone,
    Env,
    OutElem1,
    InElem1,
    OutErr1,
    InErr1,
    OutDone1,
    InDone1,
    Env1,
    OutErr2,
    OutDone2,
    OutErr3,
    OutDone3
  >(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    options: {
      readonly other: Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>
      readonly onSelfDone: (
        exit: Exit.Exit<OutDone, OutErr>
      ) => MergeDecision.MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>
      readonly onOtherDone: (
        ex: Exit.Exit<OutDone1, OutErr1>
      ) => MergeDecision.MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>
    }
  ) => Channel.Channel<
    OutElem1 | OutElem,
    InElem & InElem1,
    OutErr2 | OutErr3,
    InErr & InErr1,
    OutDone2 | OutDone3,
    InDone & InDone1,
    Env1 | Env
  >
>(2, <
  OutElem,
  InElem,
  OutErr,
  InErr,
  OutDone,
  InDone,
  Env,
  OutElem1,
  InElem1,
  OutErr1,
  InErr1,
  OutDone1,
  InDone1,
  Env1,
  OutErr2,
  OutDone2,
  OutErr3,
  OutDone3
>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  options: {
    readonly other: Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>
    readonly onSelfDone: (
      exit: Exit.Exit<OutDone, OutErr>
    ) => MergeDecision.MergeDecision<Env1, OutErr1, OutDone1, OutErr2, OutDone2>
    readonly onOtherDone: (
      ex: Exit.Exit<OutDone1, OutErr1>
    ) => MergeDecision.MergeDecision<Env1, OutErr, OutDone, OutErr3, OutDone3>
  }
): Channel.Channel<
  OutElem | OutElem1,
  InElem & InElem1,
  OutErr2 | OutErr3,
  InErr & InErr1,
  OutDone2 | OutDone3,
  InDone & InDone1,
  Env1 | Env
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
              exit: Exit.Exit<Either.Either<OutElem | OutElem1, Done>, Err>,
              fiber: Fiber.Fiber<Either.Either<OutElem | OutElem1, Done2>, Err2>,
              pull: Effect.Effect<Either.Either<OutElem | OutElem1, Done>, Err, Env | Env1>
            ) =>
            (
              done: (
                ex: Exit.Exit<Done, Err>
              ) => MergeDecision.MergeDecision<
                Env | Env1,
                Err2,
                Done2,
                OutErr2 | OutErr3,
                OutDone2 | OutDone3
              >,
              both: (
                f1: Fiber.Fiber<Either.Either<OutElem | OutElem1, Done>, Err>,
                f2: Fiber.Fiber<Either.Either<OutElem | OutElem1, Done2>, Err2>
              ) => State,
              single: (
                f: (
                  ex: Exit.Exit<Done2, Err2>
                ) => Effect.Effect<OutDone2 | OutDone3, OutErr2 | OutErr3, Env | Env1>
              ) => State
            ): Effect.Effect<
              Channel.Channel<
                OutElem | OutElem1,
                unknown,
                OutErr2 | OutErr3,
                unknown,
                OutDone2 | OutDone3,
                unknown,
                Env | Env1
              >,
              never,
              Env | Env1
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
                Channel.Channel<
                  OutElem | OutElem1,
                  unknown,
                  OutErr2 | OutErr3,
                  unknown,
                  OutDone2 | OutDone3,
                  unknown,
                  Env | Env1
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
              OutElem | OutElem1,
              unknown,
              OutErr2 | OutErr3,
              unknown,
              OutDone2 | OutDone3,
              unknown,
              Env | Env1
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
                              ex: Exit.Exit<OutDone1, InErr1 | OutErr1>
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
export const never: Channel.Channel<never, unknown, never, unknown, never, unknown> = core.fromEffect(
  Effect.never
)

/** @internal */
export const orDie = dual<
  <E>(
    error: LazyArg<E>
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, never, InErr, OutDone, InDone, Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, E>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    error: LazyArg<E>
  ) => Channel.Channel<OutElem, InElem, never, InErr, OutDone, InDone, Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, E>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  error: LazyArg<E>
): Channel.Channel<OutElem, InElem, never, InErr, OutDone, InDone, Env> => orDieWith(self, error))

/** @internal */
export const orDieWith = dual<
  <OutErr>(
    f: (e: OutErr) => unknown
  ) => <OutElem, InElem, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, never, InErr, OutDone, InDone, Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (e: OutErr) => unknown
  ) => Channel.Channel<OutElem, InElem, never, InErr, OutDone, InDone, Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (e: OutErr) => unknown
): Channel.Channel<OutElem, InElem, never, InErr, OutDone, InDone, Env> =>
  catchAll(self, (e) => {
    throw f(e)
  }) as Channel.Channel<OutElem, InElem, never, InErr, OutDone, InDone, Env>)

/** @internal */
export const orElse = dual<
  <OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>(
    that: LazyArg<Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>>
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<
    OutElem1 | OutElem,
    InElem & InElem1,
    OutErr1,
    InErr & InErr1,
    OutDone1 | OutDone,
    InDone & InDone1,
    Env1 | Env
  >,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    that: LazyArg<Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>>
  ) => Channel.Channel<
    OutElem1 | OutElem,
    InElem & InElem1,
    OutErr1,
    InErr & InErr1,
    OutDone1 | OutDone,
    InDone & InDone1,
    Env1 | Env
  >
>(
  2,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    that: LazyArg<Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>>
  ): Channel.Channel<
    OutElem | OutElem1,
    InElem & InElem1,
    OutErr1,
    InErr & InErr1,
    OutDone | OutDone1,
    InDone & InDone1,
    Env | Env1
  > => catchAll(self, that)
)

/** @internal */
export const pipeToOrFail = dual<
  <OutElem2, OutElem, OutErr2, OutDone2, OutDone, Env2>(
    that: Channel.Channel<OutElem2, OutElem, OutErr2, never, OutDone2, OutDone, Env2>
  ) => <InElem, OutErr, InErr, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem2, InElem, OutErr2 | OutErr, InErr, OutDone2, InDone, Env2 | Env>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem2, OutErr2, OutDone2, Env2>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    that: Channel.Channel<OutElem2, OutElem, OutErr2, never, OutDone2, OutDone, Env2>
  ) => Channel.Channel<OutElem2, InElem, OutErr2 | OutErr, InErr, OutDone2, InDone, Env2 | Env>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem2, OutErr2, OutDone2, Env2>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  that: Channel.Channel<OutElem2, OutElem, OutErr2, never, OutDone2, OutDone, Env2>
): Channel.Channel<OutElem2, InElem, OutErr | OutErr2, InErr, OutDone2, InDone, Env | Env2> =>
  core.suspend(() => {
    let channelException: Channel.ChannelException<OutErr | OutErr2> | undefined = undefined

    const reader: Channel.Channel<OutElem, OutElem, never, OutErr, OutDone, OutDone, Env> = core
      .readWith({
        onInput: (outElem) => core.flatMap(core.write(outElem), () => reader),
        onFailure: (outErr) => {
          channelException = ChannelException(outErr)
          return core.failCause(Cause.die(channelException))
        },
        onDone: core.succeedNow
      })

    const writer: Channel.Channel<
      OutElem2,
      OutElem2,
      OutErr2,
      OutErr2,
      OutDone2,
      OutDone2,
      Env2
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
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Exclude<Env, Context.Tag.Identifier<T>>>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, T extends Context.Tag<any, any>>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    tag: T,
    service: Context.Tag.Service<T>
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Exclude<Env, Context.Tag.Identifier<T>>>
>(3, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, T extends Context.Tag<any, any>>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  tag: T,
  service: Context.Tag.Service<T>
): Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Exclude<Env, Context.Tag.Identifier<T>>> => {
  return core.flatMap(
    context<any>(),
    (context) => core.provideContext(self, Context.add(context, tag, service))
  )
})

/** @internal */
export const provideLayer = dual<
  <Env, OutErr2, Env0>(
    layer: Layer.Layer<Env, OutErr2, Env0>
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr2 | OutErr, InErr, OutDone, InDone, Env0>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutErr2, Env0>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    layer: Layer.Layer<Env, OutErr2, Env0>
  ) => Channel.Channel<OutElem, InElem, OutErr2 | OutErr, InErr, OutDone, InDone, Env0>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutErr2, Env0>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  layer: Layer.Layer<Env, OutErr2, Env0>
): Channel.Channel<OutElem, InElem, OutErr | OutErr2, InErr, OutDone, InDone, Env0> =>
  unwrapScoped(Effect.map(Layer.build(layer), (env) => core.provideContext(self, env))))

/** @internal */
export const mapInputContext = dual<
  <Env0, Env>(
    f: (env: Context.Context<Env0>) => Context.Context<Env>
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env0>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, Env0>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    f: (env: Context.Context<Env0>) => Context.Context<Env>
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env0>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, Env0>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
  f: (env: Context.Context<Env0>) => Context.Context<Env>
): Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env0> =>
  contextWithChannel((context: Context.Context<Env0>) => core.provideContext(self, f(context))))

/** @internal */
export const provideSomeLayer = dual<
  <R2, OutErr2, Env0>(
    layer: Layer.Layer<R2, OutErr2, Env0>
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone, R>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, R>
  ) => Channel.Channel<OutElem, InElem, OutErr2 | OutErr, InErr, OutDone, InDone, Env0 | Exclude<R, R2>>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, R, R2, OutErr2, Env0>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, R>,
    layer: Layer.Layer<R2, OutErr2, Env0>
  ) => Channel.Channel<OutElem, InElem, OutErr2 | OutErr, InErr, OutDone, InDone, Env0 | Exclude<R, R2>>
>(2, <OutElem, InElem, OutErr, InErr, OutDone, InDone, R, R2, OutErr2, Env0>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, R>,
  layer: Layer.Layer<R2, OutErr2, Env0>
): Channel.Channel<OutElem, InElem, OutErr | OutErr2, InErr, OutDone, InDone, Env0 | Exclude<R, R2>> =>
  // @ts-expect-error
  provideLayer(self, Layer.merge(Layer.context<Exclude<R, R2>>(), layer)))

/** @internal */
export const read = <In>(): Channel.Channel<never, In, Option.Option<never>, unknown, In, unknown> =>
  core.readOrFail<Option.Option<never>, In>(Option.none())

/** @internal */
export const repeated = <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
): Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env> => core.flatMap(self, () => repeated(self))

/** @internal */
export const run = <OutErr, InErr, OutDone, InDone, Env>(
  self: Channel.Channel<never, unknown, OutErr, InErr, OutDone, InDone, Env>
): Effect.Effect<OutDone, OutErr, Env> => Effect.scoped(executor.runScoped(self))

/** @internal */
export const runCollect = <OutElem, OutErr, InErr, OutDone, InDone, Env>(
  self: Channel.Channel<OutElem, unknown, OutErr, InErr, OutDone, InDone, Env>
): Effect.Effect<[Chunk.Chunk<OutElem>, OutDone], OutErr, Env> => executor.run(core.collectElements(self))

/** @internal */
export const runDrain = <OutElem, OutErr, InErr, OutDone, InDone, Env>(
  self: Channel.Channel<OutElem, unknown, OutErr, InErr, OutDone, InDone, Env>
): Effect.Effect<OutDone, OutErr, Env> => executor.run(drain(self))

/** @internal */
export const scoped = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Channel.Channel<A, unknown, E, unknown, unknown, unknown, Exclude<R, Scope.Scope>> =>
  unwrap(
    Effect.uninterruptibleMask((restore) =>
      Effect.map(Scope.make(), (scope) =>
        core.acquireReleaseOut(
          Effect.tapErrorCause(
            restore(Scope.extend(effect, scope)),
            (cause) => Scope.close(scope, Exit.failCause(cause))
          ),
          (_, exit) => Scope.close(scope, exit)
        ))
    )
  )

/** @internal */
export const service = <T extends Context.Tag<any, any>>(
  tag: T
): Channel.Channel<never, unknown, never, unknown, Context.Tag.Service<T>, unknown, Context.Tag.Identifier<T>> =>
  core.fromEffect(tag)

/** @internal */
export const serviceWith = <T extends Context.Tag<any, any>>(tag: T) =>
<OutDone>(
  f: (resource: Context.Tag.Service<T>) => OutDone
): Channel.Channel<never, unknown, never, unknown, OutDone, unknown, Context.Tag.Identifier<T>> => map(service(tag), f)

/** @internal */
export const serviceWithChannel =
  <T extends Context.Tag<any, any>>(tag: T) =>
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    f: (resource: Context.Tag.Service<T>) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ): Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env | Context.Tag.Identifier<T>> =>
    core.flatMap(service(tag), f)

/** @internal */
export const serviceWithEffect = <T extends Context.Tag<any, any>>(tag: T) =>
<Env, OutErr, OutDone>(
  f: (resource: Context.Tag.Service<T>) => Effect.Effect<OutDone, OutErr, Env>
): Channel.Channel<never, unknown, OutErr, unknown, OutDone, unknown, Env | Context.Tag.Identifier<T>> =>
  mapEffect(service(tag), f)

/** @internal */
export const splitLines = <Err, Done>(): Channel.Channel<
  Chunk.Chunk<string>,
  Chunk.Chunk<string>,
  Err,
  Err,
  Done,
  Done,
  never
> =>
  core.suspend(() => {
    let stringBuilder = ""
    let midCRLF = false
    const splitLinesChunk = (chunk: Chunk.Chunk<string>): Chunk.Chunk<string> => {
      const chunkBuilder: Array<string> = []
      Chunk.map(chunk, (str) => {
        if (str.length !== 0) {
          let from = 0
          let indexOfCR = str.indexOf("\r")
          let indexOfLF = str.indexOf("\n")
          if (midCRLF) {
            if (indexOfLF === 0) {
              chunkBuilder.push(stringBuilder)
              stringBuilder = ""
              from = 1
              indexOfLF = str.indexOf("\n", from)
            } else {
              stringBuilder = stringBuilder + "\r"
            }
            midCRLF = false
          }
          while (indexOfCR !== -1 || indexOfLF !== -1) {
            if (indexOfCR === -1 || (indexOfLF !== -1 && indexOfLF < indexOfCR)) {
              if (stringBuilder.length === 0) {
                chunkBuilder.push(str.substring(from, indexOfLF))
              } else {
                chunkBuilder.push(stringBuilder + str.substring(from, indexOfLF))
                stringBuilder = ""
              }
              from = indexOfLF + 1
              indexOfLF = str.indexOf("\n", from)
            } else {
              if (str.length === indexOfCR + 1) {
                midCRLF = true
                indexOfCR = -1
              } else {
                if (indexOfLF === indexOfCR + 1) {
                  if (stringBuilder.length === 0) {
                    chunkBuilder.push(str.substring(from, indexOfCR))
                  } else {
                    stringBuilder = stringBuilder + str.substring(from, indexOfCR)
                    chunkBuilder.push(stringBuilder)
                    stringBuilder = ""
                  }
                  from = indexOfCR + 2
                  indexOfCR = str.indexOf("\r", from)
                  indexOfLF = str.indexOf("\n", from)
                } else {
                  indexOfCR = str.indexOf("\r", indexOfCR + 1)
                }
              }
            }
          }
          if (midCRLF) {
            stringBuilder = stringBuilder + str.substring(from, str.length - 1)
          } else {
            stringBuilder = stringBuilder + str.substring(from, str.length)
          }
        }
      })
      return Chunk.unsafeFromArray(chunkBuilder)
    }
    const loop: Channel.Channel<Chunk.Chunk<string>, Chunk.Chunk<string>, Err, Err, Done, Done, never> = core
      .readWithCause({
        onInput: (input: Chunk.Chunk<string>) => {
          const out = splitLinesChunk(input)
          return Chunk.isEmpty(out)
            ? loop
            : core.flatMap(core.write(out), () => loop)
        },
        onFailure: (cause) =>
          stringBuilder.length === 0
            ? core.failCause(cause)
            : core.flatMap(core.write(Chunk.of(stringBuilder)), () => core.failCause(cause)),
        onDone: (done) =>
          stringBuilder.length === 0
            ? core.succeed(done)
            : core.flatMap(core.write(Chunk.of(stringBuilder)), () => core.succeed(done))
      })
    return loop
  })

/** @internal */
export const toPubSub = <Done, Err, Elem>(
  pubsub: PubSub.PubSub<Either.Either<Elem, Exit.Exit<Done, Err>>>
): Channel.Channel<never, Elem, never, Err, unknown, Done> => toQueue(pubsub)

/** @internal */
export const toPull = <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
  self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
): Effect.Effect<Effect.Effect<Either.Either<OutElem, OutDone>, OutErr, Env>, never, Env | Scope.Scope> =>
  Effect.map(
    Effect.acquireRelease(
      Effect.sync(() => new executor.ChannelExecutor(self, void 0, identity)),
      (exec, exit) => {
        const finalize = exec.close(exit)
        return finalize === undefined ? Effect.void : finalize
      }
    ),
    (exec) => Effect.suspend(() => interpretToPull(exec.run() as ChannelState.ChannelState<OutErr, Env>, exec))
  )

/** @internal */
const interpretToPull = <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channelState: ChannelState.ChannelState<OutErr, Env>,
  exec: executor.ChannelExecutor<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
): Effect.Effect<Either.Either<OutElem, OutDone>, OutErr, Env> => {
  const state = channelState as ChannelState.Primitive
  switch (state._tag) {
    case ChannelStateOpCodes.OP_DONE: {
      return Exit.match(exec.getDone(), {
        onFailure: Effect.failCause,
        onSuccess: (done): Effect.Effect<Either.Either<OutElem, OutDone>, OutErr, Env> =>
          Effect.succeed(Either.left(done))
      })
    }
    case ChannelStateOpCodes.OP_EMIT: {
      return Effect.succeed(Either.right(exec.getEmit()))
    }
    case ChannelStateOpCodes.OP_FROM_EFFECT: {
      return pipe(
        state.effect as Effect.Effect<Either.Either<OutElem, OutDone>, OutErr, Env>,
        Effect.flatMap(() => interpretToPull(exec.run() as ChannelState.ChannelState<OutErr, Env>, exec))
      )
    }
    case ChannelStateOpCodes.OP_READ: {
      return executor.readUpstream(
        state,
        () => interpretToPull(exec.run() as ChannelState.ChannelState<OutErr, Env>, exec),
        (cause) => Effect.failCause(cause) as Effect.Effect<Either.Either<OutElem, OutDone>, OutErr, Env>
      )
    }
  }
}

/** @internal */
export const toQueue = <Done, Err, Elem>(
  queue: Queue.Enqueue<Either.Either<Elem, Exit.Exit<Done, Err>>>
): Channel.Channel<never, Elem, never, Err, unknown, Done> => core.suspend(() => toQueueInternal(queue))

/** @internal */
const toQueueInternal = <Err, Done, Elem>(
  queue: Queue.Enqueue<Either.Either<Elem, Exit.Exit<Done, Err>>>
): Channel.Channel<never, Elem, never, Err, unknown, Done> => {
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
export const unwrap = <OutElem, InElem, OutErr, InErr, OutDone, InDone, R2, E, R>(
  channel: Effect.Effect<Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, R2>, E, R>
): Channel.Channel<OutElem, InElem, E | OutErr, InErr, OutDone, InDone, R | R2> => flatten(core.fromEffect(channel))

/** @internal */
export const unwrapScoped = <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, E, R>(
  self: Effect.Effect<Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>, E, R>
): Channel.Channel<OutElem, InElem, E | OutErr, InErr, OutDone, InDone, Env | Exclude<R, Scope.Scope>> =>
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
  ) => <OutElem, OutErr, InErr, OutDone, InDone, R>(
    self: Channel.Channel<OutElem, unknown, OutErr, InErr, OutDone, InDone, R>
  ) => Channel.Channel<OutElem, unknown, OutErr, InErr, OutDone, InDone, T | R>,
  <OutElem, OutErr, InErr, OutDone, InDone, R, T extends Context.Tag<any, any>>(
    self: Channel.Channel<OutElem, unknown, OutErr, InErr, OutDone, InDone, R>,
    tag: T,
    f: (resource: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ) => Channel.Channel<OutElem, unknown, OutErr, InErr, OutDone, InDone, T | R>
>(3, <OutElem, OutErr, InErr, OutDone, InDone, R, T extends Context.Tag<any, any>>(
  self: Channel.Channel<OutElem, unknown, OutErr, InErr, OutDone, InDone, R>,
  tag: T,
  f: (resource: Context.Tag.Service<T>) => Context.Tag.Service<T>
): Channel.Channel<OutElem, unknown, OutErr, InErr, OutDone, InDone, R | T> =>
  mapInputContext(self, (context: Context.Context<R>) =>
    Context.merge(
      context,
      Context.make(tag, f(Context.unsafeGet(context, tag)))
    )))

/** @internal */
export const withSpan = dual<
  (
    name: string,
    options?: Tracer.SpanOptions
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Exclude<Env, Tracer.ParentSpan>>,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    name: string,
    options?: Tracer.SpanOptions
  ) => Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Exclude<Env, Tracer.ParentSpan>>
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
): Channel.Channel<OutElem> => writeChunk(Chunk.fromIterable(outs))

/** @internal */
export const writeChunk = <OutElem>(
  outs: Chunk.Chunk<OutElem>
): Channel.Channel<OutElem> => writeChunkWriter(0, outs.length, outs)

/** @internal */
const writeChunkWriter = <OutElem>(
  idx: number,
  len: number,
  chunk: Chunk.Chunk<OutElem>
): Channel.Channel<OutElem> => {
  return idx === len
    ? core.void
    : pipe(
      core.write(pipe(chunk, Chunk.unsafeGet(idx))),
      core.flatMap(() => writeChunkWriter(idx + 1, len, chunk))
    )
}

/** @internal */
export const zip = dual<
  <OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>(
    that: Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<
    OutElem1 | OutElem,
    InElem & InElem1,
    OutErr1 | OutErr,
    InErr & InErr1,
    readonly [OutDone, OutDone1],
    InDone & InDone1,
    Env1 | Env
  >,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    that: Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => Channel.Channel<
    OutElem1 | OutElem,
    InElem & InElem1,
    OutErr1 | OutErr,
    InErr & InErr1,
    readonly [OutDone, OutDone1],
    InDone & InDone1,
    Env1 | Env
  >
>(
  (args) => core.isChannel(args[1]),
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    that: Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): Channel.Channel<
    OutElem | OutElem1,
    InElem & InElem1,
    OutErr | OutErr1,
    InErr & InErr1,
    readonly [OutDone, OutDone1],
    InDone & InDone1,
    Env | Env1
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
  <OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>(
    that: Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<
    OutElem1 | OutElem,
    InElem & InElem1,
    OutErr1 | OutErr,
    InErr & InErr1,
    OutDone,
    InDone & InDone1,
    Env1 | Env
  >,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    that: Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => Channel.Channel<
    OutElem1 | OutElem,
    InElem & InElem1,
    OutErr1 | OutErr,
    InErr & InErr1,
    OutDone,
    InDone & InDone1,
    Env1 | Env
  >
>(
  (args) => core.isChannel(args[1]),
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    that: Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): Channel.Channel<
    OutElem | OutElem1,
    InElem & InElem1,
    OutErr | OutErr1,
    InErr & InErr1,
    OutDone,
    InDone & InDone1,
    Env | Env1
  > =>
    options?.concurrent ?
      map(zip(self, that, { concurrent: true }), (tuple) => tuple[0]) :
      core.flatMap(self, (z) => as(that, z))
)

/** @internal */
export const zipRight = dual<
  <OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>(
    that: Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>
  ) => Channel.Channel<
    OutElem1 | OutElem,
    InElem & InElem1,
    OutErr1 | OutErr,
    InErr & InErr1,
    OutDone1,
    InDone & InDone1,
    Env1 | Env
  >,
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    that: Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ) => Channel.Channel<
    OutElem1 | OutElem,
    InElem & InElem1,
    OutErr1 | OutErr,
    InErr & InErr1,
    OutDone1,
    InDone & InDone1,
    Env1 | Env
  >
>(
  (args) => core.isChannel(args[1]),
  <OutElem, InElem, OutErr, InErr, OutDone, InDone, Env, OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>(
    self: Channel.Channel<OutElem, InElem, OutErr, InErr, OutDone, InDone, Env>,
    that: Channel.Channel<OutElem1, InElem1, OutErr1, InErr1, OutDone1, InDone1, Env1>,
    options?: {
      readonly concurrent?: boolean | undefined
    }
  ): Channel.Channel<
    OutElem | OutElem1,
    InElem & InElem1,
    OutErr | OutErr1,
    InErr & InErr1,
    OutDone1,
    InDone & InDone1,
    Env | Env1
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
