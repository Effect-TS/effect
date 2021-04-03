// tracing: off

import "../../../Operator"

import * as T from "../../../Effect"
import { _A, _C, _E, _I, _L, _O, _R, _U } from "../../../Effect"
import * as E from "../../../Either"
import type { Lazy } from "../../../Function"
import * as M from "../../../Managed"
import * as O from "../../../Option"
import * as L from "../../../Persistent/List"

export interface ChannelApi<R, E, L, I, O, U, A> {
  /**
   * Combine two `Channel`s together into a new `Channel` (aka 'fuse').
   *
   * Output from the upstream (left) conduit will be fed into the
   * downstream (right) conduit. Processing will terminate when
   * downstream (right) returns.
   * Leftover data returned from the right `Channel` will be discarded.
   */
  readonly [".|"]: <R1, E1, O2, A1>(
    right: Channel<R1, E1, O, O, O2, A, A1>
  ) => Channel<R & R1, E | E1, L, I, O2, U, A1>
}

export const ChannelTypeId = Symbol()

/*
 * The underlying datatype has seven type parameters:
 *
 * `R` is the type of the environment that the pipe needs in order to run
 *
 * `E` is the type of the error that the pipe might produce
 *
 * `L` is the type of values that may be left over from this `Channel`. A `Channel`
 * with no leftovers would use `void` here, and one with leftovers would use
 * the same type as the `I` parameter. Leftovers are automatically provided to
 * the next `Channel` in the monadic chain.
 *
 * `I` is the type of values for this `Channel`'s input stream.
 *
 * `O` is the type of values for this `Channel`'s output stream.
 *
 * `U` is the result type from the upstream `Channel`.
 *
 * `A` is the result type.
 *
 * A basic intuition is that every `Channel` produces a stream of output values
 * `O`, and eventually indicates that this stream is terminated by sending a
 * result (`A`). On the receiving end of a `Channel`, these become the `I` and `U`
 * parameters.
 *
 * The encoding of channel is based on the work of Michael Snoyman in `conduit`, a
 * streaming library for data-processing in Haskell where he introduced the concept
 * of a `Pipe` as a way to fuse `Sources` and `Sinks`.
 */
export abstract class Channel<R, E, L, I, O, U, A>
  implements ChannelApi<R, E, L, I, O, U, A> {
  readonly [ChannelTypeId]: typeof ChannelTypeId = ChannelTypeId;
  readonly [_R]!: (_R: R) => void;
  readonly [_E]!: () => E;
  readonly [_L]!: () => L;
  readonly [_I]!: (_I: I) => void;
  readonly [_O]!: () => O;
  readonly [_U]!: (_U: U) => void;
  readonly [_A]!: () => A;
  readonly [_C]!:
    | HaveOutput<R, E, L, I, O, U, A>
    | NeedInput<R, E, L, I, O, U, A>
    | Done<R, E, L, I, O, U, A>
    | ChannelM<R, E, L, I, O, U, A>
    | Leftover<R, E, L, I, O, U, A>
    | WithTracer<R, E, L, I, O, U, A>
  constructor() {
    this[".|"] = this[".|"].bind(this)
  }
  [".|"]<R1, E1, O2, A1>(
    right: Channel<R1, E1, O, O, O2, A, A1>
  ): Channel<R & R1, E | E1, L, I, O2, U, A1> {
    return combine_(this, right)
  }
}

/**
 * Channel with Input & Output without Leftovers, Result and Upstream
 */
export interface Transducer<R, E, I, O>
  extends Channel<R, E, never, I, O, void, void> {}

/**
 * `optimize remove
 */
export function concrete<R, E, L, I, O, U, A>(
  _: Channel<R, E, L, I, O, U, A>
): asserts _ is typeof _[typeof _C] {
  //
}

/**
 * Suspend creation of channel via ChannelM & effectTotal
 */
export function suspend<R, E, L, I, O, U, A>(
  f: () => Channel<R, E, L, I, O, U, A>
): Channel<R, E, L, I, O, U, A> {
  return chain_(unit, f)
}

