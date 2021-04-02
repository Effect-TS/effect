// tracing: off

import * as T from "../../Effect"
import * as E from "../../Either"
import type { Lazy } from "../../Function"
import * as M from "../../Managed"
import * as O from "../../Option"
import * as L from "../../Persistent/List"

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
 */
export interface Channel<R, E, L, I, O, U, A> {
  readonly _channelTypeId: typeof ChannelTypeId
  readonly _R: (_R: R) => void
  readonly _E: () => E
  readonly _L: () => L
  readonly _I: (_I: I) => void
  readonly _O: () => O
  readonly _U: (_U: U) => void
  readonly _A: () => A
  readonly _C:
    | HaveOutput<R, E, L, I, O, U, A>
    | NeedInput<R, E, L, I, O, U, A>
    | Done<A>
    | ChannelM<R, E, L, I, O, U, A>
    | Leftover<R, E, L, I, O, U, A>
}

/**
 * `optimize remove
 */
export function concrete<R, E, L, I, O, U, A>(
  _: Channel<R, E, L, I, O, U, A>
): asserts _ is typeof _["_C"] {
  //
}

/**
 * Suspend creation of channel via ChannelM & effectTotal
 */
export function suspend<R, E, L, I, O, U, A>(
  f: () => Channel<R, E, L, I, O, U, A>
): Channel<R, E, L, I, O, U, A> {
  return new ChannelM(M.effectTotal(f))
}

/**
 * Channel Type Tags
 */
export const ChannelTypeId = Symbol()
export const HaveOutputTypeId = Symbol()
export const NeedInputTypeId = Symbol()
export const DoneTypeId = Symbol()
export const ChannelMTypeId = Symbol()
export const LeftoverTypeId = Symbol()

/**
 * Provide new output to be sent downstream. This constructor has two
 * fields: the next `Channel` to be used and the output value.
 */
export class HaveOutput<R, E, L, I, O, U, A> implements Channel<R, E, L, I, O, U, A> {
  readonly _typeId: typeof HaveOutputTypeId = HaveOutputTypeId
  readonly _channelTypeId!: typeof ChannelTypeId
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _L!: () => L
  readonly _I!: (_I: I) => void
  readonly _O!: () => O
  readonly _U!: (_U: U) => void
  readonly _A!: () => A
  readonly _C!:
    | HaveOutput<R, E, L, I, O, U, A>
    | NeedInput<R, E, L, I, O, U, A>
    | Done<A>
    | ChannelM<R, E, L, I, O, U, A>
    | Leftover<R, E, L, I, O, U, A>
  constructor(
    readonly nextChannel: Lazy<Channel<R, E, L, I, O, U, A>>,
    readonly output: O
  ) {}
}

/**
 * Request more input from upstream. The first field takes a new input
 * value and provides a new `Channel`. The second takes an upstream result
 * value, which indicates that upstream is producing no more results
 */
export class NeedInput<R, E, L, I, O, U, A> implements Channel<R, E, L, I, O, U, A> {
  readonly _typeId: typeof NeedInputTypeId = NeedInputTypeId
  readonly _channelTypeId!: typeof ChannelTypeId
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _L!: () => L
  readonly _I!: (_I: I) => void
  readonly _O!: () => O
  readonly _U!: (_U: U) => void
  readonly _A!: () => A
  readonly _C!:
    | HaveOutput<R, E, L, I, O, U, A>
    | NeedInput<R, E, L, I, O, U, A>
    | Done<A>
    | ChannelM<R, E, L, I, O, U, A>
    | Leftover<R, E, L, I, O, U, A>
  constructor(
    readonly nextChannel: (i: I) => Channel<R, E, L, I, O, U, A>,
    readonly fromUpstream: (u: U) => Channel<R, E, L, I, O, U, A>
  ) {}
}

/**
 * Processing with this `Channel` is complete, providing the final result.
 */
export class Done<A>
  implements Channel<unknown, never, never, unknown, never, unknown, A> {
  readonly _typeId: typeof DoneTypeId = DoneTypeId
  readonly _channelTypeId!: typeof ChannelTypeId
  readonly _R!: (_R: unknown) => void
  readonly _E!: () => never
  readonly _L!: () => never
  readonly _I!: (_I: unknown) => void
  readonly _O!: () => never
  readonly _U!: (_U: unknown) => void
  readonly _A!: () => A
  readonly _C!:
    | HaveOutput<unknown, never, never, unknown, never, unknown, A>
    | NeedInput<unknown, never, never, unknown, never, unknown, A>
    | Done<A>
    | ChannelM<unknown, never, never, unknown, never, unknown, A>
    | Leftover<unknown, never, never, unknown, never, unknown, A>
  constructor(readonly result: A) {}
}

/**
 * Require running of a monadic action to get the next `Channel`.
 */
