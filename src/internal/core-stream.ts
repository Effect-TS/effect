import * as Cause from "../Cause.js"
import type * as Channel from "../Channel.js"
import type * as ChildExecutorDecision from "../ChildExecutorDecision.js"
import * as Chunk from "../Chunk.js"
import type * as Context from "../Context.js"
import * as Effect from "../Effect.js"
import * as Either from "../Either.js"
import type * as Exit from "../Exit.js"
import { constVoid, dual, identity } from "../Function.js"
import type { LazyArg } from "../Function.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty } from "../Predicate.js"
import type * as SingleProducerAsyncInput from "../SingleProducerAsyncInput.js"
import type * as UpstreamPullRequest from "../UpstreamPullRequest.js"
import type * as UpstreamPullStrategy from "../UpstreamPullStrategy.js"
import * as childExecutorDecision from "./channel/childExecutorDecision.js"
import type { ErasedContinuationK } from "./channel/continuation.js"
import { ContinuationKImpl } from "./channel/continuation.js"
import * as upstreamPullStrategy from "./channel/upstreamPullStrategy.js"
import * as OpCodes from "./opCodes/channel.js"

/** @internal */
const ChannelSymbolKey = "effect/Channel"

/** @internal */
export const ChannelTypeId: Channel.ChannelTypeId = Symbol.for(
  ChannelSymbolKey
) as Channel.ChannelTypeId

const channelVariance = {
  /* c8 ignore next */
  _Env: (_: never) => _,
  /* c8 ignore next */
  _InErr: (_: unknown) => _,
  /* c8 ignore next */
  _InElem: (_: unknown) => _,
  /* c8 ignore next */
  _InDone: (_: unknown) => _,
  /* c8 ignore next */
  _OutErr: (_: never) => _,
  /* c8 ignore next */
  _OutElem: (_: never) => _,
  /* c8 ignore next */
  _OutDone: (_: never) => _
}

