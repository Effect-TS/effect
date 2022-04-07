import { Driver } from "@effect/core/io/Schedule/Driver";

export const ClockId = Symbol.for("@effect/core/io/Clock");
export type ClockId = typeof ClockId;

export const HasClock = Service<Clock>(ClockId);
export type HasClock = Has<Clock>;

/**
 * @tsplus type ets/Clock
 */
export interface Clock {
  readonly [ClockId]: ClockId;

  readonly currentTime: UIO<number>;

  readonly sleep: (duration: LazyArg<Duration>, __tsplusTrace?: string) => UIO<void>;

  readonly driver: <State, Env, In, Out>(
    schedule: Schedule.WithState<State, Env, In, Out>,
    __tsplusTrace?: string
  ) => UIO<Driver<State, Env, In, Out>>;

  readonly repeat: {
    <R, E, A, S, R1, A1>(
      effect0: LazyArg<Effect<R, E, A>>,
      schedule0: LazyArg<Schedule.WithState<S, R1, A, A1>>,
      __tsplusTrace?: string
    ): Effect<R & R1, E, A1>;
    <R, E, A, R1, A1>(
      effect0: LazyArg<Effect<R, E, A>>,
      schedule0: LazyArg<Schedule<R1, A, A1>>,
      __tsplusTrace?: string
    ): Effect<R & R1, E, A1>;
  };

  readonly repeatOrElse: {
    <R, E, A, S, R1, A1, R2, E2, A2>(
      effect0: LazyArg<Effect<R, E, A>>,
      schedule0: LazyArg<Schedule.WithState<S, R1, A, A1>>,
      orElse: (e: E, option: Option<A1>) => Effect<R2, E2, A2>,
      __tsplusTrace?: string
    ): Effect<R & R1 & R2, E2, A1 | A2>;
    <R, E, A, R1, A1, R2, E2, A2>(
      effect0: LazyArg<Effect<R, E, A>>,
      schedule0: LazyArg<Schedule<R1, A, A1>>,
      orElse: (e: E, option: Option<A1>) => Effect<R2, E2, A2>,
      __tsplusTrace?: string
    ): Effect<R & R1 & R2, E2, A1 | A2>;
  };

  readonly repeatOrElseEither: {
    <R, E, A, S, R1, A1, R2, E2, A2>(
      effect0: LazyArg<Effect<R, E, A>>,
      schedule0: LazyArg<Schedule.WithState<S, R1, A, A1>>,
      orElse: (e: E, option: Option<A1>) => Effect<R2, E2, A2>,
      __tsplusTrace?: string
    ): Effect<R & R1 & R2, E2, Either<A2, A1>>;
    <R, E, A, R1, A1, R2, E2, A2>(
      effect0: LazyArg<Effect<R, E, A>>,
      schedule0: LazyArg<Schedule<R1, A, A1>>,
      orElse: (e: E, option: Option<A1>) => Effect<R2, E2, A2>,
      __tsplusTrace?: string
    ): Effect<R & R1 & R2, E2, Either<A2, A1>>;
  };

  readonly retry: {
    <R, E, A, S, R1, Out>(
      effect0: LazyArg<Effect<R, E, A>>,
      schedule0: LazyArg<Schedule.WithState<S, R1, E, Out>>,
      __tsplusTrace?: string
    ): Effect<R & R1, E, A>;
    <R, E, A, R1, Out>(
      effect0: LazyArg<Effect<R, E, A>>,
      schedule0: LazyArg<Schedule<R1, E, Out>>,
      __tsplusTrace?: string
    ): Effect<R & R1, E, A>;
  };

  readonly retryOrElse: {
    <R, E, A, S, R1, A1, R2, E2, A2>(
      effect0: LazyArg<Effect<R, E, A>>,
      schedule0: LazyArg<Schedule.WithState<S, R1, E, A1>>,
      orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
      __tsplusTrace?: string
    ): Effect<R & R1 & R2, E2, A | A2>;
    <R, E, A, R1, A1, R2, E2, A2>(
      effect0: LazyArg<Effect<R, E, A>>,
      schedule0: LazyArg<Schedule<R1, E, A1>>,
      orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
      __tsplusTrace?: string
    ): Effect<R & R1 & R2, E2, A | A2>;
  };

