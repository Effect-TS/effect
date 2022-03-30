import { List } from "../../../src/collection/immutable/List"
import { Duration } from "../../../src/data/Duration"
import { Clock } from "../../../src/io/Clock"
import { Effect } from "../../../src/io/Effect"
import { Ref } from "../../../src/io/Ref"
import { Schedule } from "../../../src/io/Schedule"

describe("Effect", () => {
  describe("schedule", () => {
    it("runs effect for each recurrence of the schedule", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(List.empty<number>()))
        .bindValue("effect", ({ ref }) =>
          Clock.currentTime.flatMap((n) => ref.update((list) => list.prepend(n)))
        )
        .bindValue(
          "schedule",
          () => Schedule.spaced(Duration(10)) && Schedule.recurs(5)
        )
        .tap(({ effect, schedule }) => effect.schedule(schedule))
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result.length).toBe(5)
    })
  })
})
