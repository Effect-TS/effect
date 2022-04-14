describe.concurrent("Effect", () => {
  // TODO: enable after porting TestClock
  describe.concurrent("cached", () => {
    it.skip("returns new instances after duration", async () => {
      // function incrementAndGet(ref: Ref.Ref<number>): Effect.UIO<number> {
      //   return Ref.updateAndGet_(ref, (n) => n + 1)
      // }
      // const program = Effect.Do()
      //   .bind("ref", () => Ref.make(0))
      //   .bind("cache", ({ ref }) =>
      //     incrementAndGet(ref).cached(Duration.fromMinutes(60))
      //   )
      //   .bind("a", ({ cache }) => cache)
      //   .tap(() => TestClock.adjust(Duration.fromMinutes(59)))
      //   .bind("b", ({ cache }) => cache)
      //   .tap(() => TestClock.adjust(Duration.fromMinutes(1)))
      //   .bind("c", ({ cache }) => cache)
      //   .tap(() => TestClock.adjust(Duration.fromMinutes(59)))
      //   .bind("d", ({ cache }) => cache)
      // const { a, b, c, d } = await program.unsafeRunPromise()
      // expect(a).toStrictEqual(b)
      // expect(b).not.toStrictEqual(c)
      // expect(c).toStrictEqual(d)
    });

    it.skip("correctly handles an infinite duration time to live", async () => {
      // const program = Effect.Do()
      //   .bind("ref", () => Ref.make(0))
      //   .bindValue("getAndIncrement", ({ ref }) =>
      //     Ref.modify_(ref, (n) => Tuple(n, n + 1))
      //   )
      //   .bind("cached", ({ getAndIncrement }) =>
      //     getAndIncrement.cached(Duration.Infinity)
      //   )
      //   .bind("a", ({ cached }) => cached)
      //   .bind("b", ({ cached }) => cached)
      //   .bind("c", ({ cached }) => cached)
      // const { a, b, c } = await program.unsafeRunPromise()
      // expect(a).toBe(0)
      // expect(b).toBe(0)
      // expect(c).toBe(0)
    });
  });

  // TODO: enable after porting TestClock
  describe.concurrent("cachedInvalidate", () => {
    it.skip("returns new instances after duration", async () => {
      // function incrementAndGet(ref: Ref.Ref<number>): Effect.UIO<number> {
      //   return Ref.updateAndGet_(ref, (n) => n + 1)
      // }
      // const program = Effect.Do()
      //   .bind("ref", () => Ref.make(0))
      //   .bind("tuple", ({ ref }) =>
      //     incrementAndGet(ref).cachedInvalidate(Duration.fromMinutes(60))
      //   )
      //   .bindValue("cached", ({ tuple }) => tuple.get(0))
      //   .bindValue("invalidate", ({ tuple }) => tuple.get(1))
      //   .bind("a", ({ cached }) => cached)
      //   .tap(() => TestClock.adjust(Duration.fromMinutes(59)))
      //   .bind("b", ({ cached }) => cached)
      //   .tap(({ invalidate }) => invalidate)
      //   .bind("c", ({ cached }) => cached)
      //   .tap(() => TestClock.adjust(Duration.fromMinutes(1)))
      //   .bind("d", ({ cached }) => cached)
      //   .tap(() => TestClock.adjust(Duration.fromMinutes(59)))
      //   .bind("e", ({ cached }) => cached)
      // const { a, b, c, d } = await program.unsafeRunPromise()
      // expect(a).toStrictEqual(b)
      // expect(b).not.toStrictEqual(c)
      // expect(c).toStrictEqual(d)
      // expect(d).not.toStrictEqual(e)
    });
  });
});
