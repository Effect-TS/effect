import { effect as T } from "@matechs/effect";
import * as A from "fp-ts/lib/Array";
import { Do } from "fp-ts-contrib/lib/Do";
import { print, Printer } from "./Printer";
import { withChildSpan } from "../../src";

export const CounterState: unique symbol = Symbol();

export interface CounterState {
  [CounterState]: {
    ref: number;
    increment(): T.Effect<CounterState, T.NoErr, void>;
  };
}

export function currentCount() {
  return T.accessM(({ [CounterState]: counter }: CounterState) =>
    T.pure(counter.ref)
  );
}

export const counterState = T.provideSM(
  T.sync(
    (): CounterState => ({
      [CounterState]: {
        ref: 0,
        increment() {
          return T.accessM((s: CounterState) =>
            T.sync(() => {
              s[CounterState].ref += 1;
            })
          );
        },
      },
    })
  )
);

export const Counter: unique symbol = Symbol();

export interface Counter {
  [Counter]: {
    count(): T.Effect<Printer & CounterState, Error, void[]>;
  };
}

export const counter: Counter = {
  [Counter]: {
    count() {
      return A.array.traverse(T.effect)(A.range(1, 10), (n) =>
        Do(T.effect)
          .do(increment())
          .bind("count", withChildSpan("span-current-count")(currentCount()))
          .doL(({ count }) => print(`n: ${n} (${count})`))
          // tslint:disable-next-line: no-empty
          .return(() => {})
      );
    },
  },
};

export function increment(): T.Effect<CounterState, T.NoErr, void> {
  return T.accessM(({ [CounterState]: counter }: CounterState) =>
    counter.increment()
  );
}

export function count(): T.Effect<
  Counter & Printer & CounterState,
  Error,
  void[]
> {
  return T.accessM(({ [Counter]: counter }: Counter) => counter.count());
}