  readonly retryOrElseEither: {
    <R, E, A, S, R1, A1, R2, E2, A2>(
      effect0: LazyArg<Effect<R, E, A>>,
      schedule0: LazyArg<Schedule.WithState<S, R1, E, A1>>,
      orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
      __tsplusTrace?: string
    ): Effect<R & R1 & R2, E2, Either<A2, A>>;
    <R, E, A, R1, A1, R2, E2, A2>(
      effect0: LazyArg<Effect<R, E, A>>,
      schedule0: LazyArg<Schedule<R1, E, A1>>,
      orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
      __tsplusTrace?: string
    ): Effect<R & R1 & R2, E2, Either<A2, A>>;
  };

  readonly schedule: {
    <R, E, A, S, R1, A1>(
      effect0: LazyArg<Effect<R, E, A>>,
      schedule0: LazyArg<Schedule.WithState<S, R1, unknown, A1>>,
      __tsplusTrace?: string
    ): Effect<R & R1, E, A1>;
    <R, E, A, R1, A1>(
      effect0: LazyArg<Effect<R, E, A>>,
      schedule0: LazyArg<Schedule<R1, unknown, A1>>,
      __tsplusTrace?: string
    ): Effect<R & R1, E, A1>;
  };

  readonly scheduleFrom: {
    <R, E, A, S, R1, A1>(
      effect0: LazyArg<Effect<R, E, A>>,
      a0: LazyArg<A>,
      schedule0: LazyArg<Schedule.WithState<S, R1, A, A1>>,
      __tsplusTrace?: string
    ): Effect<R & R1, E, A1>;
    <R, E, A, R1, A1>(
      effect0: LazyArg<Effect<R, E, A>>,
      a0: LazyArg<A>,
      schedule0: LazyArg<Schedule<R1, A, A1>>,
      __tsplusTrace?: string
    ): Effect<R & R1, E, A1>;
  };
}

/**
 * @tsplus type ets/Clock/Ops
 */
export interface ClockOps {}
export const Clock: ClockOps = {};

export abstract class AbstractClock implements Clock {
  readonly [ClockId]: ClockId = ClockId;

  /**
   * Get the current time in milliseconds since the Unix epoch.
   */
  abstract currentTime: UIO<number>;

  /**
   * Sleeps for the provided duration.
   */
  abstract sleep(
    duration: LazyArg<Duration>,
    __tsplusTrace?: string | undefined
  ): UIO<void>;

  driver<State, Env, In, Out>(
    schedule: Schedule.WithState<State, Env, In, Out>,
    __tsplusTrace?: string
  ): UIO<Driver<State, Env, In, Out>> {
    return Ref.make<Tuple<[Option<Out>, State]>>(
      Tuple(Option.none, schedule._initial)
    ).map((ref) => {
      const next = (input: In): Effect<Env, Option<never>, Out> =>
        Effect.Do()
          .bind("state", () => ref.get().map((_) => _.get(1)))
          .bind("now", () => this.currentTime)
          .flatMap(({ now, state }) =>
            schedule
              ._step(now, input, state)
              .flatMap(({ tuple: [state, out, decision] }) =>
                decision._tag === "Done"
                  ? ref.set(Tuple(Option.some(out), state)) > Effect.fail(Option.none)
                  : ref.set(Tuple(Option.some(out), state)) >
                    this.sleep(new Duration(decision.interval.startMillis - now)).as(
                      out
                    )
              )
          );

      const last = ref.get().flatMap(({ tuple: [option] }) =>
        option.fold(
          () => Effect.fail(new NoSuchElement()),
          (b) => Effect.succeed(b)
        )
      );
      const reset = ref.set(Tuple(Option.none, schedule._initial));

      const state = ref.get().map((_) => _.get(1));

      const driver = new Driver(next, last, reset, state);

      return driver;
    });
  }

