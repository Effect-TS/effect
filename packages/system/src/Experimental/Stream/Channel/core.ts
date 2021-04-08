// tracing: off

import "../../../Operator"

import type * as C from "../../../Cause"
import * as L from "../../../Collections/Immutable/List"
import * as T from "../../../Effect"
import { _A, _C, _E, _I, _L, _O, _R, _U } from "../../../Effect"
import * as E from "../../../Either"
import type { Lazy } from "../../../Function"
import * as M from "../../../Managed"
import * as O from "../../../Option"
import { accessCallTrace } from "../../../Tracing"

export type Tracer = (trace?: string) => void

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
 * with no leftovers would use `never` here, and one with leftovers would use
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
    | Suspend<R, E, L, I, O, U, A>
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
 * `optimize remove
 */
export function concrete<R, E, L, I, O, U, A>(
  _: Channel<R, E, L, I, O, U, A>
): asserts _ is typeof _[typeof _C] {
  //
}

/**
 * Channel Type Tags
 */
export const HaveOutputTypeId = Symbol()
export const NeedInputTypeId = Symbol()
export const DoneTypeId = Symbol()
export const ChannelMTypeId = Symbol()
export const LeftoverTypeId = Symbol()
export const SuspendTypeId = Symbol()

/**
 * Provide new output to be sent downstream. This constructor has two
 * fields: the next `Channel` to be used and the output value.
 */
export class Suspend<R, E, L, I, O, U, A> extends Channel<R, E, L, I, O, U, A> {
  readonly _typeId: typeof SuspendTypeId = SuspendTypeId
  constructor(
    private _nextChannel: (
      tracer: (__trace?: string) => void
    ) => Channel<R, E, L, I, O, U, A>,
    private __trace?: string
  ) {
    super()
    this._nextChannel = this._nextChannel.bind(this)
  }

  nextChannel(tracer: (__trace?: string) => void): Channel<R, E, L, I, O, U, A> {
    tracer(this.__trace)
    try {
      return this._nextChannel(tracer)
    } catch (e) {
      return die(e)
    }
  }
}

/**
 * Provide new output to be sent downstream. This constructor has two
 * fields: the next `Channel` to be used and the output value.
 */
export class HaveOutput<R, E, L, I, O, U, A> extends Channel<R, E, L, I, O, U, A> {
  readonly _typeId: typeof HaveOutputTypeId = HaveOutputTypeId
  constructor(
    private _nextChannel: (_: Tracer) => Channel<R, E, L, I, O, U, A>,
    readonly output: O,
    private __trace?: string
  ) {
    super()
    this.nextChannel = this.nextChannel.bind(this)
  }

  nextChannel(tracer: Tracer): Channel<R, E, L, I, O, U, A> {
    tracer(this.__trace)
    try {
      return this._nextChannel(tracer)
    } catch (e) {
      return die(e)
    }
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
    private _nextChannel: (i: I, _: Tracer) => Channel<R, E, L, I, O, U, A>,
    private _fromUpstream: (u: U, _: Tracer) => Channel<R, E, L, I, O, U, A>,
    private __trace?: string
  ) {
    super()
    this.nextChannel = this.nextChannel.bind(this)
    this.fromUpstream = this.fromUpstream.bind(this)
  }

  nextChannel(i: I, tracer: Tracer): Channel<R, E, L, I, O, U, A> {
    tracer(this.__trace)
    try {
      return this._nextChannel(i, tracer)
    } catch (e) {
      return die(e)
    }
  }

  fromUpstream(u: U, tracer: Tracer): Channel<R, E, L, I, O, U, A> {
    tracer(this.__trace)
    try {
      return this._fromUpstream(u, tracer)
    } catch (e) {
      return die(e)
    }
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
    private _nextChannel: (_: Tracer) => Channel<R, E, L, I, O, U, A>,
    readonly leftover: L,
    private __trace?: string
  ) {
    super()
    this.nextChannel = this.nextChannel.bind(this)
  }

  nextChannel(tracer: Tracer): Channel<R, E, L, I, O, U, A> {
    tracer(this.__trace)
    try {
      return this._nextChannel(tracer)
    } catch (e) {
      return die(e)
    }
  }
}

/**
 * Suspend creation of channel via ChannelM & effectTotal
 */
export function suspend<R, E, L, I, O, U, A>(
  f: (tracer: Tracer) => Channel<R, E, L, I, O, U, A>,
  __trace?: string
): Channel<R, E, L, I, O, U, A> {
  return new Suspend(f, __trace)
}

/**
 * Dies with an unknown exception u
 */
export function die(
  e: unknown,
  __trace?: string
): Channel<unknown, never, never, unknown, never, unknown, never> {
  return new ChannelM(M.die(e, __trace))
}

/**
 * Dies with an unknown exception u
 */
export function dieL(
  e: () => unknown,
  __trace?: string
): Channel<unknown, never, never, unknown, never, unknown, never> {
  return new ChannelM(M.dieWith(e, __trace))
}

/**
 * Fails with a checked error E
 */
export function fail<E>(
  e: E,
  __trace?: string
): Channel<unknown, E, never, unknown, never, unknown, never> {
  return new ChannelM(M.fail(e, __trace))
}

/**
 * Fails with a checked error E
 */
export function failL<E>(
  e: () => E,
  __trace?: string
): Channel<unknown, E, never, unknown, never, unknown, never> {
  return new ChannelM(M.failWith(e, __trace))
}

/**
 * Fails with a specified error cause
 */
export function halt<E>(
  e: C.Cause<E>,
  __trace?: string
): Channel<unknown, E, never, unknown, never, unknown, never> {
  return new ChannelM(M.halt(e, __trace))
}

/**
 * Fails with a specified error cause
 */
export function haltL<E>(
  e: () => C.Cause<E>,
  __trace?: string
): Channel<unknown, E, never, unknown, never, unknown, never> {
  return new ChannelM(M.haltWith(e, __trace))
}

/**
 * Processing with this `Channel` is complete, providing the final result.
 */
export function succeed<A>(
  a: A
): Channel<unknown, never, never, unknown, never, unknown, A> {
  return new Done(a)
}

/**
 * Processing with this `Channel` is complete, providing the final result.
 */
export function succeedL<A>(
  a: () => A,
  __trace?: string
): Channel<unknown, never, never, unknown, never, unknown, A> {
  return suspend(() => new Done(a()), __trace)
}

/**
 * Provide new output to be sent downstream. This constructor has two
 * fields: the next `Channel` to be used and the output value.
 */
export function haveOutput<R, E, L, I, O, U, A, O1>(
  nextChannel: Lazy<Channel<R, E, L, I, O, U, A>>,
  output: O1,
  __trace?: string
): Channel<R, E, L, I, O | O1, U, A> {
  return new HaveOutput<R, E, L, I, O | O1, U, A>(nextChannel, output, __trace)
}

/**
 * Request more input from upstream. The first field takes a new input
 * value and provides a new `Channel`. The second takes an upstream result
 * value, which indicates that upstream is producing no more results
 */
export function needInput<R, E, L, I, O, U, A, R1, E1, L1, I1, O1, U1, A1>(
  newChannel: (i: I) => Channel<R, E, L, I, O, U, A>,
  fromUpstream: (u: U) => Channel<R1, E1, L1, I1, O1, U1, A1>,
  __trace?: string
): Channel<R & R1, E | E1, L | L1, I & I1, O | O1, U & U1, A | A1> {
  return new NeedInput<R & R1, E | E1, L | L1, I & I1, O | O1, U & U1, A | A1>(
    newChannel,
    fromUpstream,
    __trace
  )
}

/**
 * Reads the input and return an optional result
 */
export function readInput<I>(
  __trace?: string
): Channel<unknown, never, never, I, never, unknown, O.Option<I>> {
  return needInput(
    (i: I) => succeed(O.some(i)),
    () => succeed(O.none),
    __trace
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
  self: M.Managed<R1, E1, Channel<R, E, L, I, O, U, A>>,
  __trace?: string
): Channel<R & R1, E | E1, L, I, O, U, A> {
  return channelM(
    M.map_(
      M.withEarlyRelease(self),
      ([rel, str]) =>
        chain_(str, (a) => channelM(M.map_(M.fromEffect(rel), () => succeed(a)))),
      __trace
    )
  )
}

/**
 * Require running of a monadic action to get the next `Channel`.
 */
export function effect<R1, E1, R, E, L, I, O, U, A>(
  self: T.Effect<R1, E1, Channel<R, E, L, I, O, U, A>>,
  __trace?: string
): Channel<R & R1, E | E1, L, I, O, U, A> {
  return new ChannelM<R & R1, E | E1, L, I, O, U, A>(M.fromEffect(self, __trace))
}

/**
 * Provide new output to be sent downstream. This constructor has two
 * fields: the next `Channel` to be used and the output value.
 */
export function leftover<R, E, L, L1, I, O, U, A>(
  nextChanel: Lazy<Channel<R, E, L, I, O, U, A>>,
  leftover: L1,
  __trace?: string
): Channel<R, E, L | L1, I, O, U, A> {
  return new Leftover<R, E, L | L1, I, O, U, A>(nextChanel, leftover, __trace)
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
> = succeed(void 0)

/**
 * Monadic chain
 */
export function chain_<R, E, L, I, O, U, A, R1, E1, L1, I1, O1, U1, A1>(
  self: Channel<R, E, L, I, O, U, A>,
  f: (a: A) => Channel<R1, E1, L1, I1, O1, U1, A1>,
  __trace?: string
): Channel<R & R1, E | E1, L | L1, I & I1, O | O1, U & U1, A1> {
  concrete(self)

  switch (self._typeId) {
    case SuspendTypeId: {
      return new Suspend((tracer) => chain_(self.nextChannel(tracer), f))
    }
    case DoneTypeId: {
      return new Suspend<R & R1, E | E1, L | L1, I & I1, O | O1, U & U1, A1>(
        () => f(self.result),
        __trace
      )
    }
    case ChannelMTypeId: {
      return new ChannelM(M.map_(self.nextChannel, (a) => chain_(a, f, __trace)))
    }
    case LeftoverTypeId: {
      return new Leftover((_) => chain_(self.nextChannel(_), f, __trace), self.leftover)
    }
    case HaveOutputTypeId: {
      return new HaveOutput((_) => chain_(self.nextChannel(_), f, __trace), self.output)
    }
    case NeedInputTypeId: {
      return new NeedInput(
        (i, _) => chain_(self.nextChannel(i, _), f, __trace),
        (u, _) => chain_(self.fromUpstream(u, _), f, __trace)
      )
    }
  }
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
  f: (a: A) => B,
  __trace?: string
): Channel<R, E, L, I, O, U, B> {
  return chain_(self, (a) => succeed(f(a)), __trace)
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
export function runChannel(tracer: (trace?: string) => void) {
  return function loop<R, E, A>(
    self: Channel<R, E, never, unknown, unknown, unknown, A>
  ): M.Managed<R, E, A> {
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
          return M.chain_(self.nextChannel, loop)
        }
        case LeftoverTypeId: {
          throw new Error(
            `channels in run should not contain leftovers: ${self.leftover}`
          )
        }
        case NeedInputTypeId: {
          self = self.fromUpstream(undefined, tracer)
          break
        }
        case SuspendTypeId: {
          self = self.nextChannel(tracer)
          break
        }
      }
    }
    throw new Error("Bug")
  }
}

function injectLeftoversGo<R, E, I, O, U, A>(
  ls: L.List<I>,
  self: Channel<R, E, I, I, O, U, A>,
  tracer: Tracer
): Channel<R, E, never, I, O, U, A> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    const k = self
    concrete(k)
    switch (k._typeId) {
      case SuspendTypeId: {
        self = k.nextChannel(tracer)
        break
      }
      case DoneTypeId: {
        return new Done(k.result)
      }
      case LeftoverTypeId: {
        ls = L.prepend_(ls, k.leftover)
        break
      }
      case ChannelMTypeId: {
        return new ChannelM(
          M.map_(k.nextChannel, (p) => injectLeftoversGo(ls, p, tracer))
        )
      }
      case HaveOutputTypeId: {
        return new HaveOutput(
          (_) => injectLeftoversGo(ls, k.nextChannel(_), _),
          k.output
        )
      }
      case NeedInputTypeId: {
        if (L.isEmpty(ls)) {
          return new NeedInput(
            (i, _) => injectLeftoversGo(L.empty(), k.nextChannel(i, _), _),
            (u, _) => injectLeftoversGo(L.empty(), k.fromUpstream(u, _), _)
          )
        } else {
          self = k.nextChannel(L.unsafeFirst(ls)!, tracer)
          ls = L.tail(ls)
        }
        break
      }
    }
  }
  throw new Error("Bug")
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
  self: Channel<R, E, I, I, O, U, A>,
  tracer: Tracer
): Channel<R, E, never, I, O, U, A> {
  return injectLeftoversGo(L.empty(), self, tracer)
}

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export function write<O>(
  o: O,
  __trace?: string
): Channel<unknown, never, never, unknown, O, unknown, unknown> {
  return suspend(() => haveOutput(() => unit, o), __trace)
}

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export function writeL<O>(
  o: () => O,
  __trace?: string
): Channel<unknown, never, never, unknown, O, unknown, unknown> {
  return suspend(() => haveOutput(() => unit, o()), __trace)
}

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export function writeEffect<R, E, O>(
  o: T.Effect<R, E, O>,
  __trace?: string
): Channel<R, E, never, unknown, O, unknown, unknown> {
  return effect(T.map_(o, write, __trace))
}

/**
 * Send a single output value downstream. If the downstream `Channel`
 * terminates, this `Channel` will terminate as well.
 */
export function writeManaged<R, E, O>(
  o: M.Managed<R, E, O>,
  __trace?: string
): Channel<R, E, never, unknown, O, unknown, unknown> {
  return managed(M.map_(o, write, __trace))
}

function writeIterateGo<O>(
  x: O,
  f: (x: O) => O,
  __trace?: string
): Channel<unknown, never, never, unknown, O, unknown, unknown> {
  return haveOutput(() => writeIterateGo(f(x), f, __trace), x, __trace)
}

/**
 * Produces an infinite stream of repeated applications of f to x.
 */
export function writeIterate<O>(
  x: O,
  f: (x: O) => O,
  __trace?: string
): Channel<unknown, never, never, unknown, O, unknown, unknown> {
  return writeIterateGo(x, f, __trace)
}

function writeIterateMGo<R, E, O>(
  x: O,
  f: (x: O) => T.Effect<R, E, O>,
  __trace?: string
): Channel<R, E, never, unknown, O, unknown, unknown> {
  return haveOutput(
    () =>
      new ChannelM(M.fromEffect(T.map_(f(x), (y) => writeIterateMGo(y, f, __trace)))),
    x,
    __trace
  )
}

/**
 * Produces an infinite stream of repeated applications of f to x.
 */
export function writeIterateM<R, E, O>(
  x: O,
  f: (x: O) => T.Effect<R, E, O>,
  __trace?: string
): Channel<R, E, never, unknown, O, unknown, unknown> {
  return writeIterateMGo(x, f, __trace)
}

function writeIterableGo<O>(
  iterator: Iterator<O, any, undefined>,
  next: IteratorResult<O, any>,
  __trace?: string
): Channel<unknown, never, never, unknown, O, unknown, unknown> {
  if (next.done) {
    return unit
  } else {
    return haveOutput(
      () => writeIterableGo(iterator, iterator.next()),
      next.value,
      __trace
    )
  }
}

/**
 * Converts an iterable into a stream (lazy)
 */
export function writeIterable<O>(
  it: Iterable<O>,
  __trace?: string
): Channel<unknown, never, never, unknown, O, unknown, unknown> {
  return suspend(() => {
    const iterator = it[Symbol.iterator]()
    return writeIterableGo(iterator, iterator.next(), __trace)
  }, __trace)
}

/**
 * Send a bunch of values downstream to the next component to consume. If the
 * downstream component terminates, this call will never return control.
 *
 * @trace call
 */
export function writeMany<O>(
  ...os: Array<O>
): Channel<unknown, never, never, unknown, O, unknown, unknown> {
  return writeIterable(os, accessCallTrace())
}

type CombineGo<R, E, L, I, O, U, A, O2, A1> = E.Either<
  {
    rp: (i: O, _: Tracer) => Channel<R, E, O, O, O2, A, A1>
    rc: (u: A, _: Tracer) => Channel<R, E, O, O, O2, A, A1>
    left: Channel<R, E, L, I, O, U, A>
  },
  { left: Channel<R, E, L, I, O, U, A>; right: Channel<R, E, O, O, O2, A, A1> }
>

function combineGo<R, E, L, I, O, U, A, O2, A1>(
  input: CombineGo<R, E, L, I, O, U, A, O2, A1>,
  tracer: Tracer
): Channel<R, E, L, I, O2, U, A1> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (input._tag) {
      case "Left": {
        const rp = input.left.rp
        const rc = input.left.rc
        const left = input.left.left
        concrete(left)
        switch (left._typeId) {
          case SuspendTypeId: {
            input = E.left({ rp, rc, left: left.nextChannel(tracer) })
            break
          }
          case DoneTypeId: {
            input = E.right({
              left: new Done(left.result),
              right: rc(left.result, tracer)
            })
            break
          }
          case ChannelMTypeId: {
            return new ChannelM(
              M.map_(left.nextChannel, (p) =>
                combineGo(E.left({ rp, rc, left: p }), tracer)
              )
            )
          }
          case LeftoverTypeId: {
            return new Leftover(
              (_) => combineGo(E.left({ rp, rc, left: left.nextChannel(_) }), _),
              left.leftover
            )
          }
          case HaveOutputTypeId: {
            input = E.right({
              left: left.nextChannel(tracer),
              right: rp(left.output, tracer)
            })
            break
          }
          case NeedInputTypeId: {
            return new NeedInput(
              (i, _) => combineGo(E.left({ rp, rc, left: left.nextChannel(i, _) }), _),
              (u, _) => combineGo(E.left({ rp, rc, left: left.fromUpstream(u, _) }), _)
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
          case SuspendTypeId: {
            input = E.right({ left, right: right.nextChannel(tracer) })
            break
          }
          case DoneTypeId: {
            return new Done(right.result)
          }
          case ChannelMTypeId: {
            return new ChannelM(
              M.map_(right.nextChannel, (right) =>
                combineGo(E.right({ left, right }), tracer)
              )
            )
          }
          case LeftoverTypeId: {
            input = E.right({
              left: new HaveOutput(() => left, right.leftover),
              right: right.nextChannel(tracer)
            })
            break
          }
          case HaveOutputTypeId: {
            return new HaveOutput(
              (_) => combineGo(E.right({ left, right: right.nextChannel(_) }), _),
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
  return suspend((_) =>
    combineGo<R & R1, E | E1, L, I, O, U, A, O2, A1>(E.right({ left, right }), _)
  )
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
 * Run a pipeline until processing completes.
 */
export function run<R, E, A>(
  self: Channel<R, E, unknown, unknown, unknown, unknown, A>
) {
  return M.exposeTracer((tracer) => runChannel(tracer)(injectLeftovers(self, tracer)))
}

/**
 * Catch all exceptions thrown by the current component of the pipeline.
 */
export function catchAll_<R, E, L, I, A, U, O, R1, E1, L1, I1, A1, U1, O1>(
  self: Channel<R, E, L, I, A, U, O>,
  f: (e: E) => Channel<R1, E1, L1, I1, A1, U1, O1>,
  __trace?: string
): Channel<R & R1, E1, L | L1, I & I1, A | A1, U & U1, O | O1> {
  concrete(self)

  switch (self._typeId) {
    case SuspendTypeId: {
      return new Suspend((tracer) => catchAll_(self.nextChannel(tracer), f))
    }
    case DoneTypeId: {
      return new Done(self.result)
    }
    case NeedInputTypeId: {
      return new NeedInput(
        (i, _) => catchAll_(self.nextChannel(i, _), f),
        (u, _) => catchAll_(self.fromUpstream(u, _), f)
      )
    }
    case HaveOutputTypeId: {
      return new HaveOutput((_) => catchAll_(self.nextChannel(_), f), self.output)
    }
    case LeftoverTypeId: {
      return new Leftover((_) => catchAll_(self.nextChannel(_), f), self.leftover)
    }
    case ChannelMTypeId: {
      return new ChannelM(
        M.catchAll_(
          M.map_(self.nextChannel, (_) => catchAll_(_, f)),
          (e) => M.succeed(suspend(() => f(e), __trace))
        )
      )
    }
  }
}

/**
 * Catch all exceptions thrown by the current component of the pipeline.
 *
 * @dataFirst catchAll_
 */
export function catchAll<E, R1, E1, L1, I1, A1, U1, O1>(
  f: (e: E) => Channel<R1, E1, L1, I1, A1, U1, O1>,
  __trace?: string
): <R, L, I, A, U, O>(
  self: Channel<R, E, L, I, A, U, O>
) => Channel<R & R1, E1, L | L1, I & I1, A | A1, U & U1, O | O1> {
  return (self) => catchAll_(self, f, __trace)
}

/**
 * Catch all exceptions thrown by the current component of the pipeline exposing full cause.
 */
export function catchAllCause_<R, E, L, I, A, U, O, R1, E1, L1, I1, A1, U1, O1>(
  self: Channel<R, E, L, I, A, U, O>,
  f: (e: C.Cause<E>) => Channel<R1, E1, L1, I1, A1, U1, O1>,
  __trace?: string
): Channel<R & R1, E1, L | L1, I & I1, A | A1, U & U1, O | O1> {
  concrete(self)

  switch (self._typeId) {
    case SuspendTypeId: {
      return new Suspend((tracer) => catchAllCause_(self.nextChannel(tracer), f))
    }
    case DoneTypeId: {
      return new Done(self.result)
    }
    case NeedInputTypeId: {
      return new NeedInput(
        (i, _) => catchAllCause_(self.nextChannel(i, _), f),
        (u, _) => catchAllCause_(self.fromUpstream(u, _), f)
      )
    }
    case HaveOutputTypeId: {
      return new HaveOutput((_) => catchAllCause_(self.nextChannel(_), f), self.output)
    }
    case LeftoverTypeId: {
      return new Leftover((_) => catchAllCause_(self.nextChannel(_), f), self.leftover)
    }
    case ChannelMTypeId: {
      return new ChannelM(
        M.catchAllCause_(
          M.map_(self.nextChannel, (_) => catchAllCause_(_, f)),
          (e) => M.succeed(suspend(() => f(e), __trace))
        )
      )
    }
  }
}

/**
 * Catch all exceptions thrown by the current component of the pipeline exposing full cause.
 *
 * @dataFirst catchAllCause_
 */
export function catchAllCause<E, R1, E1, L1, I1, A1, U1, O1>(
  f: (e: C.Cause<E>) => Channel<R1, E1, L1, I1, A1, U1, O1>,
  __trace?: string
): <R, L, I, A, U, O>(
  self: Channel<R, E, L, I, A, U, O>
) => Channel<R & R1, E1, L | L1, I & I1, A | A1, U & U1, O | O1> {
  return (self) => catchAllCause_(self, f, __trace)
}
