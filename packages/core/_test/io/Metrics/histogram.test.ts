const labels = Chunk(MetricLabel("x", "a"), MetricLabel("y", "b"));

describe.concurrent("Metrics", () => {
  describe.concurrent("Histogram", () => {
    it("custom observe as aspect", async () => {
      const boundaries = Metric.Histogram.Boundaries.linear(0, 1, 10);
      const histogram = Metric.histogram("h1", boundaries).taggedWithLabels(labels);

      const program = Effect.succeed(1)(histogram) >
        Effect.succeed(3)(histogram) >
        histogram.value();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.count, 2);
      assert.strictEqual(result.sum, 4);
      assert.strictEqual(result.min, 1);
      assert.strictEqual(result.max, 3);
    });

    it("direct observe", async () => {
      const boundaries = Metric.Histogram.Boundaries.linear(0, 1, 10);
      const histogram = Metric.histogram("h2", boundaries).taggedWithLabels(labels);

      const program = histogram.update(1) > histogram.update(3) > histogram.value();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.count, 2);
      assert.strictEqual(result.sum, 4);
      assert.strictEqual(result.min, 1);
      assert.strictEqual(result.max, 3);
    });

    it("observe durations", async () => {
      const boundaries = Metric.Histogram.Boundaries.linear(0, 1, 10);
      const histogram = Metric
        .histogram("h3", boundaries)
        .taggedWithLabels(labels)
        .contramap((duration: Duration) => duration.millis / 1000);

      // NOTE: observeDurations always uses real clock
      const program = Effect.Do()
        .bind("start", () => Effect.attempt(Date.now()))
        .tap(() => Clock.sleep((100).millis)(histogram.trackDuration))
        .tap(() => Clock.sleep((300).millis)(histogram.trackDuration))
        .bind("end", () => Effect.attempt(Date.now()))
        .bindValue("elapsed", ({ end, start }) => end - start)
        .bind("state", () => histogram.value());

      const { elapsed, state } = await program.unsafeRunPromise();

      assert.strictEqual(state.count, 2);
      assert.isAbove(state.sum, 0.39);
      assert.isAtMost(state.sum, elapsed);
      assert.isAtLeast(state.min, 0.1);
      assert.isBelow(state.min, state.max);
      assert.isAtLeast(state.max, 0.3);
      assert.isBelow(state.max, elapsed);
    });

    it("custom observe with contramap", async () => {
      const boundaries = Metric.Histogram.Boundaries.linear(0, 1, 10);
      const histogram = Metric
        .histogram("h4", boundaries)
        .taggedWithLabels(labels)
        .contramap((s: string) => s.length);

      const program = Effect.succeed("x")(histogram) >
        Effect.succeed("xyz")(histogram) >
        histogram.value();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.count, 2);
      assert.strictEqual(result.sum, 4);
      assert.strictEqual(result.min, 1);
      assert.strictEqual(result.max, 3);
    });

    it("observe + taggedWith", async () => {
      const boundaries = Metric.Histogram.Boundaries.linear(0, 1, 10);
      const base = Metric
        .histogram("h5", boundaries)
        .taggedWithLabels(labels)
        .contramap((s: string) => s.length);
      const histogram = base.taggedWith((s) => HashSet(MetricLabel("dyn", s)));

      const program = Effect.succeed("x")(histogram) >
        Effect.succeed("xyz")(histogram) >
        Effect.struct({
          r0: base.value(),
          r1: base.tagged("dyn", "x").value(),
          r2: base.tagged("dyn", "xyz").value()
        });

      const { r0, r1, r2 } = await program.unsafeRunPromise();

      assert.strictEqual(r0.count, 0);
      assert.strictEqual(r1.count, 1);
      assert.strictEqual(r2.count, 1);
    });
  });
});