  repeat<R, E, A, S, R1, A1>(
    effect0: LazyArg<Effect<R, E, A>>,
    schedule0: LazyArg<Schedule.WithState<S, R1, A, A1>>,
    __tsplusTrace?: string
  ): Effect<R & R1, E, A1>;
  repeat<R, E, A, R1, A1>(
    effect0: LazyArg<Effect<R, E, A>>,
    schedule0: LazyArg<Schedule<R1, A, A1>>,
    __tsplusTrace?: string
  ): Effect<R & R1, E, A1> {
    return this.repeatOrElse(effect0, schedule0, (e, _) => Effect.fail(e));
  }

  repeatOrElse<R, E, A, S, R1, A1, R2, E2, A2>(
    effect0: LazyArg<Effect<R, E, A>>,
    schedule0: LazyArg<Schedule.WithState<S, R1, A, A1>>,
    orElse: (e: E, option: Option<A1>) => Effect<R2, E2, A2>,
    __tsplusTrace?: string
  ): Effect<R & R1 & R2, E2, A1 | A2>;
  repeatOrElse<R, E, A, R1, A1, R2, E2, A2>(
    effect0: LazyArg<Effect<R, E, A>>,
    schedule0: LazyArg<Schedule<R1, A, A1>>,
    orElse: (e: E, option: Option<A1>) => Effect<R2, E2, A2>,
    __tsplusTrace?: string
  ): Effect<R & R1 & R2, E2, A1 | A2> {
    return this.repeatOrElseEither(effect0, schedule0, orElse).map((either) => either.merge());
  }

  repeatOrElseEither<R, E, A, S, R1, A1, R2, E2, A2>(
    effect0: LazyArg<Effect<R, E, A>>,
    schedule0: LazyArg<Schedule.WithState<S, R1, A, A1>>,
    orElse: (e: E, option: Option<A1>) => Effect<R2, E2, A2>,
    __tsplusTrace?: string
  ): Effect<R & R1 & R2, E2, Either<A2, A1>>;
  repeatOrElseEither<R, E, A, R1, A1, R2, E2, A2>(
    effect0: LazyArg<Effect<R, E, A>>,
    schedule0: LazyArg<Schedule<R1, A, A1>>,
    orElse: (e: E, option: Option<A1>) => Effect<R2, E2, A2>,
    __tsplusTrace?: string
  ): Effect<R & R1 & R2, E2, Either<A2, A1>> {
    return Effect.suspendSucceed(() => {
      const effect = effect0();
      const schedule = schedule0();

      return this.driver(schedule).flatMap((driver) => {
        function loop(a: A): Effect<R & R1 & R2, E2, Either<A2, A1>> {
          return driver.next(a).foldEffect(
            () => driver.last.orDie().map((b) => Either.right(b)),
            (b) =>
              effect.foldEffect(
                (e) => orElse(e, Option.some(b)).map((c) => Either.left(c)),
                (a) => loop(a)
              )
          );
        }

        return effect.foldEffect(
          (e) => orElse(e, Option.none).map((c) => Either.left(c)),
          (a) => loop(a)
        );
      });
    });
  }

  retry<R, E, A, S, R1, A1>(
    effect0: LazyArg<Effect<R, E, A>>,
    schedule0: LazyArg<Schedule.WithState<S, R1, E, A1>>,
    __tsplusTrace?: string
  ): Effect<R & R1, E, A>;
  retry<R, E, A, R1, A1>(
    effect0: LazyArg<Effect<R, E, A>>,
    schedule0: LazyArg<Schedule<R1, E, A1>>,
    __tsplusTrace?: string
  ): Effect<R & R1, E, A> {
    return this.retryOrElse(effect0, schedule0, (e, _) => Effect.fail(e));
  }