/** @internal */
const proto = {
  [ChannelTypeId]: channelVariance,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
type ErasedChannel = Channel.Channel<never, unknown, unknown, unknown, never, never, never>

/** @internal */
export type Op<Tag extends string, Body = {}> =
  & ErasedChannel
  & Body
  & { readonly _tag: Tag }

export type Primitive =
  | BracketOut
  | Bridge
  | ConcatAll
  | Emit
  | Ensuring
  | Fail
  | Fold
  | FromEffect
  | PipeTo
  | Provide
  | Read
  | Succeed
  | SucceedNow
  | Suspend

/** @internal */
export interface BracketOut extends
  Op<OpCodes.OP_BRACKET_OUT, {
    acquire(): Effect.Effect<unknown, unknown, unknown>
    finalizer(resource: unknown, exit: Exit.Exit<unknown, unknown>): Effect.Effect<unknown, unknown, unknown>
  }>
{}

/** @internal */
export interface Bridge extends
  Op<OpCodes.OP_BRIDGE, {
    readonly input: SingleProducerAsyncInput.AsyncInputProducer<unknown, unknown, unknown>
    readonly channel: ErasedChannel
  }>
{}

/** @internal */
export interface ConcatAll extends
  Op<OpCodes.OP_CONCAT_ALL, {
    combineInners(outDone: unknown, outDone2: unknown): unknown
    combineAll(outDone: unknown, outDone2: unknown): unknown
    onPull(
      request: UpstreamPullRequest.UpstreamPullRequest<unknown>
    ): UpstreamPullStrategy.UpstreamPullStrategy<unknown>
    onEmit(outElem: unknown): ChildExecutorDecision.ChildExecutorDecision
    value(): ErasedChannel
    k(outElem: unknown): ErasedChannel
  }>
{}

/** @internal */
export interface Emit extends
  Op<OpCodes.OP_EMIT, {
    readonly out: unknown
  }>
{}

/** @internal */
export interface Ensuring extends
  Op<OpCodes.OP_ENSURING, {
    readonly channel: ErasedChannel
    finalizer(exit: Exit.Exit<unknown, unknown>): Effect.Effect<unknown, unknown, unknown>
  }>
{}

/** @internal */
export interface Fail extends
  Op<OpCodes.OP_FAIL, {
    error(): Cause.Cause<unknown>
  }>
{}

/** @internal */
export interface Fold extends
  Op<OpCodes.OP_FOLD, {
    readonly channel: ErasedChannel
    readonly k: ErasedContinuationK
  }>
{}

/** @internal */
export interface FromEffect extends
  Op<OpCodes.OP_FROM_EFFECT, {
    effect(): Effect.Effect<unknown, unknown, unknown>
  }>
{}

/** @internal */
export interface PipeTo extends
  Op<OpCodes.OP_PIPE_TO, {
    left(): ErasedChannel
    right(): ErasedChannel
  }>
{}

/** @internal */
export interface Provide extends
  Op<OpCodes.OP_PROVIDE, {
    context(): Context.Context<unknown>
    readonly inner: ErasedChannel
  }>
{}

/** @internal */
export interface Read extends
  Op<OpCodes.OP_READ, {
    more(input: unknown): ErasedChannel
    readonly done: ErasedContinuationK
  }>
{}

/** @internal */
export interface Succeed extends
  Op<OpCodes.OP_SUCCEED, {
    evaluate(): unknown
  }>
{}

/** @internal */
export interface SucceedNow extends
  Op<OpCodes.OP_SUCCEED_NOW, {
    readonly terminal: unknown
  }>
{}

/** @internal */
export interface Suspend extends
  Op<OpCodes.OP_SUSPEND, {
    channel(): ErasedChannel
  }>
{}

/** @internal */
export const isChannel = (u: unknown): u is Channel.Channel<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
> => hasProperty(u, ChannelTypeId) || Effect.isEffect(u)

/** @internal */
export const acquireReleaseOut = dual<
  <R2, Z>(
    release: (z: Z, e: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, unknown>
  ) => <R, E>(self: Effect.Effect<R, E, Z>) => Channel.Channel<R | R2, unknown, unknown, unknown, E, Z, void>,
  <R, R2, E, Z>(
    self: Effect.Effect<R, E, Z>,
    release: (z: Z, e: Exit.Exit<unknown, unknown>) => Effect.Effect<R2, never, unknown>
  ) => Channel.Channel<R | R2, unknown, unknown, unknown, E, Z, void>
>(2, (self, release) => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_BRACKET_OUT
  op.acquire = () => self
  op.finalizer = release
  return op
})

/** @internal */
export const catchAllCause = dual<
  <Env1, InErr1, InElem1, InDone1, OutErr, OutErr1, OutElem1, OutDone1>(
    f: (cause: Cause.Cause<OutErr>) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
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
    f: (cause: Cause.Cause<OutErr>) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
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
    f: (cause: Cause.Cause<OutErr>) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
  ): Channel.Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1,
    OutElem | OutElem1,
    OutDone | OutDone1
  > => {
    const op = Object.create(proto)
    op._tag = OpCodes.OP_FOLD
    op.channel = self
    op.k = new ContinuationKImpl(succeed, f)
    return op
  }
)

/** @internal */
export const collectElements = <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel.Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  never,
  [Chunk.Chunk<OutElem>, OutDone]
> => {
  return suspend(() => {
    const builder: Array<OutElem> = []
    return flatMap(
      pipeTo(self, collectElementsReader(builder)),
      (value) => sync(() => [Chunk.fromIterable(builder), value])
    )
  })
}

/** @internal */
const collectElementsReader = <OutErr, OutElem, OutDone>(
  builder: Array<OutElem>
): Channel.Channel<never, OutErr, OutElem, OutDone, OutErr, never, OutDone> =>
  readWith({
    onInput: (outElem) =>
      flatMap(
        sync(() => {
          builder.push(outElem)
        }),
        () => collectElementsReader<OutErr, OutElem, OutDone>(builder)
      ),
    onFailure: fail,
    onDone: succeedNow
  })

/** @internal */
export const concatAll = <Env, InErr, InElem, InDone, OutErr, OutElem>(
  channels: Channel.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>,
    any
  >
): Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any> => concatAllWith(channels, constVoid, constVoid)

