describe.concurrent("Effect", () => {
  describe.concurrent("schedule", () => {
    it("runs effect for each recurrence of the schedule", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<List<number>>(List.empty()))
        .bindValue("effect", ({ ref }) => Clock.currentTime.flatMap((n) => ref.update((list) => list.prepend(n))))
        .bindValue(
          "schedule",
          () => Schedule.spaced((10).millis) && Schedule.recurs(5)
        )
        .tap(({ effect, schedule }) => effect.schedule(schedule))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result.length(), 5)
    })
  })
})
