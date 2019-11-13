import * as E from "@matechs/effect";
import * as A from "fp-ts/lib/Array";
import { IO } from "fp-ts/lib/IO";
import { Do } from "fp-ts-contrib/lib/Do";
import { print, Printer } from "./Printer";
import { ChildContext, Tracer, withChildSpan } from "../../src";

export interface CounterState {
  counter: {
    ref: number;

    increment(): E.Effect<CounterState, E.NoErr, void>;
  };
}

export function increment() {
  return E.accessM(({ counter }: CounterState) => counter.increment());
}

export function currentCount() {
  return E.accessM(({ counter }: CounterState) => E.right(counter.ref));
}

export const counterState: IO<CounterState> = () => ({
  counter: {
    ref: 0,
    increment() {
      return E.accessM((s: CounterState) =>
        E.liftIO(() => {
          s.counter.ref += 1;
        })
      );
    }
  }
});

export interface Counter {
  counter: {
    count(): E.Effect<
      Printer & Tracer & CounterState & ChildContext,
      Error,
      void[]
    >;
  };
}

export function count() {
  return E.accessM(({ counter }: Counter) => counter.count());
}

export const counter: Counter = {
  counter: {
    count() {
      return A.array.traverse(E.effectMonad)(A.range(1, 10), n =>
        Do(E.effectMonad)
          .do(increment())
          .bind("count", withChildSpan("span-current-count")(currentCount()))
          .doL(({ count }) => print(`n: ${n} (${count})`))
          .return(() => {})
      );
    }
  }
};
