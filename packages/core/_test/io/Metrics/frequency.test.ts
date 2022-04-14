const labels = Chunk(MetricLabel("x", "a"), MetricLabel("y", "b"));

describe.concurrent("Metrics", () => {
  describe.concurrent("Frequency", () => {
    it("custom occurrences as aspect", async () => {
      const frequency = Metric.frequency("f1").taggedWithLabels(labels);

      const program = Effect.succeed("hello")(frequency.apply) >
        Effect.succeed("hello")(frequency.apply) >
        Effect.succeed("world")(frequency.apply) >
        frequency.value();

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        result.occurrences == HashMap(
          Tuple("hello", 2),
          Tuple("world", 1)
        )
      );
    });

    it("direct occurrences", async () => {
      const frequency = Metric.frequency("f2").taggedWithLabels(labels);

      const program = frequency.update("hello") >
        frequency.update("hello") >
        frequency.update("world") >
        frequency.value();

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        result.occurrences == HashMap(
          Tuple("hello", 2),
          Tuple("world", 1)
        )
      );
    });

    it("custom occurrences with contramap", async () => {
      const frequency = Metric
        .frequency("f3")
        .taggedWithLabels(labels)
        .contramap((n: number) => n.toString());

      const program = Effect.succeed(1)(frequency.apply) >
        Effect.succeed(1)(frequency.apply) >
        Effect.succeed(100)(frequency.apply) >
        frequency.value();

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        result.occurrences == HashMap(
          Tuple("1", 2),
          Tuple("100", 1)
        )
      );
    });

    it("occurences + taggedWith", async () => {
      const base = Metric.frequency("f4").taggedWithLabels(labels);
      const frequency = base.taggedWith((s: string) => HashSet(MetricLabel("dyn", s)));

      const program = Effect.succeed("hello")(frequency.apply) >
        Effect.succeed("hello")(frequency.apply) >
        Effect.succeed("world")(frequency.apply) >
        Effect.struct({
          r0: base.value(),
          r1: base.tagged("dyn", "hello").value(),
          r2: base.tagged("dyn", "world").value()
        });

      const { r0, r1, r2 } = await program.unsafeRunPromise();

      assert.isTrue(r0.occurrences.isEmpty());
      assert.isTrue(r1.occurrences == HashMap(Tuple("hello", 2)));
      assert.isTrue(r2.occurrences == HashMap(Tuple("world", 1)));
    });
  });
});
