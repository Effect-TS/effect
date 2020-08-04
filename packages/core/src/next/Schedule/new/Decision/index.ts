import * as T from "../../effect"

export type Decision<S, Env, Inp, Out> = Done<Out> | Continue<S, Env, Inp, Out>

export type Interval = number

export type StepFunction<S, Env, Inp, Out> = (
  interval: Interval,
  inp: Inp
) => T.Effect<S, Env, never, Decision<S, Env, Inp, Out>>

export class Done<Out> {
  readonly _tag = "Done"

  constructor(readonly out: Out) {}
}

export class Continue<S, Env, Inp, Out> {
  readonly _tag = "Continue"

  constructor(
    readonly out: Out,
    readonly interval: Interval,
    readonly next: StepFunction<S, Env, Inp, Out>
  ) {}
}

export function toDone<S, Env, Inp, Out>(self: Decision<S, Env, Inp, Out>): Done<Out> {
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
  return <S, Env, Inp>(
    self: Decision<S, Env, Inp, Out>
  ): Decision<S, Env, Inp, Out1> => {
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
  return <S, Env, Out>(
    self: Decision<S, Env, Inp, Out>
  ): Decision<S, Env, Inp1, Out> => {
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
  return <S, Env, Inp, Out>(
    self: Decision<S, Env, Inp, Out>
  ): Decision<S, Env, Inp, Out1> => map(() => o)(self)
}

export function done<A>(a: A): StepFunction<never, unknown, unknown, A> {
  return () => T.succeedNow(new Done(a))
}
