import * as T from "../Effect"
import { identity, tuple } from "../Function"
import * as NA from "../NonEmptyArray"
import * as O from "../Option"
import * as L from "../Persistent/List"
import * as Pipe from "./pipe"

/**
 * Core datatype of the conduit package. This type represents a general
 * component which can consume a stream of input values `I`, produce a stream
 * of output values `O`, perform actions, and produce a final result `R`.
 * The type synonyms provided here are simply wrappers around this type.
 */
export type Conduit<I, O, A> = <B>(
  unConduit: (a: A) => Pipe.Pipe<I, I, O, void, B>
) => Pipe.Pipe<I, I, O, void, B>

/**
 * Sealed variant
 */
export type SealedConduit<I, O, A> = Pipe.Pipe<I, I, O, void, A>

/**
 * Sealed => Unsealed
 */
export function unseal<I, O, A>(sealed: SealedConduit<I, O, A>): Conduit<I, O, A> {
  return (f) => Pipe.chain_(sealed, f)
}

/**
 * Unsealed => Sealed
 */
export function seal<I, O, A>(sealed: Conduit<I, O, A>): SealedConduit<I, O, A> {
  return sealed((a) => new Pipe.Done(a))
}

/**
 * Provides a stream of output values, without consuming any input or
 * producing a final result.
 */
export type Source<O> = Conduit<void, O, void>

/**
 * Consumes a stream of input values and produces a final result, without
 * producing any output.
 */
export type Sink<I, A> = Conduit<I, void, A>

function connectResumeGoRight<O, A>(
  left: Source<O>,
  right: Pipe.Pipe<O, O, void, void, A>
): T.UIO<readonly [Source<O>, A]> {
  switch (right._typeId) {
    case Pipe.HaveOutputTypeId: {
      throw new Error(`Sink should not produce outputs: ${right.output}`)
    }
    case Pipe.DoneTypeId: {
      return T.succeed(tuple(left, right.result))
    }
    case Pipe.LeftoverTypeId: {
      return T.suspend(() =>
        connectResumeGoRight(
          unseal(new Pipe.HaveOutput(seal(left), right.leftover)),
          right.pipe
        )
      )
    }
    case Pipe.NeedInputTypeId: {
      return T.suspend(() =>
        connectResumeGoLeft(right.newPipe, right.fromUpstream, seal(left))
      )
    }
    case Pipe.PipeMTypeId: {
      return T.chain_(right.nextPipe, (p) => connectResumeGoRight(left, p))
    }
  }
}

function connectResumeGoLeft<O, A>(
  rp: (i: O) => Pipe.Pipe<O, O, void, void, A>,
  rc: (u: void) => Pipe.Pipe<O, O, void, void, A>,
  left: Pipe.Pipe<void, void, O, void, void>
): T.UIO<readonly [Source<O>, A]> {
  switch (left._typeId) {
    case Pipe.DoneTypeId: {
      return T.suspend(() =>
        connectResumeGoRight(unseal(new Pipe.Done(left.result)), rc(left.result))
      )
    }
    case Pipe.HaveOutputTypeId: {
      return T.suspend(() =>
        connectResumeGoRight(unseal(left.nextPipe), rp(left.output))
      )
    }
    case Pipe.PipeMTypeId: {
      return T.chain_(left.nextPipe, (l) => connectResumeGoLeft(rp, rc, l))
    }
    case Pipe.LeftoverTypeId: {
      return T.suspend(() => connectResumeGoLeft(rp, rc, left.pipe))
    }
    case Pipe.NeedInputTypeId: {
      return T.suspend(() => connectResumeGoLeft(rp, rc, left.fromUpstream()))
    }
  }
}

/**
 * Connect a `Source` to a `Sink` until the latter closes. Returns both the
 * most recent state of the `Source` and the result of the `Sink`.
 */
export function connectResume<O, A>(
  source: Source<O>,
  sink: Sink<O, A>
): T.UIO<readonly [Source<O>, A]> {
  return connectResumeGoRight(source, seal(sink))
}

/**
 * Run a pipeline until processing completes.
 */
export function runConduit<A>(self: Conduit<void, void, A>) {
  return Pipe.runPipe(Pipe.injectLeftovers(seal(self)))
}

/**
 * Send a value downstream to the next component to consume. If the
 * downstream component terminates, this call will never return control.
 */
export function yieldOne<O>(o: O): Source<O> {
  return (rest) => new Pipe.HaveOutput(rest(), o)
}

/**
 * Send a bunch of values downstream to the next component to consume. If the
 * downstream component terminates, this call will never return control.
 */
export function yieldMany<O>(...os: NA.NonEmptyArray<O>): Source<O> {
  let x = yieldOne(NA.head(os))
  for (const y of NA.tail(os)) {
    x = chain_(x, () => yieldOne(y))
  }
  return x
}

/**
 * Wait for a single input value from upstream. If no data is available,
 * returns `Nothing`. Once `await` returns `Nothing`, subsequent calls will
 * also return `Nothing`
 */
