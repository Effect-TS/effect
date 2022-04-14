const labels = Chunk(MetricLabel("x", "a"), MetricLabel("y", "b"));

describe.concurrent("Metrics", () => {
  describe.concurrent("Counter", () => {
    it("custom increment as aspect", async () => {
      const counter = Metric.counter("c1").taggedWithLabels(labels).fromConst(1);

      const program = Effect.unit(counter) >
        Effect.unit(counter) >
        counter.value();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == MetricState.Counter(2));
    });

    it("direct increment", async () => {
      const counter = Metric.counter("c2").taggedWithLabels(labels);

      const program = counter.increment() > counter.increment() > counter.value();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == MetricState.Counter(2));
    });

    it("custom increment by value as aspect", async () => {
      const counter = Metric.counter("c3").taggedWithLabels(labels);

      const program = Effect.succeed(10)(counter) >
        Effect.succeed(5)(counter) >
        counter.value();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == MetricState.Counter(15));
    });

    it("direct increment referential transparency", async () => {
      const program = Effect.unit(Metric.counter("c4").taggedWithLabels(labels).fromConst(1)) >
        Effect.unit(Metric.counter("c4").taggedWithLabels(labels).fromConst(1)) >
        Metric.counter("c4").taggedWithLabels(labels).value();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == MetricState.Counter(2));
    });

    it("custom increment referential transparency", async () => {
      const program = Effect.succeed(10)(Metric.counter("c5").taggedWithLabels(labels)) >
        Effect.succeed(5)(Metric.counter("c5").taggedWithLabels(labels)) >
        Metric.counter("c5").taggedWithLabels(labels).value();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == MetricState.Counter(15));
    });

    it("custom increment with contramap", async () => {
      const program = Effect.succeed("hello")(
        Metric
          .counter("c6")
          .taggedWithLabels(labels)
          .contramap((input: string) => input.length)
      ) >
        Effect.succeed("!")(
          Metric
            .counter("c6")
            .taggedWithLabels(labels)
            .contramap((input: string) => input.length)
        )
        > Metric.counter("c6").taggedWithLabels(labels).value();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == MetricState.Counter(6));
    });

    it("counts errors", async () => {
      const counter = Metric.counter("c7").fromConst(1);

      const program = (
        Effect.unit(counter) >
          Effect.fail("error")(counter)
      ).ignore() > counter.value();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == MetricState.Counter(1));
    });

    it("count + taggedWith", async () => {
      const base = Metric.counter("c8").tagged("static", "0").fromConst(1);
      const counter = base.taggedWith((input: string) => HashSet(MetricLabel("dyn", input)));

      const program = Effect.succeed("hello")(counter) >
        Effect.succeed("!")(counter) >
        Effect.succeed("!")(counter) >
        base.tagged("dyn", "!").value();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == MetricState.Counter(2));
    });
  });
});
