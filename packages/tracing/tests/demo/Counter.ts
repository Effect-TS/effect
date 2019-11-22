import * as T from "@matechs/effect";
import * as A from "fp-ts/lib/Array";
import { IO } from "fp-ts/lib/IO";
import { Do } from "fp-ts-contrib/lib/Do";
import { print, Printer } from "./Printer";
import { ChildContext, Tracer, withChildSpan } from "../../src";

export interface CounterState {
  counter: {
    ref: number;

    increment(): T.Effect<CounterState, T.NoErr, void>;
  };
}

export function currentCount() {
  return T.accessM(({ counter }: CounterState) => T.right(counter.ref));
}

export const counterState: IO<CounterState> = () => ({
  counter: {
    ref: 0,
    increment() {
      return T.accessM((s: CounterState) =>
        T.fromIO(() => {
          s.counter.ref += 1;
        })
      );
    }
  }
});

export interface Counter {
  counter: {
    count(): T.Effect<
      Printer & Tracer & CounterState & ChildContext,
      Error,
      void[]
    >;
  };
}

export const counter: Counter = {
  counter: {
    count() {
      return A.array.traverse(T.effectMonad)(A.range(1, 10), n =>
        Do(T.effectMonad)
          .do(increment())
          .bind("count", withChildSpan("span-current-count")(currentCount()))
          .doL(({ count }) => print(`n: ${n} (${count})`))
          .return(() => {})
      );
    }
  }
};

export function increment(): T.Effect<CounterState, T.NoErr, void> {
  return T.accessM(({ counter }: CounterState) => counter.increment());
}

export function count(): T.Effect<
  Counter & Printer & Tracer & CounterState & ChildContext,
  Error,
  void[]
> {
  return T.accessM(({ counter }: Counter) => counter.count());
}
