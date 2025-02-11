import { Console, Schedule } from "effect"

// -------------------------------------------------------------------------------------
// tapOutput
// -------------------------------------------------------------------------------------

// $ExpectType Schedule<string | number, unknown, never>
Schedule.once.pipe(
  Schedule.as<number | string>(1),
  Schedule.tapOutput((
    x // $ExpectType string | number
  ) => Console.log(x))
)

// The callback should not affect the type of the output (`number`)
// $ExpectType Schedule<number, unknown, never>
Schedule.once.pipe(
  Schedule.as(1),
  Schedule.tapOutput((x: string | number) => Console.log(x))
)
// $ExpectType Schedule<number, unknown, never>
Schedule.tapOutput(
  Schedule.once.pipe(
    Schedule.as(1)
  ),
  (x: string | number) => Console.log(x)
)

Schedule.once.pipe(
  Schedule.as<number | string>(1),
  // @ts-expect-error
  Schedule.tapOutput((s: string) => Console.log(s.trim()))
)
