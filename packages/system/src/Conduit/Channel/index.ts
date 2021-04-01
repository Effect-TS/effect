// tracing: off

import type * as T from "../../Effect"
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
  readonly _I: (_I: I) => void
  readonly _E: () => E
  readonly _A: () => A
  readonly _O: () => O
  readonly _C:
    | HaveOutput<R, E, L, I, O, U, A>
    | NeedInput<R, E, L, I, O, U, A>
    | Done<R, E, L, I, O, U, A>
    | ChannelM<R, E, L, I, O, U, A>
    | Leftover<R, E, L, I, O, U, A>
}

/**
 * ^optimize remove
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
  readonly _I!: (_I: I) => void
  readonly _E!: () => E
  readonly _A!: () => A
  readonly _O!: () => O
  readonly _C!:
    | HaveOutput<R, E, L, I, O, U, A>
    | NeedInput<R, E, L, I, O, U, A>
    | Done<R, E, L, I, O, U, A>
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
  readonly _I!: (_I: I) => void
  readonly _E!: () => E
  readonly _A!: () => A
  readonly _O!: () => O
  readonly _C!:
    | HaveOutput<R, E, L, I, O, U, A>
    | NeedInput<R, E, L, I, O, U, A>
    | Done<R, E, L, I, O, U, A>
    | ChannelM<R, E, L, I, O, U, A>
    | Leftover<R, E, L, I, O, U, A>
  constructor(
    readonly newChannel: (i: I) => Channel<R, E, L, I, O, U, A>,
    readonly fromUpstream: (u: U) => Channel<R, E, L, I, O, U, A>
  ) {}
}

/**
 * Processing with this `Channel` is complete, providing the final result.
 */
export class Done<R, E, L, I, O, U, A> implements Channel<R, E, L, I, O, U, A> {
  readonly _typeId: typeof DoneTypeId = DoneTypeId
  readonly _channelTypeId!: typeof ChannelTypeId
  readonly _R!: (_R: R) => void
  readonly _I!: (_I: I) => void
  readonly _E!: () => E
  readonly _A!: () => A
  readonly _O!: () => O
  readonly _C!:
    | HaveOutput<R, E, L, I, O, U, A>
    | NeedInput<R, E, L, I, O, U, A>
    | Done<R, E, L, I, O, U, A>
    | ChannelM<R, E, L, I, O, U, A>
    | Leftover<R, E, L, I, O, U, A>
  constructor(readonly result: A) {}
}

/**
 * Provide new output to be sent downstream. This constructor has two
 * fields: the next `Channel` to be used and the output value.
 */
export class ChannelM<R, E, L, I, O, U, A> implements Channel<R, E, L, I, O, U, A> {
  readonly _typeId: typeof ChannelMTypeId = ChannelMTypeId
  readonly _channelTypeId!: typeof ChannelTypeId
  readonly _R!: (_R: R) => void
  readonly _I!: (_I: I) => void
  readonly _E!: () => E
  readonly _A!: () => A
  readonly _O!: () => O
  readonly _C!:
    | HaveOutput<R, E, L, I, O, U, A>
    | NeedInput<R, E, L, I, O, U, A>
    | Done<R, E, L, I, O, U, A>
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
  readonly _I!: (_I: I) => void
  readonly _E!: () => E
  readonly _A!: () => A
  readonly _O!: () => O
  readonly _C!:
    | HaveOutput<R, E, L, I, O, U, A>
    | NeedInput<R, E, L, I, O, U, A>
    | Done<R, E, L, I, O, U, A>
    | ChannelM<R, E, L, I, O, U, A>
    | Leftover<R, E, L, I, O, U, A>
  constructor(
    readonly pipe: Lazy<Channel<R, E, L, I, O, U, A>>,
    readonly leftover: L
  ) {}
}

/**
 * Done
 */
export function done<R, E, L, I, O, U, A>(a: A): Channel<R, E, L, I, O, U, A> {
  return new Done(a)
}

/**
 * Wait for a single input value from upstream.
 */
export function awaitOption<R, E, L, I, O, U>(): Channel<
  R,
  E,
  L,
  I,
  O,
  U,
  O.Option<I>
> {
  return new NeedInput(
    (i: I) => new Done(O.some(i)),
    () => new Done(O.none)
  )
}

/**
 * This is similar to `awaitOption`, but will return the upstream result value as
 * Left if available
 */
export function awaitEither<R, E, L, I, O, U>(): Channel<
  R,
  E,
  L,
  I,
  O,
  U,
  E.Either<U, I>
