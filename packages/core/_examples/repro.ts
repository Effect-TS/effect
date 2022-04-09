// import type { FiberContext } from "@effect/core/io/Fiber/_internal/context";

const program = Effect.Do()
  .bind("ref", () => Ref.make(0))
  .bind("fibers", () => Ref.make(HashSet.empty<Fiber<unknown, unknown>>()))
  .bind("latch", () => Deferred.make<never, void>())
  .bindValue(
    "effect",
    ({ fibers, latch, ref }) =>
      Effect.uninterruptibleMask(({ restore }) =>
        restore(
          latch.await().tap(() => Effect.succeed(console.log("COMPLETED"))).onInterrupt(() => ref.update((n) => n + 1))
        )
          .fork()
          .tap((fiber) => fibers.update((set) => set.add(fiber)))
      )
  )
  .bindValue("awaitAll", ({ fibers }) =>
    fibers.get().flatMap((set) => {
      // console.log("Fibers", Array.from(set).map((f) => (((f as FiberContext<any, any>).state.get) as any).value));
      // console.log("Fibers", Array.from(set).map((f) => f.id()));
      return Fiber.awaitAll(set);
    }))
  .tap(({ effect }) => effect.race(effect))
  .flatMap(
    ({ awaitAll, latch, ref }) => latch.succeed(undefined) > awaitAll > ref.get()
  )
  .tap(() => Effect.sleep((1).seconds));

program.tap((n) => Effect.succeed(console.log(n))).unsafeRunPromise();
