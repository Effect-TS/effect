export const ExampleError = new Error("Oh noes!");
export const InterruptCause1 = new Error("Oh noes 1!");
export const InterruptCause2 = new Error("Oh noes 2!");
export const InterruptCause3 = new Error("Oh noes 3!");

export const ExampleErrorFail = Effect.fail(ExampleError);
export const ExampleErrorDie = Effect.die(() => {
  throw ExampleError;
});

export interface NumberService {
  readonly n: number;
}

export const NumberService = Tag<NumberService>();

export function asyncExampleError<A>(): IO<unknown, A> {
  return Effect.async((cb) => {
    cb(Effect.fail(ExampleError));
  });
}

export function asyncUnit<E>(): IO<E, void> {
  return Effect.async((cb) => {
    cb(Effect.unit);
  });
}

export function exactlyOnce<R, A, A1>(
  value: A,
  f: (_: UIO<A>) => Effect<R, string, A1>
): Effect<R, string, A1> {
  return Ref.make(0).flatMap((ref) =>
    Effect.Do()
      .bind("res", () => f(ref.update((n) => n + 1) > Effect.succeed(value)))
      .bind("count", () => ref.get())
      .tap(({ count }) => count !== 1 ? Effect.fail("Accessed more than once") : Effect.unit)
      .map(({ res }) => res)
  );
}

export function sum(n: number): number {
  if (n < 0) {
    return 0;
  }
  return n + sum(n - 1);
}

export function fib(n: number): number {
  if (n <= 1) {
    return n;
  }
  return fib(n - 1) + fib(n - 2);
}

export function concurrentFib(n: number): UIO<number> {
  if (n <= 1) {
    return Effect.succeed(n);
  }
  return Effect.Do()
    .bind("fiber1", () => concurrentFib(n - 1).fork())
    .bind("fiber2", () => concurrentFib(n - 2).fork())
    .bind("v1", ({ fiber1 }) => fiber1.join())
    .bind("v2", ({ fiber2 }) => fiber2.join())
    .map(({ v1, v2 }) => v1 + v2);
}

export function deepErrorEffect(n: number): IO<unknown, void> {
  if (n === 0) {
    return Effect.attempt(() => {
      throw ExampleError;
    });
  }
  return Effect.unit > deepErrorEffect(n - 1);
}

export function deepErrorFail(n: number): IO<unknown, void> {
  if (n === 0) {
    return Effect.fail(ExampleError);
  }
  return Effect.unit > deepErrorFail(n - 1);
}

export function deepMapEffect(n: number): UIO<number> {
  function loop(n: number, acc: UIO<number>): UIO<number> {
    if (n <= 0) {
      return acc;
    }
    return Effect.suspendSucceed(
      loop(
        n - 1,
        acc.map((n) => n + 1)
      )
    );
  }
  return loop(n, Effect.succeed(0));
}