/**
 * Channel Type Tags
 */
export const HaveOutputTypeId = Symbol()
export const NeedInputTypeId = Symbol()
export const DoneTypeId = Symbol()
export const ChannelMTypeId = Symbol()
export const LeftoverTypeId = Symbol()
export const WithTracerTypeId = Symbol()

/**
 * Provide new output to be sent downstream. This constructor has two
 * fields: the next `Channel` to be used and the output value.
 */
export class WithTracer<R, E, L, I, O, U, A> extends Channel<R, E, L, I, O, U, A> {
  readonly _typeId: typeof WithTracerTypeId = WithTracerTypeId
  constructor(
    readonly nextChannel: (
      tracer: (__trace?: string) => void
    ) => Channel<R, E, L, I, O, U, A>
  ) {
    super()
  }
}

/**
 * Provide new output to be sent downstream. This constructor has two
 * fields: the next `Channel` to be used and the output value.
 */
export class HaveOutput<R, E, L, I, O, U, A> extends Channel<R, E, L, I, O, U, A> {
  readonly _typeId: typeof HaveOutputTypeId = HaveOutputTypeId
  constructor(
    readonly nextChannel: Lazy<Channel<R, E, L, I, O, U, A>>,
    readonly output: O
  ) {
    super()
  }
}

/**
 * Request more input from upstream. The first field takes a new input
 * value and provides a new `Channel`. The second takes an upstream result
 * value, which indicates that upstream is producing no more results
 */
export class NeedInput<R, E, L, I, O, U, A> extends Channel<R, E, L, I, O, U, A> {
  readonly _typeId: typeof NeedInputTypeId = NeedInputTypeId
  constructor(
    readonly nextChannel: (i: I) => Channel<R, E, L, I, O, U, A>,
    readonly fromUpstream: (u: U) => Channel<R, E, L, I, O, U, A>
  ) {
    super()
  }
}

/**
 * Processing with this `Channel` is complete, providing the final result.
 */
export class Done<R, E, L, I, O, U, A> extends Channel<R, E, L, I, O, U, A> {
  readonly _typeId: typeof DoneTypeId = DoneTypeId
  constructor(readonly result: A) {
    super()
  }
}

/**
 * Require running of a monadic action to get the next `Channel`.
 */
export class ChannelM<R, E, L, I, O, U, A> extends Channel<R, E, L, I, O, U, A> {
  readonly _typeId: typeof ChannelMTypeId = ChannelMTypeId
  constructor(readonly nextChannel: M.Managed<R, E, Channel<R, E, L, I, O, U, A>>) {
    super()
  }
}

/**
 * Provide new output to be sent downstream. This constructor has two
 * fields: the next `Channel` to be used and the output value.
 */
export class Leftover<R, E, L, I, O, U, A> extends Channel<R, E, L, I, O, U, A> {
  readonly _typeId: typeof LeftoverTypeId = LeftoverTypeId
  constructor(
    readonly nextChannel: Lazy<Channel<R, E, L, I, O, U, A>>,
    readonly leftover: L
  ) {
    super()
  }
}

/**
 * Try or Die
 */
export function tryOrDie<R, E, L, I, O, U, A>(
  f: () => Channel<R, E, L, I, O, U, A>,
  __trace?: string
): Channel<R, E, L, I, O, U, A> {
  try {
    return f()
  } catch (e) {
    return new ChannelM(M.die(e, __trace))
  }
}

/**
 * Processing with this `Channel` is complete, providing the final result.
 */
export function done<A>(
  a: A
): Channel<unknown, never, never, unknown, never, unknown, A> {
  return new Done(a)
}

/**
 * Provide new output to be sent downstream. This constructor has two
 * fields: the next `Channel` to be used and the output value.
 */
