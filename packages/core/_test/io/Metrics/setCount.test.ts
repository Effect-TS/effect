const labels = Chunk(MetricLabel("x", "a"), MetricLabel("y", "b"));

describe.concurrent("Metrics", () => {
  describe.concurrent("SetCount", () => {
    it("custom observe as aspect", async () => {
      const setCount = SetCount<string>(
        "sc1",
        "tag",
        labels,
        (metric) => (effect) => effect.tap((a) => metric.observe(a))
      );

      const program = Effect.Do()
        .tap(() => Effect.succeed("hello").apply(setCount.apply))
        .tap(() => Effect.succeed("hello").apply(setCount.apply))
        .tap(() => Effect.succeed("world").apply(setCount.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(MetricKey.SetCount("sc1", "tag", labels))
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        (result.value as MetricType.SetCount).occurrences == Chunk(
          Tuple("hello", 2),
          Tuple("world", 1)
        )
      );
    });

    it("direct observe", async () => {
      const setCount = SetCount<string>("sc2", "tag", labels, () => (effect) => effect);

      const program = Effect.Do()
        .tap(() => setCount.observe("hello"))
        .tap(() => setCount.observe("hello"))
        .tap(() => setCount.observe("world"))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(MetricKey.SetCount("sc2", "tag", labels))
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        (result.value as MetricType.SetCount).occurrences == Chunk(
          Tuple("hello", 2),
          Tuple("world", 1)
        )
      );
    });

    it("occurrences", async () => {
      const setCount = Metric.occurrences("sc3", "tag", ...labels);

      const program = Effect.Do()
        .tap(() => Effect.succeed("hello").apply((effect) => setCount.apply(effect)))
        .tap(() => Effect.succeed("hello").apply((effect) => setCount.apply(effect)))
        .tap(() => Effect.succeed("world").apply((effect) => setCount.apply(effect)))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(MetricKey.SetCount("sc3", "tag", labels))
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        (result.value as MetricType.SetCount).occurrences == Chunk(
          Tuple("hello", 2),
          Tuple("world", 1)
        )
      );
    });
  });
});
