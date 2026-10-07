/**
 * Type-feedback pollution run before a workload is warmed up.
 *
 * A fresh process that only runs one workload lets V8 specialise the
 * interpreter's shared call and property sites for a handful of primitive
 * kinds. Applications run many kinds, which makes those sites polymorphic or
 * megamorphic. Running this mix first gives every measured workload realistic
 * type feedback, so optimizations that only help monomorphic sites do not look
 * better than they are.
 */
import type { EffectModule } from "./workloads.ts"

export const pollute = async (E: EffectModule, rounds = 100): Promise<void> => {
  const { Context, Deferred, Effect, Fiber, Queue } = E
  const Service = Context.Service<{ readonly value: number }>("bench/fiber/Pollute")
  const traced = Effect.fn("bench/fiber/pollute")(function*(n: number) {
    return yield* Effect.succeed(n)
  })
  const programs: Array<any> = [
    Effect.sync(() => 1).pipe(
      Effect.map((n) => n + 1),
      Effect.flatMap((n) => Effect.succeed(n)),
      Effect.tap(() => Effect.void),
      Effect.andThen(Effect.succeed(2)),
      Effect.as(3),
      Effect.asVoid
    ),
    Effect.gen(function*() {
      const a = yield* Effect.succeed(1)
      const b = yield* Effect.sync(() => a + 1)
      return yield* Effect.suspend(() => Effect.succeed(a + b))
    }),
    Effect.suspend(() => Effect.fail("error")).pipe(Effect.catch(() => Effect.succeed(0))),
    Effect.die("defect").pipe(Effect.catchCause(() => Effect.void)),
    Effect.succeed(1).pipe(Effect.ensuring(Effect.void), Effect.onExit(() => Effect.void)),
    Effect.fail("error").pipe(Effect.ensuring(Effect.void), Effect.exit),
    Effect.uninterruptible(Effect.succeed(1)),
    Effect.uninterruptibleMask((restore) => restore(Effect.succeed(1))),
    Effect.yieldNow,
    Effect.callback<number>((resume) => {
      queueMicrotask(() => resume(Effect.succeed(1)))
    }),
    Effect.promise(() => Promise.resolve(1)),
    Effect.forkChild(Effect.succeed(1)).pipe(Effect.flatMap(Fiber.join)),
    Effect.race(Effect.never, Effect.succeed(1)),
    Effect.timeout(Effect.succeed(1), "1 second"),
    Effect.forEach([1, 2, 3], (n) => Effect.succeed(n), { concurrency: 2 }),
    Effect.all([Effect.succeed(1), Effect.yieldNow], { concurrency: "unbounded" }),
    Effect.provideService(Effect.service(Service), Service, { value: 1 }),
    Effect.withSpan(Effect.succeed(1), "bench/fiber/pollute-span"),
    traced(1),
    Effect.scoped(Effect.acquireRelease(Effect.succeed(1), () => Effect.void)),
    Effect.flatMap(Queue.unbounded<number>(), (queue) => Effect.andThen(Queue.offer(queue, 1), Queue.take(queue))),
    Effect.flatMap(
      Deferred.make<number>(),
      (deferred) => Effect.andThen(Deferred.succeed(deferred, 1), Deferred.await(deferred))
    )
  ]
  for (let i = 0; i < rounds; i++) {
    for (const program of programs) {
      await Effect.runPromise(program)
    }
  }
}
