import * as T from "../../Effect"
import { identity } from "../../Function"
import * as L from "../../Persistent/List"
import * as Pipe from "../Pipe"

/**
 * Core datatype of the conduit package. This type represents a general
 * component which can consume a stream of input values `I`, produce a stream
 * of output values `O`, perform actions, and produce a final result `R`.
 * The type synonyms provided here are simply wrappers around this type.
 */
export type Conduit<R, E, I, O, A> = Pipe.Pipe<R, E, I, I, O, void, A>

/**
 * Consumes a stream of input values and produces a final result, without
 * producing any output.
 */
export type Sink<R, E, I, A> = Conduit<R, E, I, never, A>

function sinkListGo<A>(
  front: (_: L.List<A>) => L.List<A>
): Sink<unknown, never, A, L.List<A>> {
  return new Pipe.NeedInput(
    (i) => sinkListGo((ls) => front(L.prepend_(ls, i))),
    () => new Pipe.Done(front(L.empty()))
  )
}

/**
 * Sink that consumes the Conduit to a List
 */
export function sinkList<A>(): Sink<unknown, never, A, L.List<A>> {
  return sinkListGo(identity)
}

function isolateGo<A>(n: number): Conduit<unknown, never, A, A, void> {
  if (n <= 0) {
    return new Pipe.Done(void 0)
  }
  return new Pipe.NeedInput(
    (i) => new Pipe.HaveOutput(isolateGo(n - 1), i),
    () => new Pipe.Done(void 0)
  )
}

/**
 * Ensure that the inner sink consumes no more than the given number of
 * values.
 */
export function isolate<A>(n: number): Conduit<unknown, never, A, A, void> {
  return isolateGo(n)
}

/**
 * Run a pipeline until processing completes.
 */
export function run<R, E, A>(self: Conduit<R, E, void, void, A>) {
  return Pipe.runPipe(Pipe.injectLeftovers(self))
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
