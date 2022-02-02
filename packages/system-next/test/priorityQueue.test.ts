import { Chunk } from "../src/collection/immutable/Chunk"
import { flow, pipe } from "../src/data/Function"
import * as Eq from "../src/prelude/Equal"
import * as Ord from "../src/prelude/Ord"
import * as STM from "../src/stm/STM"
import * as TPriorityQueue from "../src/stm/TPriorityQueue"

interface Event {
  time: number
  description: string
}

describe("TPriorityQueue", () => {
  const a = { time: -1, description: "aah" }
  const b = { time: 0, description: "test" }
  const as = Chunk<Event[]>(a, b)
  const eventOrd = Ord.contramap_(Ord.number, ({ time }: Event) => time)
  const eventEq = Eq.struct({
    time: Eq.number,
    description: Eq.string
  })
  const eventPredicate = ({ description }: Event) => description === "test"

  it("isEmpty", async () => {
    const program = pipe(
      TPriorityQueue.empty<Event>(eventOrd),
      STM.tap(TPriorityQueue.offerAll(as)),
      STM.chain(TPriorityQueue.isEmpty),
      STM.commit
    )

    const result = await program.unsafeRunPromise()

    expect(result).toBe(as.isEmpty())
  })

  it("nonEmpty", async () => {
    const program = pipe(
      TPriorityQueue.empty<Event>(eventOrd),
      STM.tap(TPriorityQueue.offerAll(as)),
      STM.chain(TPriorityQueue.nonEmpty),
      STM.commit
    )

    const result = await program.unsafeRunPromise()

    expect(result).toBe(as.isNonEmpty())
  })

  it("offerAll and takeAll", async () => {
    const program = pipe(
      TPriorityQueue.empty<Event>(eventOrd),
      STM.tap(TPriorityQueue.offerAll(as)),
      STM.chain(TPriorityQueue.takeAll),
      STM.commit
    )

    const result = await program.unsafeRunPromise()

    expect(result.corresponds(as, eventEq.equals)).toBe(true)
  })

  it("removeIf", async () => {
    const program = pipe(
      TPriorityQueue.fromIterable_(eventOrd, as),
      STM.tap(TPriorityQueue.removeIf(eventPredicate)),
      STM.chain(TPriorityQueue.toChunk),
      STM.commit
    )

    const result = await program.unsafeRunPromise()

    expect(result.corresponds(Chunk.single(a), eventEq.equals)).toBe(true)
  })

  it("retainIf", async () => {
    const program = pipe(
      TPriorityQueue.fromIterable_(eventOrd, as),
      STM.tap(TPriorityQueue.retainIf(eventPredicate)),
      STM.chain(TPriorityQueue.toChunk),
      STM.commit
    )

    const result = await program.unsafeRunPromise()

    expect(result.corresponds(Chunk.single(b), eventEq.equals)).toBe(true)
  })

  it("take", async () => {
    const program = pipe(
      TPriorityQueue.fromIterable_(eventOrd, as),
      STM.chain(flow(TPriorityQueue.take, STM.replicate(as.size), STM.collectAll)),
      STM.commit
    )

    const result = await program.unsafeRunPromise()

    expect(result.corresponds(as, eventEq.equals)).toBe(true)
  })

  it("takeUpTo", async () => {
    const program = pipe(
      TPriorityQueue.fromIterable_(eventOrd, as),
      STM.chain((queue) =>
        STM.gen(function* (_) {
          return {
            left: yield* _(TPriorityQueue.takeUpTo_(queue, 1)),
            right: yield* _(TPriorityQueue.takeAll(queue))
          }
        })
      ),
      STM.commit
    )

    const { left, right } = await program.unsafeRunPromise()

    expect(left.corresponds(Chunk.single(a), eventEq.equals)).toBe(true)
    expect(right.corresponds(Chunk.single(b), eventEq.equals)).toBe(true)
  })

  it("toChunk", async () => {
    const program = pipe(
      TPriorityQueue.fromIterable_(eventOrd, as),
      STM.chain(TPriorityQueue.toChunk),
      STM.commit
    )

    const result = await program.unsafeRunPromise()

    expect(result.corresponds(as, eventEq.equals)).toBe(true)
  })
})