/** @internal */
export const concatAllWith = <
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  OutDone2,
  OutDone3,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  channels: Channel.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem, OutDone>,
    OutDone2
  >,
  f: (o: OutDone, o1: OutDone) => OutDone,
  g: (o: OutDone, o2: OutDone2) => OutDone3
): Channel.Channel<
  Env | Env2,
  InErr & InErr2,
  InElem & InElem2,
  InDone & InDone2,
  OutErr | OutErr2,
  OutElem,
  OutDone3
> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_CONCAT_ALL
  op.combineInners = f
  op.combineAll = g
  op.onPull = () => upstreamPullStrategy.PullAfterNext(Option.none())
  op.onEmit = () => childExecutorDecision.Continue
  op.value = () => channels
  op.k = identity
  return op
}

/** @internal */
export const concatMapWith = dual<
  <OutElem, OutElem2, OutDone, OutDone2, OutDone3, Env2, InErr2, InElem2, InDone2, OutErr2>(
    f: (o: OutElem) => Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>,
    g: (o: OutDone, o1: OutDone) => OutDone,
    h: (o: OutDone, o2: OutDone2) => OutDone3
  ) => <Env, InErr, InElem, InDone, OutErr>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>
  ) => Channel.Channel<
    Env2 | Env,
    InErr & InErr2,
    InElem & InElem2,
    InDone & InDone2,
    OutErr2 | OutErr,
    OutElem2,
    OutDone3
  >,
  <
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    OutElem,
    OutElem2,
    OutDone,
    OutDone2,
    OutDone3,
    Env2,
    InErr2,
    InElem2,
    InDone2,
    OutErr2
  >(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
    f: (o: OutElem) => Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>,
    g: (o: OutDone, o1: OutDone) => OutDone,
    h: (o: OutDone, o2: OutDone2) => OutDone3
  ) => Channel.Channel<
    Env2 | Env,
    InErr & InErr2,
    InElem & InElem2,
    InDone & InDone2,
    OutErr2 | OutErr,
    OutElem2,
    OutDone3
  >
>(4, <
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
  f: (
    o: OutElem
  ) => Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>,
  g: (o: OutDone, o1: OutDone) => OutDone,
  h: (o: OutDone, o2: OutDone2) => OutDone3
): Channel.Channel<
  Env | Env2,
  InErr & InErr2,
  InElem & InElem2,
  InDone & InDone2,
  OutErr | OutErr2,
  OutElem2,
  OutDone3
> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_CONCAT_ALL
  op.combineInners = g
  op.combineAll = h
  op.onPull = () => upstreamPullStrategy.PullAfterNext(Option.none())
  op.onEmit = () => childExecutorDecision.Continue
  op.value = () => self
  op.k = f
  return op
})

/** @internal */
export const concatMapWithCustom = dual<
  <OutElem, OutElem2, OutDone, OutDone2, OutDone3, Env2, InErr2, InElem2, InDone2, OutErr2>(
    f: (o: OutElem) => Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>,
    g: (o: OutDone, o1: OutDone) => OutDone,
    h: (o: OutDone, o2: OutDone2) => OutDone3,
    onPull: (
      upstreamPullRequest: UpstreamPullRequest.UpstreamPullRequest<OutElem>
    ) => UpstreamPullStrategy.UpstreamPullStrategy<OutElem2>,
    onEmit: (elem: OutElem2) => ChildExecutorDecision.ChildExecutorDecision
  ) => <Env, InErr, InElem, InDone, OutErr>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>
  ) => Channel.Channel<
    Env2 | Env,
    InErr & InErr2,
    InElem & InElem2,
    InDone & InDone2,
    OutErr2 | OutErr,
    OutElem2,
    OutDone3
  >,
  <
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    OutElem,
    OutElem2,
    OutDone,
    OutDone2,
    OutDone3,
    Env2,
    InErr2,
    InElem2,
    InDone2,
    OutErr2
  >(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
    f: (o: OutElem) => Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>,
    g: (o: OutDone, o1: OutDone) => OutDone,
    h: (o: OutDone, o2: OutDone2) => OutDone3,
    onPull: (
      upstreamPullRequest: UpstreamPullRequest.UpstreamPullRequest<OutElem>
    ) => UpstreamPullStrategy.UpstreamPullStrategy<OutElem2>,
    onEmit: (elem: OutElem2) => ChildExecutorDecision.ChildExecutorDecision
  ) => Channel.Channel<
    Env2 | Env,
    InErr & InErr2,
    InElem & InElem2,
    InDone & InDone2,
    OutErr2 | OutErr,
    OutElem2,
    OutDone3
  >
