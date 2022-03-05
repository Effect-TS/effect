import { Chunk } from "../../src/collection/immutable/Chunk"
import * as Eq from "../../src/prelude/Equal"
import * as Ord from "../../src/prelude/Ord"
import { STM } from "../../src/stm/STM"
import { TPriorityQueue } from "../../src/stm/TPriorityQueue"

interface Event {
  time: number
  description: string
}

const a = { time: -1, description: "aah" }
const b = { time: 0, description: "test" }
const as = Chunk<Event[]>(a, b)
const eventOrd = Ord.contramap_(Ord.number, ({ time }: Event) => time)
const eventEq = Eq.struct({
  time: Eq.number,
  description: Eq.string
})
const eventPredicate = ({ description }: Event) => description === "test"

describe("TPriorityQueue", () => {
  it("isEmpty", async () => {
    const program = TPriorityQueue.empty<Event>(eventOrd)
      .tap((queue) => queue.offerAll(as))
      .flatMap((queue) => queue.isEmpty())
      .commit()

    const result = await program.unsafeRunPromise()

    expect(result).toBe(as.isEmpty())
  })

  it("isNonEmpty", async () => {
    const program = TPriorityQueue.empty<Event>(eventOrd)
      .tap((queue) => queue.offerAll(as))
      .flatMap((queue) => queue.isNonEmpty())
      .commit()

    const result = await program.unsafeRunPromise()

    expect(result).toBe(as.isNonEmpty())
  })

  it("offerAll and takeAll", async () => {
    const program = TPriorityQueue.empty<Event>(eventOrd)
      .tap((queue) => queue.offerAll(as))
      .flatMap((queue) => queue.takeAll())
      .commit()

    const result = await program.unsafeRunPromise()

    expect(result.corresponds(as, eventEq.equals)).toBe(true)
  })

  it("removeIf", async () => {
    const program = TPriorityQueue.fromIterable(eventOrd)(as)
      .tap((queue) => queue.removeIf(eventPredicate))
      .flatMap((queue) => queue.toChunk())
      .commit()

    const result = await program.unsafeRunPromise()

    expect(result.corresponds(Chunk.single(a), eventEq.equals)).toBe(true)
  })

  it("retainIf", async () => {
    const program = TPriorityQueue.fromIterable(eventOrd)(as)
      .tap((queue) => queue.retainIf(eventPredicate))
      .flatMap((queue) => queue.toChunk())
      .commit()

    const result = await program.unsafeRunPromise()

    expect(result.corresponds(Chunk.single(b), eventEq.equals)).toBe(true)
  })

  it("take", async () => {
    const program = TPriorityQueue.fromIterable(eventOrd)(as)
      .flatMap((queue) => STM.collectAll(queue.take().replicate(as.size)))
      .commit()

    const result = await program.unsafeRunPromise()

    expect(result.corresponds(as, eventEq.equals)).toBe(true)
  })

  it("takeUpTo", async () => {
    const program = TPriorityQueue.fromIterable(eventOrd)(as)
      .flatMap((queue) =>
        STM.gen(function* (_) {
          return {
            left: yield* _(queue.takeUpTo(1)),
            right: yield* _(queue.takeAll())
          }
        })
      )
      .commit()

    const { left, right } = await program.unsafeRunPromise()

    expect(left.corresponds(Chunk.single(a), eventEq.equals)).toBe(true)
    expect(right.corresponds(Chunk.single(b), eventEq.equals)).toBe(true)
  })

  it("toChunk", async () => {
    const program = TPriorityQueue.fromIterable(eventOrd)(as)
      .flatMap((queue) => queue.toChunk())
      .commit()

    const result = await program.unsafeRunPromise()

    expect(result.corresponds(as, eventEq.equals)).toBe(true)
  })
})