export function awaitValue<I>(): Sink<I, O.Option<I>> {
  return (f) =>
    new Pipe.NeedInput(
      (i) => f(O.some(i)),
      () => f(O.none)
    )
}

/**
 * Monadic chain
 */
export function chain_<I, O, A, B>(
  self: Conduit<I, O, A>,
  f: (a: A) => Conduit<I, O, B>
): Conduit<I, O, B> {
  return (h) => self((a) => f(a)((b) => h(b)))
}

/**
 * Monadic chain
 */
export function chain<I, O, A, B>(
  f: (a: A) => Conduit<I, O, B>
): (self: Conduit<I, O, A>) => Conduit<I, O, B> {
  return (self) => chain_(self, f)
}

function consumeToListGo<A>(front: (_: L.List<A>) => L.List<A>): Sink<A, L.List<A>> {
  return chain_(awaitValue<A>(), (o) =>
    o._tag === "None"
      ? unseal(new Pipe.Done(front(L.empty())))
      : consumeToListGo((ls) => front(L.prepend_(ls, o.value)))
  )
}

/**
 * Sink that consumes the Conduit to a List
 */
export function consumeToList<A>(): Sink<A, L.List<A>> {
  return consumeToListGo(identity)
}

function fuseGoRight<I, C, A, O, B>(
  rest: (a: A) => Pipe.Pipe<I, I, C, void, B>,
  left: SealedConduit<I, O, void>,
  right: SealedConduit<O, C, A>
): SealedConduit<I, C, B> {
  switch (right._typeId) {
    case Pipe.DoneTypeId: {
      return rest(right.result)
    }
    case Pipe.PipeMTypeId: {
      return new Pipe.PipeM(T.map_(right.nextPipe, (p) => fuseGoRight(rest, left, p)))
    }
    case Pipe.LeftoverTypeId: {
      return new Pipe.PipeM(
        T.effectTotal(() =>
          fuseGoRight(rest, new Pipe.HaveOutput(left, right.leftover), right.pipe)
        )
      )
    }
    case Pipe.HaveOutputTypeId: {
      return new Pipe.PipeM(
        T.effectTotal(
          () =>
            new Pipe.HaveOutput(fuseGoRight(rest, left, right.nextPipe), right.output)
        )
      )
    }
    case Pipe.NeedInputTypeId: {
      return new Pipe.PipeM(
        T.effectTotal(() => fuseGoLeft(rest, right.newPipe, right.fromUpstream, left))
      )
    }
  }
}

function fuseGoLeft<I, C, A, O, B>(
  rest: (a: A) => Pipe.Pipe<I, I, C, void, B>,
  rp: (i: O) => Pipe.Pipe<O, O, C, void, A>,
  rc: (u: void) => Pipe.Pipe<O, O, C, void, A>,
  left: SealedConduit<I, O, void>
): SealedConduit<I, C, B> {
  switch (left._typeId) {
    case Pipe.DoneTypeId: {
      return new Pipe.PipeM(
        T.effectTotal(() =>
          fuseGoRight(rest, new Pipe.Done(left.result), rc(left.result))
        )
      )
    }
    case Pipe.PipeMTypeId: {
      return new Pipe.PipeM(T.map_(left.nextPipe, (p) => fuseGoLeft(rest, rp, rc, p)))
    }
    case Pipe.LeftoverTypeId: {
      return new Pipe.Leftover(
        new Pipe.PipeM(T.effectTotal(() => fuseGoLeft(rest, rp, rc, left.pipe))),
        left.leftover
      )
    }
    case Pipe.HaveOutputTypeId: {
      return new Pipe.PipeM(
        T.effectTotal(() => fuseGoRight(rest, left.nextPipe, rp(left.output)))
      )
    }
    case Pipe.NeedInputTypeId: {
      return new Pipe.NeedInput(
        (i) => fuseGoLeft(rest, rp, rc, left.newPipe(i)),
        (u) => fuseGoLeft(rest, rp, rc, left.fromUpstream(u))
      )
    }
  }
}

/*
 * Combine two `Conduit`s together into a new `Conduit` (aka 'fuse').
 *
 * Output from the upstream (left) conduit will be fed into the
 * downstream (right) conduit. Processing will terminate when
 * downstream (right) returns.
 * Leftover data returned from the right `Conduit` will be discarded.
 */
export function fuse_<I, O, C, A>(
  self: Conduit<I, O, void>,
  that: Conduit<O, C, A>
): Conduit<I, C, A> {
  return (rest) => fuseGoRight(rest, seal(self), seal(that))
}

/*
 * Combine two `Conduit`s together into a new `Conduit` (aka 'fuse').
 *
 * Output from the upstream (left) conduit will be fed into the
 * downstream (right) conduit. Processing will terminate when
 * downstream (right) returns.
 * Leftover data returned from the right `Conduit` will be discarded.
 */
export function fuse<O, C, A>(
  that: Conduit<O, C, A>
): <I>(self: Conduit<I, O, void>) => Conduit<I, C, A> {
  return (self) => fuse_(self, that)
}