export class ChannelM<R, E, L, I, O, U, A> implements Channel<R, E, L, I, O, U, A> {
  readonly _typeId: typeof ChannelMTypeId = ChannelMTypeId
  readonly _channelTypeId!: typeof ChannelTypeId
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _L!: () => L
  readonly _I!: (_I: I) => void
  readonly _O!: () => O
  readonly _U!: (_U: U) => void
  readonly _A!: () => A
  readonly _C!:
    | HaveOutput<R, E, L, I, O, U, A>
    | NeedInput<R, E, L, I, O, U, A>
    | Done<A>
    | ChannelM<R, E, L, I, O, U, A>
    | Leftover<R, E, L, I, O, U, A>
  constructor(readonly nextChannel: M.Managed<R, E, Channel<R, E, L, I, O, U, A>>) {}
}

/**
 * Provide new output to be sent downstream. This constructor has two
 * fields: the next `Channel` to be used and the output value.
 */
export class Leftover<R, E, L, I, O, U, A> implements Channel<R, E, L, I, O, U, A> {
  readonly _typeId: typeof LeftoverTypeId = LeftoverTypeId
  readonly _channelTypeId!: typeof ChannelTypeId
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _L!: () => L
  readonly _I!: (_I: I) => void
  readonly _O!: () => O
  readonly _U!: (_U: U) => void
  readonly _A!: () => A
  readonly _C!:
    | HaveOutput<R, E, L, I, O, U, A>
    | NeedInput<R, E, L, I, O, U, A>
    | Done<A>
    | ChannelM<R, E, L, I, O, U, A>
    | Leftover<R, E, L, I, O, U, A>
  constructor(
    readonly nextChannel: Lazy<Channel<R, E, L, I, O, U, A>>,
    readonly leftover: L
  ) {}
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
 * Require running of a monadic action to get the next `Channel`.
 */
export function channelM<R1, E1, R, E, L, I, O, U, A>(
  self: M.Managed<R1, E1, Channel<R, E, L, I, O, U, A>>
): Channel<R & R1, E | E1, L, I, O, U, A> {
  return new ChannelM<R & R1, E | E1, L, I, O, U, A>(self)
}

/**
 * Require running of a monadic action to get the next `Channel`.
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
  inner: (i: I1) => Channel<R, E, L, I, O, A, A1>
): Channel<R, E, L, I & I1, O, A, A> {
  const go: Channel<R, E, L, I & I1, O, A, A> = chain_(
    awaitEither<A, I & I1>(),
    E.fold(
      (x) => done(x),
      (x) => chain_(inner(x), () => go)
    )
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
  f: (a: A) => Channel<R1, E1, L1, I1, O1, U1, A1>
): Channel<R & R1, E | E1, L | L1, I & I1, O | O1, U & U1, A1> {
  concrete(self)
  switch (self._typeId) {
    case DoneTypeId: {
      return f(self.result)
    }
    case ChannelMTypeId: {
      return new ChannelM(M.map_(self.nextChannel, (a) => chain_(a, f)))
    }
    case LeftoverTypeId: {
      return new Leftover(() => chain_(self.nextChannel(), f), self.leftover)
    }
    case HaveOutputTypeId: {
      return new HaveOutput(() => chain_(self.nextChannel(), f), self.output)
    }
    case NeedInputTypeId: {
      return new NeedInput(
        (i) => chain_(self.nextChannel(i), f),
        (u) => chain_(self.fromUpstream(u), f)
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
  f: (a: A) => Channel<R1, E1, L1, I1, O1, U1, A1>
): <R, E, L, I, O, U>(
  self: Channel<R, E, L, I, O, U, A>
) => Channel<R & R1, E | E1, L | L1, I & I1, O | O1, U & U1, A1> {
  return (self) => chain_(self, f)
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
  self: Channel<R, E, never, unknown, unknown, void, A>
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
        return M.chain_(self.nextChannel, runChannel)
      }
      case LeftoverTypeId: {
        throw new Error(
          `channels in run should not contain leftovers: ${self.leftover}`
        )
      }
      case NeedInputTypeId: {
        self = self.fromUpstream()
      }
    }
  }
  throw new Error("Bug")
}

function injectLeftoversGo<R, E, I, O, U, A>(
  ls: L.List<I>,
  self: Channel<R, E, I, I, O, U, A>
): Channel<R, E, never, I, O, U, A> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    const k = self
    concrete(k)
    switch (k._typeId) {
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

function writeIterateGo<O>(
  x: O,
  f: (x: O) => O
): Channel<unknown, never, never, unknown, O, unknown, void> {
  return haveOutput(() => writeIterateGo(f(x), f), x)
}

/**
 * Produces an infinite stream of repeated applications of f to x.
 */
export function writeIterate<O>(
  x: O,
  f: (x: O) => O,
  __trace?: string
): Channel<unknown, never, never, unknown, O, unknown, void> {
  return channelM(M.effectTotal(() => writeIterateGo(x, f), __trace))
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
