import { equivalentElements } from "effect-test/utils/equals"
import * as it from "effect-test/utils/extend"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as number from "effect/Number"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as RA from "effect/ReadonlyArray"
import * as STM from "effect/STM"
import * as TPriorityQueue from "effect/TPriorityQueue"
import * as fc from "fast-check"
import { assert, describe } from "vitest"

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

describe.concurrent("TPriorityQueue", () => {
  it.it("isEmpty", () =>
    fc.assert(fc.asyncProperty(eventsArb, async (events) => {
      const transaction = pipe(
        TPriorityQueue.empty<Event>(orderByTime),
        STM.tap(TPriorityQueue.offerAll(events)),
        STM.flatMap(TPriorityQueue.isEmpty)
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      assert.strictEqual(result, events.length === 0)
    })))

  it.it("isNonEmpty", () =>
    fc.assert(fc.asyncProperty(eventsArb, async (events) => {
      const transaction = pipe(
        TPriorityQueue.empty<Event>(orderByTime),
        STM.tap(TPriorityQueue.offerAll(events)),
        STM.flatMap(TPriorityQueue.isNonEmpty)
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      assert.strictEqual(result, events.length > 0)
    })))

  it.it("offerAll and takeAll", () =>
    fc.assert(fc.asyncProperty(eventsArb, async (events) => {
      const transaction = pipe(
        TPriorityQueue.empty<Event>(orderByTime),
        STM.tap(TPriorityQueue.offerAll(events)),
        STM.flatMap(TPriorityQueue.takeAll),
        STM.map((chunk) => Array.from(chunk))
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      assert.lengthOf(pipe(result, RA.differenceWith(equivalentElements())(events)), 0)
      assert.lengthOf(pipe(events, RA.differenceWith(equivalentElements())(result)), 0)
      assert.deepStrictEqual(result, pipe(result, RA.sort(orderByTime)))
    })))

  it.it("removeIf", () =>
    fc.assert(fc.asyncProperty(eventsArb, predicateArb, async (events, f) => {
      const transaction = pipe(
        TPriorityQueue.fromIterable(orderByTime)(events),
        STM.tap(TPriorityQueue.removeIf(f)),
        STM.flatMap(TPriorityQueue.toArray)
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      const filtered = RA.filter(events, (a) => !f(a))
      assert.lengthOf(RA.differenceWith(equivalentElements())(result, filtered), 0)
      assert.lengthOf(RA.differenceWith(equivalentElements())(filtered, result), 0)
      assert.deepStrictEqual(result, RA.sort(orderByTime)(result))
    })))

  it.it("retainIf", () =>
    fc.assert(fc.asyncProperty(eventsArb, predicateArb, async (events, f) => {
      const transaction = pipe(
        TPriorityQueue.fromIterable(orderByTime)(events),
        STM.tap(TPriorityQueue.retainIf(f)),
        STM.flatMap(TPriorityQueue.toArray)
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      const filtered = RA.filter(events, f)
      assert.lengthOf(RA.differenceWith(equivalentElements())(result, filtered), 0)
      assert.lengthOf(RA.differenceWith(equivalentElements())(filtered, result), 0)
      assert.deepStrictEqual(result, RA.sort(orderByTime)(result))
    })))

  it.it("take", () =>
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
      assert.lengthOf(pipe(result, RA.differenceWith(equivalentElements())(events)), 0)
      assert.lengthOf(pipe(events, RA.differenceWith(equivalentElements())(result)), 0)
      assert.deepStrictEqual(result, pipe(result, RA.sort(orderByTime)))
    })))

  it.it("takeOption", () =>
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
        assert.isTrue(Option.isSome(result[0]))
        assert.isTrue(Option.isNone(result[1]))
      })
    ))

  it.it("takeUpTo", () =>
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
          assert.lengthOf(pipe(result, RA.differenceWith(equivalentElements())(events)), 0)
          assert.lengthOf(pipe(events, RA.differenceWith(equivalentElements())(result)), 0)
          assert.deepStrictEqual(result, pipe(result, RA.sort(orderByTime)))
        }
      )
    ))

  it.it("toChunk", () =>
    fc.assert(fc.asyncProperty(eventsArb, async (events) => {
      const transaction = pipe(
        TPriorityQueue.fromIterable(orderByTime)(events),
        STM.flatMap(TPriorityQueue.toChunk),
        STM.map((chunk) => Array.from(chunk))
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      assert.lengthOf(pipe(result, RA.differenceWith(equivalentElements())(events)), 0)
      assert.lengthOf(pipe(events, RA.differenceWith(equivalentElements())(result)), 0)
      assert.deepStrictEqual(result, pipe(result, RA.sort(orderByTime)))
    })))

  it.it("toReadonlyArray", () =>
    fc.assert(fc.asyncProperty(eventsArb, async (events) => {
      const transaction = pipe(
        TPriorityQueue.fromIterable(orderByTime)(events),
        STM.flatMap(TPriorityQueue.toArray)
      )
      const result = await Effect.runPromise(STM.commit(transaction))
      assert.lengthOf(pipe(result, RA.differenceWith(equivalentElements())(events)), 0)
      assert.lengthOf(pipe(events, RA.differenceWith(equivalentElements())(result)), 0)
      assert.deepStrictEqual(result, pipe(result, RA.sort(orderByTime)))
    })))
})
