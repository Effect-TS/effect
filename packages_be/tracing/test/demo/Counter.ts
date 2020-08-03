import { withChildSpan, addSpanTags } from "../../src"

import { print, Printer } from "./Printer"

import * as A from "@matechs/core/Array"
import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as L from "@matechs/core/Layer"

export const CounterState: unique symbol = Symbol()

export interface CounterState {
  [CounterState]: {
    ref: number
    increment(): T.SyncR<CounterState, void>
  }
}

export function currentCount() {
  return T.accessM(({ [CounterState]: counter }: CounterState) => T.pure(counter.ref))
}

export const counterState = T.provideM(
  T.sync(
    (): CounterState => ({
      [CounterState]: {
        ref: 0,
        increment() {
          return T.accessM((s: CounterState) =>
            T.sync(() => {
              s[CounterState].ref += 1
            })
          )
        }
      }
    })
  )
)

export const CounterURI: unique symbol = Symbol()

export interface Counter {
  [CounterURI]: {
    count(): T.SyncRE<Printer & CounterState, Error, ReadonlyArray<void>>
  }
}

export const Counter = L.fromValue<Counter>({
  [CounterURI]: {
    count() {
      return pipe(
        A.range(1, 10),
        T.traverseArray((n) =>
          T.Do()
            .do(increment())
            .bind(
              "count",
              pipe(
                currentCount(),
                addSpanTags({ "some.tag": "tag value" }),
                withChildSpan("span-current-count")
              )
            )
            .doL(({ count }) => print(`n: ${n} (${count})`))
            .unit()
        )
      )
    }
  }
})

export function increment(): T.SyncR<CounterState, void> {
  return T.accessM(({ [CounterState]: counter }: CounterState) => counter.increment())
}

export function count(): T.SyncRE<
  Counter & Printer & CounterState,
  Error,
  ReadonlyArray<void>
> {
  return T.accessM(({ [CounterURI]: counter }: Counter) => counter.count())
}
