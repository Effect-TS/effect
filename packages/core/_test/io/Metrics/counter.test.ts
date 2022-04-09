const labels = Chunk(MetricLabel("x", "a"), MetricLabel("y", "b"));

describe.concurrent("Metrics", () => {
  describe.concurrent("Counter", () => {
    it("custom increment as aspect", async () => {
      const counter = Counter<any>(
        "c1",
        labels,
        (metric) => (effect) => effect.tap(() => metric.increment())
      );

      const program = Effect.unit
        .apply(counter.apply)
        .tap(() => Effect.unit.apply(counter.apply))
        .flatMap(() => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map((snapshots) =>
          snapshots
            .get(MetricKey.Counter("c1", labels))
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Counter(2)));
    });

    it("direct increment", async () => {
      const counter = Counter<any>("c2", labels, () => (effect) => effect);

      const program = counter
        .increment()
        .flatMap(() => counter.increment())
        .flatMap(() => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map((snapshots) =>
          snapshots
            .get(MetricKey.Counter("c2", labels))
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Counter(2)));
    });

    it("custom increment by value as aspect", async () => {
      const counter = Counter<number>(
        "c3",
        labels,
        (metric) => (effect) => effect.tap((n) => metric.increment(n))
      );

      const program = Effect.succeed(10)
        .apply(counter.apply)
        .flatMap(() => Effect.succeed(5).apply(counter.apply))
        .flatMap(() => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map((snapshots) =>
          snapshots
            .get(MetricKey.Counter("c3", labels))
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Counter(15)));
    });

    it("direct increment by value", async () => {
      const counter = Counter<number>("c4", labels, () => (effect) => effect);

      const program = counter
        .increment(10)
        .flatMap(() => counter.increment(5))
        .flatMap(() => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map((snapshots) =>
          snapshots
            .get(MetricKey.Counter("c3", labels))
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Counter(15)));
    });

    it("count", async () => {
      const program = Effect.Do()
        .tap(() => Effect.unit.apply(Metric.count("c5", ...labels).apply))
        .tap(() => Effect.unit.apply(Metric.count("c5", ...labels).apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Counter("c5", labels))
            .map((snapshot) => snapshot.details))
        .bind("value", () => Metric.count("c5", ...labels).count());

      const { result, value } = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Counter(2)));
      assert.strictEqual(value, 2);
    });

    it("countValue", async () => {
      const program = Effect.Do()
        .tap(() => Effect.succeed(10).apply(Metric.countValue("c6", ...labels).apply))
        .tap(() => Effect.succeed(5).apply(Metric.countValue("c6", ...labels).apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Counter("c6", labels))
            .map((snapshot) => snapshot.details))
        .bind("value", () => Metric.count("c6", ...labels).count());

      const { result, value } = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Counter(15)));
      assert.strictEqual(value, 15);
    });

    it("countValueWith", async () => {
      const counter = Metric.countValueWith("c7", ...labels)((s: string) => s.length);
      const program = Effect.Do()
        .tap(() => Effect.succeed("hello").apply(counter.apply))
        .tap(() => Effect.succeed("!").apply(counter.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Counter("c7", labels))
            .map((snapshot) => snapshot.details))
        .bind("value", () => Metric.count("c7", ...labels).count());

      const { result, value } = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Counter(6)));
      assert.strictEqual(value, 6);
    });

    it("countErrors", async () => {
      const counter = Metric.countErrors("c8");
      const program = Effect.Do()
        .tap(() =>
          (
            Effect.unit.apply(counter.apply) > Effect.fail("error").apply(counter.apply)
          ).ignore()
        )
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue(
          "result",
          ({ snapshots }) => snapshots.get(MetricKey.Counter("c8")).map((snapshot) => snapshot.details)
        )
        .bind("value", () => counter.count());

      const { result, value } = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Counter(1)));
      assert.strictEqual(value, 1);
    });

    it("countValueWith + copy", async () => {
      const counter = Metric.countValueWith(
        "c9",
        ...labels
      )((s: string) => s.length).copy({ name: "c9c", tags: Chunk.empty() });
      const program = Effect.Do()
        .tap(() => Effect.succeed("hello").apply(counter.apply))
        .tap(() => Effect.succeed("!").apply(counter.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Counter("c9", labels))
            .map((snapshot) => snapshot.details))
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Counter("c9c", Chunk.empty()))
            .map((snapshot) => snapshot.details))
        .bind("value", () => counter.count());

      const { result0, result1, value } = await program.unsafeRunPromise();

      assert.isTrue(result0 == Option.some(MetricType.Counter(0)));
      assert.isTrue(result1 == Option.some(MetricType.Counter(6)));
      assert.strictEqual(value, 6);
      assert.strictEqual(counter.name, "c9c");
    });

    it("count + taggedWith", async () => {
      const counter = Metric.count("c10", MetricLabel("static", "0")).taggedWith((a) =>
        typeof a === "string" ? Chunk.single(MetricLabel("dyn", a)) : Chunk.empty()
      );

      const program = Effect.Do()
        .tap(() => Effect.succeed("hello").apply(counter.apply))
        .tap(() => Effect.succeed("!").apply(counter.apply))
        .tap(() => Effect.succeed("!").apply(counter.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Counter(
                "c10",
                Chunk(MetricLabel("static", "0"), MetricLabel("dyn", "!"))
              )
            )
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Counter(2)));
    });

    it("count + taggedWith referential transparency", async () => {
      const counter1 = Metric.count("c11", MetricLabel("static", "0"));
      const counter2 = counter1.taggedWith((a) =>
        typeof a === "string" ? Chunk.single(MetricLabel("dyn", a)) : Chunk.empty()
      );

      const program = Effect.Do()
        .tap(() => Effect.succeed("!").apply(counter2.apply))
        .tap(() => Effect.succeed("hello").apply(counter1.apply))
        .tap(() => Effect.succeed("!").apply(counter1.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Counter("c11", Chunk(MetricLabel("static", "0"))))
            .map((snapshot) => snapshot.details))
        .bindValue("result2", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Counter(
                "c11",
                Chunk(MetricLabel("static", "0"), MetricLabel("dyn", "!"))
              )
            )
            .map((snapshot) => snapshot.details));

      const { result1, result2 } = await program.unsafeRunPromise();

      assert.isTrue(result1 == Option.some(MetricType.Counter(2)));
      assert.isTrue(result2 == Option.some(MetricType.Counter(1)));
    });
  });
});
