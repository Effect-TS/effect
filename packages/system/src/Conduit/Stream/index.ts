import type * as T from "../../Effect"
import { tuple } from "../../Function"
import * as M from "../../Managed"
import * as NA from "../../NonEmptyArray"
import * as Conduit from "../Conduit"
import * as Pipe from "../Pipe"
import * as Sink from "../Sink"

/**
 * Provides a stream of output values, without consuming any input or
 * producing a final result.
 */
export type Stream<R, E, O> = Conduit.Conduit<R, E, never, O, void>

/**
 * Take only the first N values from the stream
 */
export function takeN_<R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A> {
  return Conduit.fuse_(self, Conduit.isolate(n))
}

/**
 * Take only the first N values from the stream
 */
export function takeN(n: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A> {
  return (self) => takeN_(self, n)
}

function connectResumeGoRight<R, E, O, A>(
  left: Conduit.Conduit<R, E, never, O, void>,
  right: Conduit.Conduit<R, E, O, void, A>
): M.Managed<R, E, readonly [Stream<R, E, O>, A]> {
  switch (right._typeId) {
    case Pipe.HaveOutputTypeId: {
      throw new Error(`Sink should not produce outputs: ${right.output}`)
    }
    case Pipe.DoneTypeId: {
      return M.succeed(tuple(left, right.result))
    }
    case Pipe.LeftoverTypeId: {
      return M.suspend(() =>
        connectResumeGoRight(new Pipe.HaveOutput(left, right.leftover), right.pipe)
      )
    }
    case Pipe.NeedInputTypeId: {
      return M.suspend(() =>
        connectResumeGoLeft(right.newPipe, right.fromUpstream, left)
      )
    }
    case Pipe.PipeMTypeId: {
      return M.chain_(right.nextPipe, (p) => connectResumeGoRight(left, p))
    }
  }
}

function connectResumeGoLeft<R, E, O, A>(
  rp: (i: O) => Conduit.Conduit<R, E, O, void, A>,
  rc: (u: void) => Conduit.Conduit<R, E, O, void, A>,
  left: Conduit.Conduit<R, E, never, O, void>
): M.Managed<R, E, readonly [Stream<R, E, O>, A]> {
  switch (left._typeId) {
    case Pipe.DoneTypeId: {
      return M.suspend(() =>
        connectResumeGoRight(new Pipe.Done(left.result), rc(left.result))
      )
    }
    case Pipe.HaveOutputTypeId: {
      return M.suspend(() => connectResumeGoRight(left.nextPipe, rp(left.output)))
    }
    case Pipe.PipeMTypeId: {
      return M.chain_(left.nextPipe, (l) => connectResumeGoLeft(rp, rc, l))
    }
    case Pipe.LeftoverTypeId: {
      return M.suspend(() => connectResumeGoLeft(rp, rc, left.pipe))
    }
    case Pipe.NeedInputTypeId: {
      return M.suspend(() => connectResumeGoLeft(rp, rc, left.fromUpstream()))
    }
  }
}

/**
 * Connect a `Stream` to a `Sink` until the latter closes. Returns both the
 * most recent state of the `Stream` and the result of the `Sink`.
 */
export function connectResume<R, E, O, A>(
  source: Stream<R, E, O>,
  sink: Sink.Sink<R, E, O, A>
): M.Managed<R, E, readonly [Stream<R, E, O>, A]> {
  return connectResumeGoRight(source, sink)
}

/**
 * Run a pipeline until processing completes.
 */
export function runCollect<R, E, O>(self: Stream<R, E, O>) {
  return M.useNow(Conduit.run(Conduit.fuse_(self, Sink.list())))
}

/**
 * Send a value downstream to the next component to consume. If the
 * downstream component terminates, this call will never return control.
 */
export function succeed<O>(o: O): Stream<unknown, never, O> {
  return new Pipe.HaveOutput(new Pipe.Done(void 0), o)
}

function iterateGo<O>(x: O, f: (x: O) => O): Stream<unknown, never, O> {
  return new Pipe.HaveOutput(new Pipe.PipeM(M.effectTotal(() => iterateGo(f(x), f))), x)
}

/**
 * Produces an infinite stream of repeated applications of f to x.
 */
export function iterate<O>(x: O, f: (x: O) => O): Stream<unknown, never, O> {
  return iterateGo(x, f)
}

/**
 * Send an effect downstream to the next component to consume. If the
 * downstream component terminates, this call will never return control.
 */
export function fromEffect<R, E, O>(self: T.Effect<R, E, O>): Stream<R, E, O> {
  return new Pipe.PipeM(M.map_(M.fromEffect(self), succeed))
}

/**
 * Send an effect downstream to the next component to consume. If the
 * downstream component terminates, this call will never return control.
 */
export function fromManaged<R, E, O>(self: M.Managed<R, E, O>): Stream<R, E, O> {
  return new Pipe.PipeM(M.map_(self, succeed))
}

/**
 * Send a bunch of values downstream to the next component to consume. If the
 * downstream component terminates, this call will never return control.
 */
export function succeedMany<O>(...os: NA.NonEmptyArray<O>): Stream<unknown, never, O> {
  let x = succeed(NA.head(os))
  for (const y of NA.tail(os)) {
    x = Conduit.chain_(x, () => succeed(y))
  }
  return x
}

function conduitChainGo<R, E, A, B>(
  self: Stream<R, E, B>,
  f: (x: A) => Stream<R, E, B>
): Conduit.Conduit<R, E, A, B, void> {
  switch (self._typeId) {
    case Pipe.DoneTypeId: {
      return new Pipe.PipeM(M.effectTotal(() => conduitChain(f)))
    }
    case Pipe.HaveOutputTypeId: {
      return new Pipe.HaveOutput(
        new Pipe.PipeM(M.effectTotal(() => conduitChainGo(self.nextPipe, f))),
        self.output
      )
    }
    case Pipe.NeedInputTypeId: {
      throw new Error("Stream should not reqire inputs")
    }
    case Pipe.LeftoverTypeId: {
      throw new Error(`Stream should not have leftover: ${self.leftover}`)
    }
    case Pipe.PipeMTypeId: {
      return new Pipe.PipeM(M.map_(self.nextPipe, (p) => conduitChainGo(p, f)))
    }
  }
}

function conduitChain<R, E, A, B>(
  f: (x: A) => Stream<R, E, B>
): Conduit.Conduit<R, E, A, B, void> {
  return new Pipe.NeedInput(
    (i) => conduitChainGo(f(i), f),
    () => new Pipe.Done(void 0)
  )
}

/**
 * Monadic chain
 */
export function chain_<R, E, R1, E1, A, B>(
  self: Stream<R, E, A>,
  f: (a: A) => Stream<R1, E1, B>
): Stream<R & R1, E | E1, B> {
  return Conduit.fuse_(self, conduitChain(f))
}

/**
 * Monadic chain
 */
export function chain<R, E, A, B>(
  f: (a: A) => Stream<R, E, B>
): <R1, E1>(self: Stream<R1, E1, A>) => Stream<R & R1, E | E1, B> {
  return (self) => chain_(self, f)
}