export function haveOutput<R, E, L, I, O, U, A, O1>(
  nextChannel: Lazy<Channel<R, E, L, I, O, U, A>>,
  output: O1
): Channel<R, E, L, I, O | O1, U, A> {
  return new HaveOutput<R, E, L, I, O | O1, U, A>(nextChannel, output)
}

/**
 * Request more input from upstream. The first field takes a new input
 * value and provides a new `Channel`. The second takes an upstream result
 * value, which indicates that upstream is producing no more results
 */
export function needInput<R, E, L, I, O, U, A, R1, E1, L1, I1, O1, U1, A1>(
  newChannel: (i: I) => Channel<R, E, L, I, O, U, A>,
  fromUpstream: (u: U) => Channel<R1, E1, L1, I1, O1, U1, A1>
): Channel<R & R1, E | E1, L | L1, I & I1, O | O1, U & U1, A | A1> {
  return new NeedInput<R & R1, E | E1, L | L1, I & I1, O | O1, U & U1, A | A1>(
    newChannel,
    fromUpstream
  )
}

/**
 * Reads the input and return an optional result
 */
export function readInput<I>(): Channel<
  unknown,
  never,
  never,
  I,
  never,
  unknown,
  O.Option<I>
> {
  return needInput(
    (i: I) => done(O.some(i)),
    () => done(O.none)
  )
}

/**
 * Require running of a monadic action to get the next `Channel`.
 */
export function channelM<R1, E1, R, E, L, I, O, U, A>(
  self: M.Managed<R1, E1, Channel<R, E, L, I, O, U, A>>
): Channel<R & R1, E | E1, L, I, O, U, A> {
  return new ChannelM<R & R1, E | E1, L, I, O, U, A>(self)
}

/**
 * Construct a `Channel` dependent on a `Managed`.
 *
 * Resources will be released as early as possible.
 */
export function managed<R1, E1, R, E, L, I, O, U, A>(
  self: M.Managed<R1, E1, Channel<R, E, L, I, O, U, A>>
): Channel<R & R1, E | E1, L, I, O, U, A> {
  return channelM(
    M.map_(M.withEarlyRelease(self), ([rel, str]) =>
      chain_(str, (a) => channelM(M.map_(M.fromEffect(rel), () => done(a))))
    )
  )
}

/**
 * Require running of a monadic action to get the next `Channel`.
 */
export function effect<R1, E1, R, E, L, I, O, U, A>(
  self: T.Effect<R1, E1, Channel<R, E, L, I, O, U, A>>
): Channel<R & R1, E | E1, L, I, O, U, A> {
  return new ChannelM<R & R1, E | E1, L, I, O, U, A>(M.fromEffect(self))
}

/**
 * Provide new output to be sent downstream. This constructor has two
 * fields: the next `Channel` to be used and the output value.
 */
export function leftover<R, E, L, L1, I, O, U, A>(
  nextChanel: Lazy<Channel<R, E, L, I, O, U, A>>,
  leftover: L1
): Channel<R, E, L | L1, I, O, U, A> {
  return new Leftover<R, E, L | L1, I, O, U, A>(nextChanel, leftover)
}

/**
 * Wait for a single input value from upstream.
 */
export function awaitOption<I>(): Channel<
  unknown,
  never,
  never,
  I,
  never,
  unknown,
  O.Option<I>
> {
  return needInput(
    (i: I) => done(O.some(i)),
    () => done(O.none)
  )
}

/**
 * This is similar to `awaitOption`, but will return the upstream result value as
 * Left if available
 */
export function awaitEither<U, I>(): Channel<
  unknown,
  never,
  never,
  I,
  never,
  U,
  E.Either<U, I>
> {
  return needInput(
    (i: I) => done(E.right(i)),
    (u: U) => done(E.leftW(u))
  )
}

/**
 * Wait for input forever, calling the given inner `Channel` for each piece of
 * new input. Returns the upstream result type.
 */