> {
  return new NeedInput(
    (i: I) => new Done(E.right(i)),
    (u: U) => new Done(E.leftW(u))
  )
}

/**
 * Wait for input forever, calling the given inner `Channel` for each piece of
 * new input. Returns the upstream result type.
 */
export function awaitForever<R, E, L, I, O, A, A1>(
  inner: (i: I) => Channel<R, E, L, I, O, A, A1>
): Channel<R, E, L, I, O, A, A> {
  const go: Channel<R, E, L, I, O, A, A> = chain_(
    awaitEither(),
    E.fold(
      (x) => done(x),
      (x) => chain_(inner(x), () => go)
    )
  )
  return go
}

/**
 * Send a single output value downstream. If the downstream ^Channel^
 * terminates, this ^Channel^ will terminate as well.
 */
export function write<R, E, L, I, O, U>(o: O): Channel<R, E, L, I, O, U, void> {
  return new HaveOutput(() => done(void 0), o)
}

/**
 * Send a single output value downstream. If the downstream ^Channel^
 * terminates, this ^Channel^ will terminate as well.
 */
export function writeM<R, E, L, I, O, U>(
  o: T.Effect<R, E, O>
): Channel<R, E, L, I, O, U, void> {
  return new ChannelM(M.map_(M.fromEffect(o), (x) => write(x)))
}

/**
 * Provide a single piece of leftover input to be consumed by the next pipe
 * in the current monadic binding.
 *
 * Note: it is highly encouraged to only return leftover values from input
 * already consumed from upstream.
 */
export function leftover<R, E, L, I, O, U>(l: L): Channel<R, E, L, I, O, U, void> {
  return new Leftover(() => done(void 0), l)
}

/**
 * Empty channel with unit result
 */
export const doneUnit: Channel<unknown, never, never, any, any, void, void> = new Done(
  void 0
)

/**
 * Monadic chain
 */
export function chain_<R, E, R2, E2, L, I, O, O2, U, A, B>(
  self: Channel<R, E, L, I, O, U, A>,
  f: (a: A) => Channel<R2, E2, L, I, O2, U, B>
): Channel<R & R2, E | E2, L, I, O | O2, U, B> {
  concrete(self)
  switch (self._typeId) {
    case DoneTypeId: {
      return f(self.result)
    }
    case ChannelMTypeId: {
      return new ChannelM(M.map_(self.nextChannel, (a) => chain_(a, f)))
    }
    case LeftoverTypeId: {
      return new Leftover(() => chain_(self.pipe(), f), self.leftover)
    }
    case HaveOutputTypeId: {
      return new HaveOutput(() => chain_(self.nextChannel(), f), self.output)
    }
    case NeedInputTypeId: {
      return new NeedInput(
        (i) => chain_(self.newChannel(i), f),
        (u) => chain_(self.fromUpstream(u), f)
      )
    }
  }
}

/**
 * Monadic chain
 *
 * ^dataFirst chain_
 */
export function chain<R2, E2, L, I, O2, U, A, B>(
  f: (a: A) => Channel<R2, E2, L, I, O2, U, B>
): <R, E, O>(
  self: Channel<R, E, L, I, O, U, A>
) => Channel<R & R2, E | E2, L, I, O | O2, U, B> {
  return (self) => chain_(self, f)
}

/**
 * Map the channel output
 */
export function map_<R, E, L, I, O, U, A, B>(
  self: Channel<R, E, L, I, O, U, A>,
  f: (a: A) => B
): Channel<R, E, L, I, O, U, B> {
  concrete(self)
  switch (self._typeId) {
    case DoneTypeId: {
      return new Done(f(self.result))
    }
    case ChannelMTypeId: {
      return new ChannelM(M.map_(self.nextChannel, (a) => map_(a, f)))
    }
    case LeftoverTypeId: {
      return new Leftover(() => map_(self.pipe(), f), self.leftover)
    }
    case HaveOutputTypeId: {
      return new HaveOutput(() => map_(self.nextChannel(), f), self.output)
    }
    case NeedInputTypeId: {
      return new NeedInput(
        (i) => map_(self.newChannel(i), f),
        (u) => map_(self.fromUpstream(u), f)
      )
    }
  }
}

/**
 * Map the channel output
 *
 * ^dataFirst map_
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
  self: Channel<R, E, never, unknown, void, void, A>
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
            (i) => injectLeftoversGo(L.empty(), k.newChannel(i)),
            (u) => injectLeftoversGo(L.empty(), k.fromUpstream(u))
          )
        } else {
          self = k.newChannel(L.unsafeFirst(ls)!)
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
