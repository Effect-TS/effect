import * as T from "../../Effect"
import { tuple } from "../../Function"
import * as NA from "../../NonEmptyArray"
import * as Conduit from "../Conduit"
import * as Pipe from "../Pipe"

/**
 * Provides a stream of output values, without consuming any input or
 * producing a final result.
 */
export type Stream<R, E, O> = Conduit.Conduit<R, E, void, O, void>

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
  left: Conduit.Conduit<R, E, void, O, void>,
  right: Conduit.Conduit<R, E, O, void, A>
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
  rp: (i: O) => Conduit.Conduit<R, E, O, void, A>,
  rc: (u: void) => Conduit.Conduit<R, E, O, void, A>,
  left: Conduit.Conduit<R, E, void, O, void>
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
  sink: Conduit.Sink<R, E, O, A>
): T.Effect<R, E, readonly [Stream<R, E, O>, A]> {
  return connectResumeGoRight(source, sink)
}

/**
 * Run a pipeline until processing completes.
 */
export function runCollect<R, E, O>(self: Stream<R, E, O>) {
  return Conduit.run(Conduit.fuse_(self, Conduit.sinkList()))
}

/**
 * Send a value downstream to the next component to consume. If the
 * downstream component terminates, this call will never return control.
 */
export function succeed<O>(o: O): Stream<unknown, never, O> {
  return new Pipe.HaveOutput(new Pipe.Done(void 0), o)
}

function iterateGo<O>(x: O, f: (x: O) => O): Stream<unknown, never, O> {
  return new Pipe.HaveOutput(new Pipe.PipeM(T.effectTotal(() => iterateGo(f(x), f))), x)
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
  return new Pipe.PipeM(T.map_(self, succeed))
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