export function awaitForever<R, E, L, I, I1, O, A, A1>(
  inner: (i: I1) => Channel<R, E, L, I, O, A, A1>,
  __trace?: string
): Channel<R, E, L, I & I1, O, A, A> {
  const go: Channel<R, E, L, I & I1, O, A, A> = chain_(
    awaitEither<A, I & I1>(),
    E.fold(
      (x) => done(x),
      (x) => chain_(inner(x), () => go)
    ),
    __trace
  )
  return go
}

/**
 * Empty channel with unit result
 */
export const unit: Channel<
  unknown,
  never,
  never,
  unknown,
  never,
  unknown,
  void
> = done<void>(void 0)

/**
 * Monadic chain
 */
export function chain_<R, E, L, I, O, U, A, R1, E1, L1, I1, O1, U1, A1>(
  self: Channel<R, E, L, I, O, U, A>,
  f: (a: A) => Channel<R1, E1, L1, I1, O1, U1, A1>,
  __trace?: string
): Channel<R & R1, E | E1, L | L1, I & I1, O | O1, U & U1, A1> {
  concrete(self)
  return tryOrDie(() => {
    switch (self._typeId) {
      case WithTracerTypeId: {
        return new WithTracer((tracer) => chain_(self.nextChannel(tracer), f))
      }
      case DoneTypeId: {
        const x = f(self.result)
        return new WithTracer((tracer) => {
          tracer(__trace)
          return x
        })
      }
      case ChannelMTypeId: {
        return new ChannelM(M.map_(self.nextChannel, (a) => chain_(a, f, __trace)))
      }
      case LeftoverTypeId: {
        return new Leftover(() => chain_(self.nextChannel(), f, __trace), self.leftover)
      }
      case HaveOutputTypeId: {
        return new HaveOutput(() => chain_(self.nextChannel(), f, __trace), self.output)
      }
      case NeedInputTypeId: {
        return new NeedInput(
          (i) => chain_(self.nextChannel(i), f, __trace),
          (u) => chain_(self.fromUpstream(u), f, __trace)
        )
      }
    }
  }, __trace)
}

/**
 * Monadic chain
 *
 * `dataFirst chain_
 */
export function chain<A, R1, E1, L1, I1, O1, U1, A1>(
  f: (a: A) => Channel<R1, E1, L1, I1, O1, U1, A1>,
  __trace?: string
): <R, E, L, I, O, U>(
  self: Channel<R, E, L, I, O, U, A>
) => Channel<R & R1, E | E1, L | L1, I & I1, O | O1, U & U1, A1> {
  return (self) => chain_(self, f, __trace)
}

/**
 * Map the channel output
 */
export function map_<R, E, L, I, O, U, A, B>(
  self: Channel<R, E, L, I, O, U, A>,
  f: (a: A) => B
): Channel<R, E, L, I, O, U, B> {
  return chain_(self, (a) => done(f(a)))
}

/**
 * Map the channel output
 *
 * `dataFirst map_
 */
export function map<A, B>(
  f: (a: A) => B
): <R, E, L, I, O, U>(
  self: Channel<R, E, L, I, O, U, A>
) => Channel<R, E, L, I, O, U, B> {
  return (self) => map_(self, f)
}

/**
 *  Run a pipeline until processing completes.
 */
export function runChannel<R, E, A>(
  self: Channel<R, E, never, unknown, unknown, void, A>,
  tracer: (trace?: string) => void
): M.Managed<R, E, A> {
  try {
    // eslint-disable-next-line no-constant-condition
    while (1) {
      concrete(self)
      switch (self._typeId) {
        case DoneTypeId: {
          return M.succeed(self.result)
        }
        case HaveOutputTypeId: {
          throw new Error(`channels in run should not contain outputs: ${self.output}`)
        }
        case ChannelMTypeId: {
          return M.chain_(self.nextChannel, (x) => runChannel(x, tracer))
        }
        case LeftoverTypeId: {
          throw new Error(
            `channels in run should not contain leftovers: ${self.leftover}`
          )
        }
        case NeedInputTypeId: {
          self = self.fromUpstream()
          break
        }
        case WithTracerTypeId: {
          self = self.nextChannel(tracer)
          break
        }
      }
    }
    throw new Error("Bug")
  } catch (e) {
    return M.die(e)
  }
}