  retryOrElse<R, E, A, S, R1, A1, R2, E2, A2>(
    effect0: LazyArg<Effect<R, E, A>>,
    schedule0: LazyArg<Schedule.WithState<S, R1, E, A1>>,
    orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
    __tsplusTrace?: string
  ): Effect<R & R1 & R2, E2, A | A2>;
  retryOrElse<R, E, A, R1, A1, R2, E2, A2>(
    effect0: LazyArg<Effect<R, E, A>>,
    schedule0: LazyArg<Schedule<R1, E, A1>>,
    orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
    __tsplusTrace?: string
  ): Effect<R & R1 & R2, E2, A | A2> {
    return this.retryOrElseEither(effect0, schedule0, orElse).map((either) => either.merge());
  }

  retryOrElseEither<R, E, A, S, R1, A1, R2, E2, A2>(
    effect0: LazyArg<Effect<R, E, A>>,
    schedule0: LazyArg<Schedule.WithState<S, R1, E, A1>>,
    orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
    __tsplusTrace?: string
  ): Effect<R & R1 & R2, E2, Either<A2, A>>;
  retryOrElseEither<R, E, A, R1, A1, R2, E2, A2>(
    effect0: LazyArg<Effect<R, E, A>>,
    schedule0: LazyArg<Schedule<R1, E, A1>>,
    orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
    __tsplusTrace?: string
  ): Effect<R & R1 & R2, E2, Either<A2, A>> {
    return Effect.suspendSucceed(() => {
      const effect = effect0();
      const schedule = schedule0();

      function loop(
        driver: Driver<unknown, R1, E, A1>
      ): Effect<R & R1 & R2, E2, Either<A2, A>> {
        return effect
          .map((a) => Either.right(a))
          .catchAll((e) =>
            driver.next(e).foldEffect(
              () =>
                driver.last
                  .orDie()
                  .flatMap((a2) => orElse(e, a2).map((b) => Either.left(b))),
              () => loop(driver)
            )
          );
      }

      return this.driver(schedule).flatMap(loop);
    });
  }

  schedule<R, E, A, S, R1, E1, A1>(
    effect0: LazyArg<Effect<R, E, A>>,
    schedule0: LazyArg<Schedule.WithState<S, R1, any, A1>>,
    __tsplusTrace?: string
  ): Effect<R & R1, E, A1>;
  schedule<R, E, A, R1, A1>(
    effect0: LazyArg<Effect<R, E, A>>,
    schedule0: LazyArg<Schedule<R1, any, A1>>,
    __tsplusTrace?: string
  ): Effect<R & R1, E, A1> {
    return this.scheduleFrom(effect0, undefined, schedule0);
  }

  scheduleFrom<R, E, A, S, R1, A1>(
    effect0: LazyArg<Effect<R, E, A>>,
    a0: LazyArg<A>,
    schedule0: LazyArg<Schedule.WithState<S, R1, A, A1>>,
    __tsplusTrace?: string
  ): Effect<R & R1, E, A1>;
  scheduleFrom<R, E, A, R1, A1>(
    effect0: LazyArg<Effect<R, E, A>>,
    a0: LazyArg<A>,
    schedule0: LazyArg<Schedule<R1, A, A1>>,
    __tsplusTrace?: string
  ): Effect<R & R1, E, A1> {
    return Effect.suspendSucceed(() => {
      const effect = effect0();
      const a = a0();
      const schedule = schedule0();

      return this.driver(schedule).flatMap((driver) => {
        function loop(a: A): Effect<R & R1, E, A1> {
          return driver.next(a).foldEffect(
            () => driver.last.orDie(),
            () => effect.flatMap(loop)
          );
        }
        return loop(a);
      });
    });
  }
}

/**
 * Access clock from environment.
 *
 * @tsplus static ets/Clock/Ops withClockEffect
 */
export const withClockEffect = Effect.serviceWithEffect(HasClock);

/**
 * Access clock from environment.
 *
 * @tsplus static ets/Clock/Ops withClock
 */
export const withClock = Effect.serviceWith(HasClock);

/**
 * Returns the current time, relative to the Unix epoch.
 *
 * @tsplus static ets/Clock/Ops currentTime
 */
