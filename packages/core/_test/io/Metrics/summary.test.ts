const labels = Chunk(MetricLabel("x", "a"), MetricLabel("y", "b"));

describe.concurrent("Metrics", () => {
  describe.concurrent("Summary", () => {
    it("custom observe as aspect", async () => {
      const summary = Metric
        .summary("s1", (1).minutes, 10, 0, Chunk(0, 1, 10))
        .taggedWithLabels(labels);

      const program = Effect.succeed(1)(summary) >
        Effect.succeed(3)(summary) >
        summary.value();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.count, 2);
      assert.strictEqual(result.sum, 4);
      assert.strictEqual(result.min, 1);
      assert.strictEqual(result.max, 3);
    });

    it("direct observe", async () => {
      const summary = Metric
        .summary("s2", (1).minutes, 10, 0, Chunk(0, 1, 10))
        .taggedWithLabels(labels);

      const program = summary.update(1) > summary.update(3) > summary.value();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.count, 2);
      assert.strictEqual(result.sum, 4);
      assert.strictEqual(result.min, 1);
      assert.strictEqual(result.max, 3);
    });

    it("custom observe with contramap", async () => {
      const summary = Metric
        .summary("s3", (1).minutes, 10, 0, Chunk(0, 1, 10))
        .taggedWithLabels(labels)
        .contramap((s: string) => s.length);

      const program = Effect.succeed("x")(summary) >
        Effect.succeed("xyz")(summary) >
        summary.value();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.count, 2);
      assert.strictEqual(result.sum, 4);
      assert.strictEqual(result.min, 1);
      assert.strictEqual(result.max, 3);
    });

    it("observeSummaryWith + taggedWith", async () => {
      const base = Metric
        .summary("s4", (1).minutes, 10, 0, Chunk(0, 1, 10))
        .taggedWithLabels(labels)
        .contramap((s: string) => s.length);
      const summary = base.taggedWith((s) => HashSet(MetricLabel("dyn", s)));

      const program = Effect.succeed("x")(summary) >
        Effect.succeed("xyz")(summary) >
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