function injectLeftoversGo<R, E, I, O, U, A>(
  ls: L.List<I>,
  self: Channel<R, E, I, I, O, U, A>
): Channel<R, E, never, I, O, U, A> {
  return tryOrDie(() => {
    // eslint-disable-next-line no-constant-condition
    while (1) {
      const k = self
      concrete(k)
      switch (k._typeId) {
        case WithTracerTypeId: {
          return new WithTracer((tracer) =>
            injectLeftoversGo(ls, k.nextChannel(tracer))
          )
        }
        case DoneTypeId: {
          return new Done(k.result)
        }
        case LeftoverTypeId: {
          ls = L.prepend_(ls, k.leftover)
          break
        }
        case ChannelMTypeId: {
          return new ChannelM(M.map_(k.nextChannel, (p) => injectLeftoversGo(ls, p)))
        }
        case HaveOutputTypeId: {
          return new HaveOutput(() => injectLeftoversGo(ls, k.nextChannel()), k.output)
        }
        case NeedInputTypeId: {
          if (L.isEmpty(ls)) {
            return new NeedInput(
              (i) => injectLeftoversGo(L.empty(), k.nextChannel(i)),
              (u) => injectLeftoversGo(L.empty(), k.fromUpstream(u))
            )
          } else {
            self = k.nextChannel(L.unsafeFirst(ls)!)
            ls = L.tail(ls)
          }
          break
        }
      }
    }
    throw new Error("Bug")
  })
}

/**
 * Transforms a `Channel` that provides leftovers to one which does not,
 * allowing it to be composed.
 *
 * This function will provide any leftover values within this `Channel` to any
 * calls to `await`. If there are more leftover values than are demanded, the
 * remainder are discarded.
 */
export function injectLeftovers<R, E, I, O, U, A>(
  self: Channel<R, E, I, I, O, U, A>
): Channel<R, E, never, I, O, U, A> {
  return injectLeftoversGo(L.empty(), self)
}

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export function write<O>(
  o: O
): Channel<unknown, never, never, unknown, O, unknown, void> {
  return haveOutput(() => unit, o)
}

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export function writeEffect<R, E, O>(
  o: T.Effect<R, E, O>
): Channel<R, E, never, unknown, O, unknown, void> {
  return effect(T.map_(o, write))
}

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export function writeManaged<R, E, O>(
  o: M.Managed<R, E, O>
): Channel<R, E, never, unknown, O, unknown, void> {
  return managed(M.map_(o, write))
}

function writeIterateGo<O>(
  x: O,
  f: (x: O) => O,
  tracer: (__trace?: string | undefined) => void,
  __trace?: string
): Channel<unknown, never, never, unknown, O, unknown, void> {
  return haveOutput(
    () =>
      tryOrDie(() => {
        const y = f(x)
        tracer(__trace)
        return writeIterateGo(y, f, tracer, __trace)
      }),
    x
  )
}

/**
 * Produces an infinite stream of repeated applications of f to x.
 */
export function writeIterate<O>(
  x: O,
  f: (x: O) => O,
  __trace?: string
): Channel<unknown, never, never, unknown, O, unknown, void> {
  return new WithTracer((tracer) => writeIterateGo(x, f, tracer, __trace))
}

function writeIterateMGo<R, E, O>(
  x: O,
  f: (x: O) => T.Effect<R, E, O>
): Channel<R, E, never, unknown, O, unknown, void> {
  return haveOutput(
    () => new ChannelM(M.fromEffect(T.map_(f(x), (y) => writeIterateMGo(y, f)))),
    x
  )
}

/**
 * Produces an infinite stream of repeated applications of f to x.
 */
export function writeIterateM<R, E, O>(
  x: O,
  f: (x: O) => T.Effect<R, E, O>
): Channel<R, E, never, unknown, O, unknown, void> {
  return writeIterateMGo(x, f)
}