export const currentTime = Effect.serviceWithEffect(HasClock)(
  (clock) => clock.currentTime
);

/**
 * Sleeps for the provided duration.
 *
 * @tsplus static ets/Clock/Ops sleep
 */
export function sleep(
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Effect<HasClock, never, void> {
  return Effect.serviceWithEffect(HasClock)((clock) => clock.sleep(duration));
}

/**
 * Returns a driver that can be used to step the schedule, appropriately
 * handling sleeping.
 *
 * @tsplus static ets/Clock/Ops driver
 */
export function driver<State, Env, In, Out>(
  schedule: Schedule.WithState<State, Env, In, Out>,
  __tsplusTrace?: string
): Effect<HasClock, never, Driver<State, Env, In, Out>> {
  return Effect.serviceWithEffect(HasClock)((clock) => clock.driver(schedule));
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure. Scheduled recurrences are in addition
 * to the first execution, so that `io.repeat(Schedule.once)` yields an effect
 * that executes `io`, and then if that succeeds, executes `io` an additional
 * time.
 *
 * @tsplus static ets/Clock/Ops repeat
 */
export function repeat<R, E, A, S, R1, B>(
  effect0: LazyArg<Effect<R, E, A>>,
  schedule0: LazyArg<Schedule.WithState<S, R1, A, B>>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1, E, B>;
export function repeat<R, E, A, R1, B>(
  effect0: LazyArg<Effect<R, E, A>>,
  schedule0: LazyArg<Schedule<R1, A, B>>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1, E, B> {
  return Effect.serviceWithEffect(HasClock)((clock) => clock.repeat(effect0, schedule0));
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value and
 * schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then if
 * that succeeds, executes `io` an additional time.
 *
 * @tsplus static ets/Clock/Ops repeatOrElse
 */
export function repeatOrElse<R, E, A, S, R1, A1, R2, E2, A2>(
  effect0: LazyArg<Effect<R, E, A>>,
  schedule0: LazyArg<Schedule.WithState<S, R1, A, A1>>,
  orElse: (e: E, option: Option<A1>) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<R & R1 & R2, E2, A1 | A2>;
export function repeatOrElse<R, E, A, R1, A1, R2, E2, A2>(
  effect0: LazyArg<Effect<R, E, A>>,
  schedule0: LazyArg<Schedule<R1, A, A1>>,
  orElse: (e: E, option: Option<A1>) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1 & R2, E2, A1 | A2> {
  return Effect.serviceWithEffect(HasClock)((clock) => clock.repeatOrElse(effect0, schedule0, orElse));
}

/**
 * Returns a new effect that repeats this effect according to the specified
 * schedule or until the first failure, at which point, the failure value and
 * schedule output are passed to the specified handler.
 *
 * Scheduled recurrences are in addition to the first execution, so that
 * `io.repeat(Schedule.once)` yields an effect that executes `io`, and then if
 * that succeeds, executes `io` an additional time.
 *
 * @tsplus static ets/Clock/Ops repeatOrElseEither
 */
export function repeatOrElseEither<R, E, A, S, R1, A1, R2, E2, A2>(
  effect0: LazyArg<Effect<R, E, A>>,
  schedule0: LazyArg<Schedule.WithState<S, R1, A, A1>>,
  orElse: (e: E, option: Option<A1>) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1 & R2, E2, Either<A2, A1>>;
export function repeatOrElseEither<R, E, A, R1, A1, R2, E2, A2>(
  effect0: LazyArg<Effect<R, E, A>>,
  schedule0: LazyArg<Schedule<R1, A, A1>>,
  orElse: (e: E, option: Option<A1>) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1 & R2, E2, Either<A2, A1>> {
  return Effect.serviceWithEffect(HasClock)((clock) => clock.repeatOrElseEither(effect0, schedule0, orElse));
}

/**
 * Retries with the specified retry policy. Retries are done following the
 * failure of the original `io` (up to a fixed maximum with `once` or `recurs`
 * for example), so that that `io.retry(Schedule.once)` means "execute `io`
 * and in case of failure, try again once".
 *
 * @tsplus static ets/Clock/Ops retry
 */
export function retry<R, E, A, S, R1, A1>(
  effect0: LazyArg<Effect<R, E, A>>,
  schedule0: LazyArg<Schedule.WithState<S, R1, E, A1>>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1, E, A>;
export function retry<R, E, A, R1, A1>(
  effect0: LazyArg<Effect<R, E, A>>,
  schedule0: LazyArg<Schedule<R1, E, A1>>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1, E, A> {
  return Effect.serviceWithEffect(HasClock)((clock) => clock.retry(effect0, schedule0));
}

/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 *
 * @tsplus static ets/Clock/Ops retryOrElse
 */
export function retryOrElse<R, E, A, S, R1, A1, R2, E2, A2>(
  effect0: LazyArg<Effect<R, E, A>>,
  schedule0: LazyArg<Schedule.WithState<S, R1, E, A1>>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1 & R2, E2, A | A2>;
export function retryOrElse<R, E, A, R1, A1, R2, E2, A2>(
  effect0: LazyArg<Effect<R, E, A>>,
  schedule0: LazyArg<Schedule<R1, E, A1>>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1 & R2, E2, A | A2> {
  return Effect.serviceWithEffect(HasClock)((clock) => clock.retryOrElse(effect0, schedule0, orElse));
}

/**
 * Returns an effect that retries this effect with the specified schedule when
 * it fails, until the schedule is done, then both the value produced by the
 * schedule together with the last error are passed to the specified recovery
 * function.
 *
 * @tsplus static ets/Clock/Ops retryOrElseEither
 */
export function retryOrElseEither<R, E, A, S, R1, A1, R2, E2, A2>(
  effect0: LazyArg<Effect<R, E, A>>,
  schedule0: LazyArg<Schedule.WithState<S, R1, E, A1>>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1 & R2, E2, Either<A2, A>>;
export function retryOrElseEither<R, E, A, R1, A1, R2, E2, A2>(
  effect0: LazyArg<Effect<R, E, A>>,
  schedule0: LazyArg<Schedule<R1, E, A1>>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1 & R2, E2, Either<A2, A>> {
  return Effect.serviceWithEffect(HasClock)((clock) => clock.retryOrElseEither(effect0, schedule0, orElse));
}

/**
 * Runs this effect according to the specified schedule.
 *
 * See `scheduleFrom` for a variant that allows the schedule's decision to
 * depend on the result of this effect.
 *
 * @tsplus static ets/Clock/Ops schedule
 */
export function schedule<R, E, A, S, R1, A1>(
  effect0: LazyArg<Effect<R, E, A>>,
  schedule0: LazyArg<Schedule.WithState<S, R1, any, A1>>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1, E, A1>;
export function schedule<R, E, A, R1, A1>(
  effect0: LazyArg<Effect<R, E, A>>,
  schedule0: LazyArg<Schedule<R1, any, A1>>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1, E, A1> {
  return Effect.serviceWithEffect(HasClock)((clock) => clock.schedule(effect0, schedule0));
}

/**
 * Runs this effect according to the specified schedule starting from the
 * specified input value.
 *
 * @tsplus static ets/Clock/Ops scheduleFrom
 */
export function scheduleFrom<R, E, A, S, R1, A1>(
  effect0: LazyArg<Effect<R, E, A>>,
  a0: LazyArg<A>,
  schedule0: LazyArg<Schedule.WithState<S, R1, A, A1>>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1, E, A1>;
export function scheduleFrom<R, E, A, R1, A1>(
  effect0: LazyArg<Effect<R, E, A>>,
  a0: LazyArg<A>,
  schedule0: LazyArg<Schedule<R1, A, A1>>,
  __tsplusTrace?: string
): Effect<HasClock & R & R1, E, A1> {
  return Effect.serviceWithEffect(HasClock)((clock) => clock.scheduleFrom(effect0, a0, schedule0));
}
