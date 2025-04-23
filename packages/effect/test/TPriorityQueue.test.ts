import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import {
  Array as Arr,
  Effect,
  FastCheck as fc,
  Number as number,
  Option,
  Order,
  pipe,
  STM,
  TPriorityQueue
} from "effect"
import { equivalentElements } from "./utils/equals.js"

interface Event {
  readonly time: number
  readonly description: string
}

const orderByTime: Order.Order<Event> = pipe(
  number.Order,
  Order.mapInput((event) => event.time)
)

const eventArb: fc.Arbitrary<Event> = fc.tuple(
  fc.integer({ min: -10, max: 10 }),
  fc.asciiString({ minLength: 1 })
).map(([time, description]) => ({ time, description }))

const eventsArb: fc.Arbitrary<Array<Event>> = fc.array(eventArb)

const predicateArb: fc.Arbitrary<(event: Event) => boolean> = fc.func(fc.boolean()).map((f) => (e: Event) => f(e))

describe("TPriorityQueue", () => {
  it("isEmpty", () =>
    fc.assert(fc.asyncProperty(eventsArb, async (events) => {
      const transaction = pipe(
        TPriorityQueue.empty<Event>(orderByTime),
        STM.tap(TPriorityQueue.offerAll(events)),
        STM.flatMap(TPriorityQueue.isEmpty)
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      strictEqual(result, events.length === 0)
    })))

  it("isNonEmpty", () =>
    fc.assert(fc.asyncProperty(eventsArb, async (events) => {
      const transaction = pipe(
        TPriorityQueue.empty<Event>(orderByTime),
        STM.tap(TPriorityQueue.offerAll(events)),
        STM.flatMap(TPriorityQueue.isNonEmpty)
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      strictEqual(result, events.length > 0)
    })))

  it("offerAll and takeAll", () =>
    fc.assert(fc.asyncProperty(eventsArb, async (events) => {
      const transaction = pipe(
        TPriorityQueue.empty<Event>(orderByTime),
        STM.tap(TPriorityQueue.offerAll(events)),
        STM.flatMap(TPriorityQueue.takeAll),
        STM.map((chunk) => Array.from(chunk))
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      strictEqual(pipe(result, Arr.differenceWith(equivalentElements())(events)).length, 0)
      strictEqual(pipe(events, Arr.differenceWith(equivalentElements())(result)).length, 0)
      deepStrictEqual(result, pipe(result, Arr.sort(orderByTime)))
    })))

  it("removeIf", () =>
    fc.assert(fc.asyncProperty(eventsArb, predicateArb, async (events, f) => {
      const transaction = pipe(
        TPriorityQueue.fromIterable(orderByTime)(events),
        STM.tap(TPriorityQueue.removeIf(f)),
        STM.flatMap(TPriorityQueue.toArray)
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      const filtered = Arr.filter(events, (a) => !f(a))
      strictEqual(Arr.differenceWith(equivalentElements())(result, filtered).length, 0)
      strictEqual(Arr.differenceWith(equivalentElements())(filtered, result).length, 0)
      deepStrictEqual(result, Arr.sort(orderByTime)(result))
    })))

  it("retainIf", () =>
    fc.assert(fc.asyncProperty(eventsArb, predicateArb, async (events, f) => {
      const transaction = pipe(
        TPriorityQueue.fromIterable(orderByTime)(events),
        STM.tap(TPriorityQueue.retainIf(f)),
        STM.flatMap(TPriorityQueue.toArray)
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      const filtered = Arr.filter(events, f)
      strictEqual(Arr.differenceWith(equivalentElements())(result, filtered).length, 0)
      strictEqual(Arr.differenceWith(equivalentElements())(filtered, result).length, 0)
      deepStrictEqual(result, Arr.sort(orderByTime)(result))
    })))

  it("take", () =>
    fc.assert(fc.asyncProperty(eventsArb, async (events) => {
      const transaction = pipe(
        TPriorityQueue.fromIterable(orderByTime)(events),
        STM.flatMap((queue) =>
          STM.all(pipe(
            TPriorityQueue.take(queue),
            STM.replicate(events.length)
          ))
        ),
        STM.map((chunk) => Array.from(chunk))
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      strictEqual(pipe(result, Arr.differenceWith(equivalentElements())(events)).length, 0)
      strictEqual(pipe(events, Arr.differenceWith(equivalentElements())(result)).length, 0)
      deepStrictEqual(result, pipe(result, Arr.sort(orderByTime)))
    })))

  it("takeOption", () =>
    fc.assert(
      fc.asyncProperty(eventsArb.filter((events) => events.length > 0), async (events) => {
        const transaction = pipe(
          TPriorityQueue.fromIterable(orderByTime)(events),
          STM.flatMap((queue) =>
            pipe(
              TPriorityQueue.takeOption(queue),
              STM.tap(() => TPriorityQueue.takeAll(queue)),
              STM.flatMap((left) =>
                pipe(
                  TPriorityQueue.takeOption(queue),
                  STM.map((right) => [left, right] as const)
                )
              )
            )
          )
        )
        const result = await Effect.runPromise(STM.commit(transaction))
        assertTrue(Option.isSome(result[0]))
        assertTrue(Option.isNone(result[1]))
      })
    ))

  it("takeUpTo", () =>
    fc.assert(
      fc.asyncProperty(
        eventsArb.chain((events) => fc.tuple(fc.constant(events), fc.integer({ min: 0, max: events.length }))),
        async ([events, n]) => {
          const transaction = pipe(
            TPriorityQueue.fromIterable(orderByTime)(events),
            STM.flatMap((queue) =>
              pipe(
                queue,
                TPriorityQueue.takeUpTo(n),
                STM.flatMap((left) =>
                  pipe(
                    TPriorityQueue.takeAll(queue),
                    STM.map((right) => [...left, ...right])
                  )
                )
              )
            )
          )
          const result = await Effect.runPromise(STM.commit(transaction))
          strictEqual(pipe(result, Arr.differenceWith(equivalentElements())(events)).length, 0)
          strictEqual(pipe(events, Arr.differenceWith(equivalentElements())(result)).length, 0)
          deepStrictEqual(result, pipe(result, Arr.sort(orderByTime)))
        }
      )
    ))

  it("toChunk", () =>
    fc.assert(fc.asyncProperty(eventsArb, async (events) => {
      const transaction = pipe(
        TPriorityQueue.fromIterable(orderByTime)(events),
        STM.flatMap(TPriorityQueue.toChunk),
        STM.map((chunk) => Array.from(chunk))
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      strictEqual(pipe(result, Arr.differenceWith(equivalentElements())(events)).length, 0)
      strictEqual(pipe(events, Arr.differenceWith(equivalentElements())(result)).length, 0)
      deepStrictEqual(result, pipe(result, Arr.sort(orderByTime)))
    })))

  it("toReadonlyArray", () =>
    fc.assert(fc.asyncProperty(eventsArb, async (events) => {
      const transaction = pipe(
        TPriorityQueue.fromIterable(orderByTime)(events),
        STM.flatMap(TPriorityQueue.toArray)
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      strictEqual(pipe(result, Arr.differenceWith(equivalentElements())(events)).length, 0)
      strictEqual(pipe(events, Arr.differenceWith(equivalentElements())(result)).length, 0)
      deepStrictEqual(result, pipe(result, Arr.sort(orderByTime)))
    })))
})
