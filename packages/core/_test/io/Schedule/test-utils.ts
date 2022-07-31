export const ioSucceed = () => Effect.succeed("OrElse")
export const ioFail = () => Effect.fail("OrElseFailed")

/**
 * A function that increments ref each time it is called. It always fails,
 * with the incremented value in error.
 */
export function alwaysFail(ref: Ref<number>): Effect<never, string, number> {
  return ref.updateAndGet((n) => n + 1).flatMap((n) => Effect.failSync(`Error: ${n}`))
}

/**
 * A function that increments ref each time it is called. It returns either a
 * failure if ref value is 0 or less before increment, and the value in other
 * cases.
 */
export function failOn0(ref: Ref<number>): Effect<never, string, number> {
  return Do(($) => {
    const i = $(ref.updateAndGet((n) => n + 1))
    return $(i <= 1 ? Effect.fail(`Error: ${i}`) : Effect.succeed(i))
  })
}

export function checkDelays<State, Env>(
  schedule: Schedule<State, Env, number, Duration>
): Effect<Env, never, Tuple<[Chunk<Duration>, Chunk<Duration>]>> {
  return Do(($) => {
    const now = $(Effect.sync(Date.now()))
    const input = Chunk(1, 2, 3, 4, 5)
    const actual = $(schedule.run(now, input))
    const expected = $(schedule.delays.run(now, input))
    return Tuple(actual, expected)
  })
}

export function checkRepetitions<State, Env>(
  schedule: Schedule<State, Env, number, number>
): Effect.RIO<Env, Tuple<[Chunk<number>, Chunk<number>]>> {
  return Do(($) => {
    const now = $(Effect.sync(Date.now()))
    const input = Chunk(1, 2, 3, 4, 5)
    const actual = $(schedule.run(now, input))
    const expected = $(schedule.repetitions.run(now, input))
    return Tuple(actual, expected)
  })
}

export function repeat<State, Env, B>(
  schedule: Schedule<State, Env, number, B>
): Effect<Env, never, B> {
  return Ref.make(0).flatMap((ref) => ref.updateAndGet((n) => n + 1).repeat(schedule))
}

export function run<R, E, A>(effect: Effect<R, E, A>): Effect<R | TestEnvironment, E, A> {
  return Do(($) => {
    const fiber = $(effect.fork)
    $(TestClock.setTime(Number.MAX_SAFE_INTEGER))
    return $(fiber.join)
  })
}

/**
 * Run a `Schedule` using the provided input and collect all outputs.
 */
export function runCollect<State, Env, In, Out>(
  schedule: Schedule<State, Env, In, Out>,
  input: Collection<In>
): Effect<Env | TestEnvironment, never, Chunk<Out>> {
  return run(
    schedule.driver.flatMap((driver) => {
      function loop(
        input: List<In>,
        acc: Chunk<Out>
      ): Effect<Env | TestEnvironment, never, Chunk<Out>> {
        if (input.length === 0) {
          return Effect.sync(acc)
        }
        const head = input.unsafeHead!
        const tail = input.length === 1 ? List.nil() : input.unsafeTail!
        return driver.next(head).foldEffect(
          () =>
            driver.last.fold(
              () => acc,
              (b) => acc.append(b)
            ),
          (b) => loop(tail, acc.append(b))
        )
      }
      return loop(List.from(input), Chunk.empty())
    })
  )
}

export function runManually<State, Env, In, Out>(
  schedule: Schedule<State, Env, In, Out>,
  inputs: Collection<Tuple<[number, In]>>
): Effect<Env, never, Tuple<[List<Tuple<[number, Out]>>, Maybe<Out>]>> {
  return runManuallyLoop(schedule, schedule.initial, List.from(inputs), List.nil())
}

function runManuallyLoop<State, Env, In, Out>(
  schedule: Schedule<State, Env, In, Out>,
  state: State,
  inputs: List<Tuple<[number, In]>>,
  acc: List<Tuple<[number, Out]>>
): Effect<Env, never, Tuple<[List<Tuple<[number, Out]>>, Maybe<Out>]>> {
  if (inputs.isNil()) {
    return Effect.succeed(Tuple(acc.reverse, Maybe.none))
  }
  const { tuple: [offset, input] } = inputs.head
  const rest = inputs.tail
  return schedule.step(offset, input, state).flatMap(({ tuple: [state, out, decision] }) => {
    switch (decision._tag) {
      case "Done": {
        return Effect.succeed(Tuple(acc.reverse, Maybe.some(out)))
      }
      case "Continue": {
        return runManuallyLoop(
          schedule,
          state,
          rest,
          acc.prepend(Tuple(decision.intervals.start, out))
        )
      }
    }
  })
}
