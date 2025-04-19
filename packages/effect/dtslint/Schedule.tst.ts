import { Console, Schedule } from "effect"
import { describe, expect, it } from "tstyche"

describe("Schedule", () => {
  it("tapOutput", () => {
    expect(Schedule.once.pipe(
      Schedule.as<number | string>(1),
      Schedule.tapOutput((x) => {
        expect(x).type.toBe<string | number>()
        return Console.log(x)
      })
    )).type.toBe<Schedule.Schedule<string | number, unknown, never>>()

    // The callback should not affect the type of the output (`number`)
    expect(Schedule.once.pipe(
      Schedule.as(1),
      Schedule.tapOutput((x: string | number) => Console.log(x))
    )).type.toBe<Schedule.Schedule<number, unknown, never>>()

    expect(Schedule.tapOutput(
      Schedule.once.pipe(
        Schedule.as(1)
      ),
      (x: string | number) => Console.log(x)
    )).type.toBe<Schedule.Schedule<number, unknown, never>>()

    expect(Schedule.tapOutput<void, never, string | number>).type.not.toBeCallableWith(
      (s: string) => Console.log(s.trim())
    )
  })
})
