// ets_tracing: off

import * as T from "../effect.js"

export type Decision<Env, Inp, Out> = Done<Out> | Continue<Env, Inp, Out>

export type Interval = number

export type StepFunction<Env, Inp, Out> = (
  interval: Interval,
  inp: Inp
) => T.Effect<Env, never, Decision<Env, Inp, Out>>

export class Done<Out> {
  readonly _tag = "Done"

  constructor(readonly out: Out) {}
}

export class Continue<Env, Inp, Out> {
  readonly _tag = "Continue"

  constructor(
    readonly out: Out,
    readonly interval: Interval,
    readonly next: StepFunction<Env, Inp, Out>
  ) {}
}

export function makeDone<Out>(o: Out): Decision<unknown, unknown, Out> {
  return new Done(o)
}

export function makeContinue<Env, Inp, Out>(
  out: Out,
  interval: Interval,
  next: StepFunction<Env, Inp, Out>
): Decision<Env, Inp, Out> {
  return new Continue(out, interval, next)
}

export function toDone<Env, Inp, Out>(self: Decision<Env, Inp, Out>): Done<Out> {
  switch (self._tag) {
    case "Done": {
      return self
    }
    case "Continue": {
      return new Done(self.out)
    }
  }
}

export function map<Out, Out1>(f: (o: Out) => Out1) {
  return <Env, Inp>(self: Decision<Env, Inp, Out>): Decision<Env, Inp, Out1> => {
    switch (self._tag) {
      case "Done": {
        return new Done(f(self.out))
      }
      case "Continue": {
        return new Continue(f(self.out), self.interval, (n, i) =>
          T.map_(self.next(n, i), map(f))
        )
      }
    }
  }
}

export function contramap<Inp, Inp1>(f: (i: Inp1) => Inp) {
  return <Env, Out>(self: Decision<Env, Inp, Out>): Decision<Env, Inp1, Out> => {
    switch (self._tag) {
      case "Done": {
        return self
      }
      case "Continue": {
        return new Continue(self.out, self.interval, (n, i) =>
          T.map_(self.next(n, f(i)), contramap(f))
        )
      }
    }
  }
}

export function as<Out1>(o: Out1) {
  return <Env, Inp, Out>(self: Decision<Env, Inp, Out>): Decision<Env, Inp, Out1> =>
    map(() => o)(self)
}

export function done<A>(a: A): StepFunction<unknown, unknown, A> {
  return () => T.succeed(new Done(a))
}