>(6, <
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone,
  OutDone2,
  OutDone3,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
  f: (
    o: OutElem
  ) => Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>,
  g: (o: OutDone, o1: OutDone) => OutDone,
  h: (o: OutDone, o2: OutDone2) => OutDone3,
  onPull: (
    upstreamPullRequest: UpstreamPullRequest.UpstreamPullRequest<OutElem>
  ) => UpstreamPullStrategy.UpstreamPullStrategy<OutElem2>,
  onEmit: (elem: OutElem2) => ChildExecutorDecision.ChildExecutorDecision
): Channel.Channel<
  Env | Env2,
  InErr & InErr2,
  InElem & InElem2,
  InDone & InDone2,
  OutErr | OutErr2,
  OutElem2,
  OutDone3
> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_CONCAT_ALL
  op.combineInners = g
  op.combineAll = h
  op.onPull = onPull
  op.onEmit = onEmit
  op.value = () => self
  op.k = f
  return op
})

/** @internal */
export const embedInput = dual<
  <InErr, InElem, InDone>(
    input: SingleProducerAsyncInput.AsyncInputProducer<InErr, InElem, InDone>
  ) => <Env, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  <Env, OutErr, OutElem, OutDone, InErr, InElem, InDone>(
    self: Channel.Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>,
    input: SingleProducerAsyncInput.AsyncInputProducer<InErr, InElem, InDone>
  ) => Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
>(
  2,
  <Env, OutErr, OutElem, OutDone, InErr, InElem, InDone>(
    self: Channel.Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>,
    input: SingleProducerAsyncInput.AsyncInputProducer<InErr, InElem, InDone>
  ): Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> => {
    const op = Object.create(proto)
    op._tag = OpCodes.OP_BRIDGE
    op.input = input
    op.channel = self
    return op
  }
)

/** @internal */
export const ensuringWith = dual<
  <Env2, OutErr, OutDone>(
    finalizer: (e: Exit.Exit<OutErr, OutDone>) => Effect.Effect<Env2, never, unknown>
  ) => <Env, InErr, InElem, InDone, OutElem>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env2 | Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  <Env, InErr, InElem, InDone, OutElem, Env2, OutErr, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    finalizer: (e: Exit.Exit<OutErr, OutDone>) => Effect.Effect<Env2, never, unknown>
  ) => Channel.Channel<Env2 | Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
>(
  2,
  <Env, InErr, InElem, InDone, OutElem, Env2, OutErr, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    finalizer: (e: Exit.Exit<OutErr, OutDone>) => Effect.Effect<Env2, never, unknown>
  ): Channel.Channel<Env | Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone> => {
    const op = Object.create(proto)
    op._tag = OpCodes.OP_ENSURING
    op.channel = self
    op.finalizer = finalizer
    return op
  }
)

/** @internal */
export const fail = <E>(error: E): Channel.Channel<never, unknown, unknown, unknown, E, never, never> =>
  failCause(Cause.fail(error))

/** @internal */
export const failSync = <E>(
  evaluate: LazyArg<E>
): Channel.Channel<never, unknown, unknown, unknown, E, never, never> => failCauseSync(() => Cause.fail(evaluate()))

/** @internal */
export const failCause = <E>(
  cause: Cause.Cause<E>
): Channel.Channel<never, unknown, unknown, unknown, E, never, never> => failCauseSync(() => cause)

/** @internal */
export const failCauseSync = <E>(
  evaluate: LazyArg<Cause.Cause<E>>
): Channel.Channel<never, unknown, unknown, unknown, E, never, never> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_FAIL
  op.error = evaluate
  return op
}

