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
export type Conduit<R, E, I, O, A> = Pipe.Pipe<R, E, I, I, O, void, A>

/**
 * Provides a stream of output values, without consuming any input or
 * producing a final result.
 */
export type Stream<R, E, O> = Conduit<R, E, void, O, void>

/**
 * Consumes a stream of input values and produces a final result, without
 * producing any output.
 */
export type Sink<R, E, I, A> = Conduit<R, E, I, void, A>

/**
 * Wait for a single input value from upstream. If no data is available,
 * returns `Nothing`. Once `await` returns `Nothing`, subsequent calls will
 * also return `Nothing`
 */
export function sinkAwait<I>(): Sink<unknown, never, I, O.Option<I>> {
  return new Pipe.NeedInput(
    (i) => new Pipe.Done(O.some(i)),
    () => new Pipe.Done(O.none)
  )
}

function consumeToListGo<A>(
  front: (_: L.List<A>) => L.List<A>
): Sink<unknown, never, A, L.List<A>> {
  return chain_(sinkAwait<A>(), (o) =>
    o._tag === "None"
      ? new Pipe.Done(front(L.empty()))
      : consumeToListGo((ls) => front(L.prepend_(ls, o.value)))
  )
}

/**
 * Sink that consumes the Conduit to a List
 */
export function sinkList<A>(): Sink<unknown, never, A, L.List<A>> {
  return consumeToListGo(identity)
}

function connectResumeGoRight<R, E, O, A>(
  left: Conduit<R, E, void, O, void>,
  right: Conduit<R, E, O, void, A>
): T.Effect<R, E, readonly [Stream<R, E, O>, A]> {
  switch (right._typeId) {
    case Pipe.HaveOutputTypeId: {
      throw new Error(`Sink should not produce outputs: ${right.output}`)
    }
    case Pipe.DoneTypeId: {
      return T.succeed(tuple(left, right.result))
    }
    case Pipe.LeftoverTypeId: {
      return T.suspend(() =>
        connectResumeGoRight(new Pipe.HaveOutput(left, right.leftover), right.pipe)
      )
    }
    case Pipe.NeedInputTypeId: {
      return T.suspend(() =>
        connectResumeGoLeft(right.newPipe, right.fromUpstream, left)
      )
    }
    case Pipe.PipeMTypeId: {
      return T.chain_(right.nextPipe, (p) => connectResumeGoRight(left, p))
    }
  }
}