function writeIterableGo<O>(
  iterator: Iterator<O, any, undefined>,
  next: IteratorResult<O, any>
): Channel<unknown, never, never, unknown, O, unknown, void> {
  if (next.done) {
    return unit
  } else {
    return haveOutput(() => writeIterableGo(iterator, iterator.next()), next.value)
  }
}

/**
 * Converts an iterable into a stream (lazy)
 */
export function writeIterable<O>(
  it: Iterable<O>
): Channel<unknown, never, never, unknown, O, unknown, void> {
  return channelM(
    M.effectTotal(() => {
      const iterator = it[Symbol.iterator]()
      return writeIterableGo(iterator, iterator.next())
    })
  )
}

/**
 * Send a bunch of values downstream to the next component to consume. If the
 * downstream component terminates, this call will never return control.
 */
export function writeMany<O>(
  ...os: Array<O>
): Channel<unknown, never, never, unknown, O, unknown, void> {
  return writeIterable(os)
}

type CombineGo<R, E, L, I, O, U, A, O2, A1> = E.Either<
  {
    rp: (i: O) => Channel<R, E, O, O, O2, A, A1>
    rc: (u: A) => Channel<R, E, O, O, O2, A, A1>
    left: Channel<R, E, L, I, O, U, A>
  },
  { left: Channel<R, E, L, I, O, U, A>; right: Channel<R, E, O, O, O2, A, A1> }
>

function combineGo<R, E, L, I, O, U, A, O2, A1>(
  input: CombineGo<R, E, L, I, O, U, A, O2, A1>
): Channel<R, E, L, I, O2, U, A1> {
  return tryOrDie(() => {
    // eslint-disable-next-line no-constant-condition
    while (1) {
      switch (input._tag) {
        case "Left": {
          const rp = input.left.rp
          const rc = input.left.rc
          const left = input.left.left
          concrete(left)
          switch (left._typeId) {
            case WithTracerTypeId: {
              return new WithTracer((tracer) =>
                combineGo(E.left({ rp, rc, left: left.nextChannel(tracer) }))
              )
            }
            case DoneTypeId: {
              input = E.right({
                left: new Done(left.result),
                right: rc(left.result)
              })
              break
            }
            case ChannelMTypeId: {
              return new ChannelM(
                M.map_(left.nextChannel, (p) => combineGo(E.left({ rp, rc, left: p })))
              )
            }
            case LeftoverTypeId: {
              return new Leftover(
                () => combineGo(E.left({ rp, rc, left: left.nextChannel() })),
                left.leftover
              )
            }
            case HaveOutputTypeId: {
              input = E.right({ left: left.nextChannel(), right: rp(left.output) })
              break
            }
            case NeedInputTypeId: {
              return new NeedInput(
                (i) => combineGo(E.left({ rp, rc, left: left.nextChannel(i) })),
                (u) => combineGo(E.left({ rp, rc, left: left.fromUpstream(u) }))
              )
            }
          }
          break
        }
        case "Right": {
          const right = input.right.right
          const left = input.right.left
          concrete(right)
          switch (right._typeId) {
            case WithTracerTypeId: {
              return new WithTracer((tracer) =>
                combineGo(E.right({ left, right: right.nextChannel(tracer) }))
              )
            }
            case DoneTypeId: {
              return new Done(right.result)
            }
            case ChannelMTypeId: {
              return new ChannelM(
                M.map_(right.nextChannel, (right) =>
                  combineGo(E.right({ left, right }))
                )
              )
            }
            case LeftoverTypeId: {
              input = E.right({
                left: new HaveOutput(() => left, right.leftover),
                right: right.nextChannel()
              })
              break
            }
            case HaveOutputTypeId: {
              return new HaveOutput(
                () => combineGo(E.right({ left, right: right.nextChannel() })),
                right.output
              )
            }
            case NeedInputTypeId: {
              input = E.left({ rp: right.nextChannel, rc: right.fromUpstream, left })
              break
            }
          }
          break
        }
      }
    }
    throw new Error("Bug")
  })
}