/** @internal */
export const flatMap = dual<
  <OutDone, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>(
    f: (d: OutDone) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
  ) => <Env, InErr, InElem, InDone, OutErr, OutElem>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1 | OutErr,
    OutElem1 | OutElem,
    OutDone2
  >,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (d: OutDone) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
  ) => Channel.Channel<
    Env1 | Env,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr1 | OutErr,
    OutElem1 | OutElem,
    OutDone2
  >
>(
  2,
  <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    f: (d: OutDone) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone2>
  ): Channel.Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    OutDone2
  > => {
    const op = Object.create(proto)
    op._tag = OpCodes.OP_FOLD
    op.channel = self
    op.k = new ContinuationKImpl(f, failCause)
    return op
  }
)

/** @internal */
export const foldCauseChannel = dual<
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
    OutErr2,
    OutErr3,
    OutElem1,
    OutElem2,
    OutDone,
    OutDone2,
    OutDone3
  >(
    options: {
      readonly onFailure: (
        c: Cause.Cause<OutErr>
      ) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr2, OutElem1, OutDone2>
      readonly onSuccess: (o: OutDone) => Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr3, OutElem2, OutDone3>
    }
  ) => <Env, InErr, InElem, InDone, OutElem>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<
    Env1 | Env2 | Env,
    InErr & InErr1 & InErr2,
    InElem & InElem1 & InElem2,
    InDone & InDone1 & InDone2,
    OutErr2 | OutErr3,
    OutElem1 | OutElem2 | OutElem,
    OutDone2 | OutDone3
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
    OutErr2,
    OutErr3,
    OutElem1,
    OutElem2,
    OutDone,
    OutDone2,
    OutDone3
  >(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    options: {
      readonly onFailure: (
        c: Cause.Cause<OutErr>
      ) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr2, OutElem1, OutDone2>
      readonly onSuccess: (o: OutDone) => Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr3, OutElem2, OutDone3>
    }
  ) => Channel.Channel<
    Env1 | Env2 | Env,
    InErr & InErr1 & InErr2,
    InElem & InElem1 & InElem2,
    InDone & InDone1 & InDone2,
    OutErr2 | OutErr3,
    OutElem1 | OutElem2 | OutElem,
    OutDone2 | OutDone3
  >
>(
  2,
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
    OutErr2,
    OutErr3,
    OutElem1,
    OutElem2,
    OutDone,
    OutDone2,
    OutDone3
  >(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    options: {
      readonly onFailure: (
        c: Cause.Cause<OutErr>
      ) => Channel.Channel<Env1, InErr1, InElem1, InDone1, OutErr2, OutElem1, OutDone2>
      readonly onSuccess: (o: OutDone) => Channel.Channel<Env2, InErr2, InElem2, InDone2, OutErr3, OutElem2, OutDone3>
    }
  ): Channel.Channel<
    Env | Env1 | Env2,
    InErr & InErr1 & InErr2,
    InElem & InElem1 & InElem2,
    InDone & InDone1 & InDone2,
    OutErr2 | OutErr3,
    OutElem | OutElem1 | OutElem2,
    OutDone2 | OutDone3
  > => {
    const op = Object.create(proto)
    op._tag = OpCodes.OP_FOLD
    op.channel = self
    op.k = new ContinuationKImpl(options.onSuccess, options.onFailure as any)
    return op
  }
)

/** @internal */
export const fromEffect = <R, E, A>(
  effect: Effect.Effect<R, E, A>
): Channel.Channel<R, unknown, unknown, unknown, E, never, A> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_FROM_EFFECT
  op.effect = () => effect
  return op
}

/** @internal */
export const pipeTo = dual<
  <Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>(
    that: Channel.Channel<Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
  ) => <Env, InErr, InElem, InDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<Env2 | Env, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>,
  <Env, InErr, InElem, InDone, Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    that: Channel.Channel<Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
  ) => Channel.Channel<Env2 | Env, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>
>(
  2,
  <Env, InErr, InElem, InDone, Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    that: Channel.Channel<Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>
  ): Channel.Channel<Env | Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2> => {
    const op = Object.create(proto)
    op._tag = OpCodes.OP_PIPE_TO
    op.left = () => self
    op.right = () => that
    return op
  }
)