function connectResumeGoLeft<R, E, O, A>(
  rp: (i: O) => Conduit<R, E, O, void, A>,
  rc: (u: void) => Conduit<R, E, O, void, A>,
  left: Conduit<R, E, void, O, void>
): T.Effect<R, E, readonly [Stream<R, E, O>, A]> {
  switch (left._typeId) {
    case Pipe.DoneTypeId: {
      return T.suspend(() =>
        connectResumeGoRight(new Pipe.Done(left.result), rc(left.result))
      )
    }
    case Pipe.HaveOutputTypeId: {
      return T.suspend(() => connectResumeGoRight(left.nextPipe, rp(left.output)))
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
 * Connect a `Stream` to a `Sink` until the latter closes. Returns both the
 * most recent state of the `Stream` and the result of the `Sink`.
 */
export function connectResume<R, E, O, A>(
  source: Stream<R, E, O>,
  sink: Sink<R, E, O, A>
): T.Effect<R, E, readonly [Stream<R, E, O>, A]> {
  return connectResumeGoRight(source, sink)
}

/**
 * Run a pipeline until processing completes.
 */
export function run<R, E, A>(self: Conduit<R, E, void, void, A>) {
  return Pipe.runPipe(Pipe.injectLeftovers(self))
}

/**
 * Run a pipeline until processing completes.
 */
export function runCollect<R, E, O>(self: Conduit<R, E, void, O, void>) {
  return run(fuse_(self, sinkList()))
}

/**
 * Send a value downstream to the next component to consume. If the
 * downstream component terminates, this call will never return control.
 */
export function succeed<O>(o: O): Stream<unknown, never, O> {
  return new Pipe.HaveOutput(new Pipe.Done(void 0), o)
}

/**
 * Send a bunch of values downstream to the next component to consume. If the
 * downstream component terminates, this call will never return control.
 */
export function succeedMany<O>(...os: NA.NonEmptyArray<O>): Stream<unknown, never, O> {
  let x = succeed(NA.head(os))
  for (const y of NA.tail(os)) {
    x = chain_(x, () => succeed(y))
  }
  return x
}

/**
 * Monadic chain
 */
export function chain_<R, E, R1, E1, O1, I, O, A, B>(
  self: Conduit<R, E, I, O, A>,
  f: (a: A) => Conduit<R1, E1, I, O1, B>
): Conduit<R & R1, E | E1, I, O | O1, B> {
  return Pipe.chain_(self, f)
}

/**
 * Monadic chain
 */
export function chain<R, E, I, O, A, B>(
  f: (a: A) => Conduit<R, E, I, O, B>
): <R1, E1, O1>(
  self: Conduit<R1, E1, I, O1, A>
) => Conduit<R & R1, E | E1, I, O | O1, B> {
  return (self) => chain_(self, f)
}

/**
 * Functor map
 */
export function map_<R, E, I, O, A, B>(
  self: Conduit<R, E, I, O, A>,
  f: (a: A) => B
): Conduit<R, E, I, O, B> {
  return Pipe.chain_(self, (a) => new Pipe.Done(f(a)))
}

/**
 * Functor map
 */
export function map<A, B>(
  f: (a: A) => B
): <R, E, I, O>(self: Conduit<R, E, I, O, A>) => Conduit<R, E, I, O, B> {
  return (self) => map_(self, f)
}

function fuseGoRight<R, E, R1, E1, I, C, A, O>(
  left: Conduit<R, E, I, O, void>,
  right: Conduit<R1, E1, O, C, A>
): Conduit<R & R1, E | E1, I, C, A> {
  switch (right._typeId) {
    case Pipe.DoneTypeId: {
      return new Pipe.Done(right.result)
    }
    case Pipe.PipeMTypeId: {
      return new Pipe.PipeM(T.map_(right.nextPipe, (p) => fuseGoRight(left, p)))
    }
    case Pipe.LeftoverTypeId: {
      return new Pipe.PipeM(
        T.effectTotal(() =>
          fuseGoRight(new Pipe.HaveOutput(left, right.leftover), right.pipe)
        )
      )
    }
    case Pipe.HaveOutputTypeId: {
      return new Pipe.PipeM(
        T.effectTotal(
          () => new Pipe.HaveOutput(fuseGoRight(left, right.nextPipe), right.output)
        )
      )
    }
    case Pipe.NeedInputTypeId: {
      return new Pipe.PipeM(
        T.effectTotal(() => fuseGoLeft(right.newPipe, right.fromUpstream, left))
      )
    }
  }
}

function fuseGoLeft<R, E, R1, E1, I, C, A, O>(
  rp: (i: O) => Pipe.Pipe<R, E, O, O, C, void, A>,
  rc: (u: void) => Pipe.Pipe<R, E, O, O, C, void, A>,
  left: Conduit<R1, E1, I, O, void>
): Conduit<R & R1, E | E1, I, C, A> {
  switch (left._typeId) {
    case Pipe.DoneTypeId: {
      return new Pipe.PipeM(
        T.effectTotal(() => fuseGoRight(new Pipe.Done(left.result), rc(left.result)))
      )
    }
    case Pipe.PipeMTypeId: {
      return new Pipe.PipeM(T.map_(left.nextPipe, (p) => fuseGoLeft(rp, rc, p)))
    }
    case Pipe.LeftoverTypeId: {
      return new Pipe.Leftover(
        new Pipe.PipeM(T.effectTotal(() => fuseGoLeft(rp, rc, left.pipe))),
        left.leftover
      )
    }
    case Pipe.HaveOutputTypeId: {
      return new Pipe.PipeM(
        T.effectTotal(() => fuseGoRight(left.nextPipe, rp(left.output)))
      )
    }
    case Pipe.NeedInputTypeId: {
      return new Pipe.NeedInput(
        (i) => fuseGoLeft(rp, rc, left.newPipe(i)),
        (u) => fuseGoLeft(rp, rc, left.fromUpstream(u))
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
export function fuse_<R, E, R1, E1, I, O, C, A>(
  self: Conduit<R, E, I, O, void>,
  that: Conduit<R1, E1, O, C, A>
): Conduit<R & R1, E | E1, I, C, A> {
  return fuseGoRight(self, that)
}

/*
 * Combine two `Conduit`s together into a new `Conduit` (aka 'fuse').
 *
 * Output from the upstream (left) conduit will be fed into the
 * downstream (right) conduit. Processing will terminate when
 * downstream (right) returns.
 * Leftover data returned from the right `Conduit` will be discarded.
 */
export function fuse<R, E, O, C, A>(
  that: Conduit<R, E, O, C, A>
): <R1, E1, I>(self: Conduit<R1, E1, I, O, void>) => Conduit<R & R1, E | E1, I, C, A> {
  return (self) => fuse_(self, that)
}