/**
 * Combine two `Channel`s together into a new `Channel` (aka 'fuse').
 *
 * Output from the upstream (left) conduit will be fed into the
 * downstream (right) conduit. Processing will terminate when
 * downstream (right) returns.
 * Leftover data returned from the right `Channel` will be discarded.
 */
export function combine_<R, E, L, I, O, U, A, R1, E1, O2, A1>(
  left: Channel<R, E, L, I, O, U, A>,
  right: Channel<R1, E1, O, O, O2, A, A1>
): Channel<R & R1, E | E1, L, I, O2, U, A1> {
  return combineGo<R & R1, E | E1, L, I, O, U, A, O2, A1>(E.right({ left, right }))
}

/**
 * Combine two `Channel`s together into a new `Channel` (aka 'fuse').
 *
 * Output from the upstream (left) conduit will be fed into the
 * downstream (right) conduit. Processing will terminate when
 * downstream (right) returns.
 * Leftover data returned from the right `Channel` will be discarded.
 *
 * @dataFirst combine_
 */
export function combine<O, A, R1, E1, O2, A1>(
  right: Channel<R1, E1, O, O, O2, A, A1>
): <R, E, L, I, U>(
  left: Channel<R, E, L, I, O, U, A>
) => Channel<R & R1, E | E1, L, I, O2, U, A1> {
  return (left) => combine_(left, right)
}

/**
 * Ensure that the inner sink consumes no more than the given number of
 * values.
 */
export function take<A>(n: number): Channel<unknown, never, never, A, A, void, void> {
  if (n <= 0) {
    return unit
  }
  return needInput(
    (i: A) => haveOutput(() => take<A>(n - 1), i),
    () => unit
  )
}

/**
 * Run a pipeline until processing completes.
 */
export function run<R, E, A>(self: Channel<R, E, unknown, unknown, void, void, A>) {
  return M.exposeTracer((tracer) => runChannel(injectLeftovers(self), tracer))
}

/**
 * Catch all exceptions thrown by the current component of the pipeline.
 */
export function catchAll_<R, E, L, I, A, U, O, R1, E1, L1, I1, A1, U1, O1>(
  self: Channel<R, E, L, I, A, U, O>,
  f: (e: E) => Channel<R1, E1, L1, I1, A1, U1, O1>
): Channel<R & R1, E1, L | L1, I & I1, A | A1, U & U1, O | O1> {
  concrete(self)
  return tryOrDie(() => {
    switch (self._typeId) {
      case WithTracerTypeId: {
        return new WithTracer((tracer) => catchAll_(self.nextChannel(tracer), f))
      }
      case DoneTypeId: {
        return new Done(self.result)
      }
      case NeedInputTypeId: {
        return new NeedInput(
          (i) => catchAll_(self.nextChannel(i), f),
          (u) => catchAll_(self.fromUpstream(u), f)
        )
      }
      case HaveOutputTypeId: {
        return new HaveOutput(() => catchAll_(self.nextChannel(), f), self.output)
      }
      case LeftoverTypeId: {
        return new Leftover(() => catchAll_(self.nextChannel(), f), self.leftover)
      }
      case ChannelMTypeId: {
        return new ChannelM(
          M.catchAll_(
            M.map_(self.nextChannel, (_) => catchAll_(_, f)),
            (e) => M.succeed(f(e))
          )
        )
      }
    }
  })
}

/**
 * Catch all exceptions thrown by the current component of the pipeline.
 *
 * @dataFirst catchAll_
 */
export function catchAll<E, R1, E1, L1, I1, A1, U1, O1>(
  f: (e: E) => Channel<R1, E1, L1, I1, A1, U1, O1>
): <R, L, I, A, U, O>(
  self: Channel<R, E, L, I, A, U, O>
) => Channel<R & R1, E1, L | L1, I & I1, A | A1, U & U1, O | O1> {
  return (self) => catchAll_(self, f)
}