/** @internal */
export const provideContext = dual<
  <Env>(
    env: Context.Context<Env>
  ) => <InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => Channel.Channel<never, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  <InErr, InElem, InDone, OutErr, OutElem, OutDone, Env>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    env: Context.Context<Env>
  ) => Channel.Channel<never, InErr, InElem, InDone, OutErr, OutElem, OutDone>
>(
  2,
  <InErr, InElem, InDone, OutErr, OutElem, OutDone, Env>(
    self: Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
    env: Context.Context<Env>
  ): Channel.Channel<never, InErr, InElem, InDone, OutErr, OutElem, OutDone> => {
    const op = Object.create(proto)
    op._tag = OpCodes.OP_PROVIDE
    op.context = () => env
    op.inner = self
    return op
  }
)

/** @internal */
export const readOrFail = <In, E>(
  error: E
): Channel.Channel<never, unknown, In, unknown, E, never, In> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_READ
  op.more = succeed
  op.done = new ContinuationKImpl(() => fail(error), () => fail(error))
  return op
}

/** @internal */
export const readWith = <
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  Env2,
  OutErr2,
  OutElem2,
  OutDone2,
  Env3,
  OutErr3,
  OutElem3,
  OutDone3
>(
  options: {
    readonly onInput: (input: InElem) => Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
    readonly onFailure: (error: InErr) => Channel.Channel<Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>
    readonly onDone: (done: InDone) => Channel.Channel<Env3, InErr, InElem, InDone, OutErr3, OutElem3, OutDone3>
  }
): Channel.Channel<
  Env | Env2 | Env3,
  InErr,
  InElem,
  InDone,
  OutErr | OutErr2 | OutErr3,
  OutElem | OutElem2 | OutElem3,
  OutDone | OutDone2 | OutDone3
> =>
  readWithCause({
    onInput: options.onInput,
    onFailure: (cause) => Either.match(Cause.failureOrCause(cause), { onLeft: options.onFailure, onRight: failCause }),
    onDone: options.onDone
  })

/** @internal */
export const readWithCause = <
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  Env2,
  OutErr2,
  OutElem2,
  OutDone2,
  Env3,
  OutErr3,
  OutElem3,
  OutDone3
>(
  options: {
    readonly onInput: (input: InElem) => Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
    readonly onFailure: (
      cause: Cause.Cause<InErr>
    ) => Channel.Channel<Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>
    readonly onDone: (done: InDone) => Channel.Channel<Env3, InErr, InElem, InDone, OutErr3, OutElem3, OutDone3>
  }
): Channel.Channel<
  Env | Env2 | Env3,
  InErr,
  InElem,
  InDone,
  OutErr | OutErr2 | OutErr3,
  OutElem | OutElem2 | OutElem3,
  OutDone | OutDone2 | OutDone3
> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_READ
  op.more = options.onInput
  op.done = new ContinuationKImpl(options.onDone, options.onFailure as any)
  return op
}

/** @internal */
export const succeed = <A>(
  value: A
): Channel.Channel<never, unknown, unknown, unknown, never, never, A> => sync(() => value)

/** @internal */
export const succeedNow = <OutDone>(
  result: OutDone
): Channel.Channel<never, unknown, unknown, unknown, never, never, OutDone> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_SUCCEED_NOW
  op.terminal = result
  return op
}

/** @internal */
export const suspend = <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  evaluate: LazyArg<Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
): Channel.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_SUSPEND
  op.channel = evaluate
  return op
}

export const sync = <OutDone>(
  evaluate: LazyArg<OutDone>
): Channel.Channel<never, unknown, unknown, unknown, never, never, OutDone> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_SUCCEED
  op.evaluate = evaluate
  return op
}

/** @internal */
export const unit: Channel.Channel<never, unknown, unknown, unknown, never, never, void> = succeedNow(void 0)

/** @internal */
export const write = <OutElem>(
  out: OutElem
): Channel.Channel<never, unknown, unknown, unknown, never, OutElem, void> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_EMIT
  op.out = out
  return op
}
