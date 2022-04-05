const labels = Chunk(MetricLabel("x", "a"), MetricLabel("y", "b"));

describe.concurrent("Metrics", () => {
  describe.concurrent("Summary", () => {
    it("custom observe as aspect", async () => {
      const summary = Summary<number>(
        "s1",
        10,
        (1).minutes,
        0,
        Chunk(0, 1, 10),
        labels,
        (metric) => (effect) => effect.tap((n) => metric.observe(n))
      );

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(summary.apply))
        .tap(() => Effect.succeed(3).apply(summary.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary.name,
                summary.maxSize,
                summary.maxAge,
                summary.error,
                summary.quantiles,
                summary.tags
              )
            )
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.strictEqual((result.value as MetricType.Summary).count, 2);
      assert.strictEqual((result.value as MetricType.Summary).sum, 4);
    });

    it("direct observe", async () => {
      const summary = Summary<number>(
        "s2",
        10,
        (1).minutes,
        0,
        Chunk(0, 1, 10),
        labels,
        () => (effect) => effect
      );

      const program = Effect.Do()
        .tap(() => summary.observe(1))
        .tap(() => summary.observe(3))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary.name,
                summary.maxSize,
                summary.maxAge,
                summary.error,
                summary.quantiles,
                summary.tags
              )
            )
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.strictEqual((result.value as MetricType.Summary).count, 2);
      assert.strictEqual((result.value as MetricType.Summary).sum, 4);
    });

    it("observeSummary", async () => {
      const summary = Metric.observeSummary(
        "s3",
        10,
        (1).minutes,
        0,
        Chunk(0, 1, 10),
        ...labels
      );

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(summary.apply))
        .tap(() => Effect.succeed(3).apply(summary.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary.name,
                summary.maxSize,
                summary.maxAge,
                summary.error,
                summary.quantiles,
                summary.tags
              )
            )
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.strictEqual((result.value as MetricType.Summary).count, 2);
      assert.strictEqual((result.value as MetricType.Summary).sum, 4);
    });

    it("observeSummaryWith", async () => {
      const summary = Metric.observeSummaryWith(
        "s4",
        10,
        (1).minutes,
        0,
        Chunk(0, 1, 10),
        ...labels
      )((s: string) => s.length);

      const program = Effect.Do()
        .tap(() => Effect.succeed("x").apply(summary.apply))
        .tap(() => Effect.succeed("xyz").apply(summary.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary.name,
                summary.maxSize,
                summary.maxAge,
                summary.error,
                summary.quantiles,
                summary.tags
              )
            )
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.strictEqual((result.value as MetricType.Summary).count, 2);
      assert.strictEqual((result.value as MetricType.Summary).sum, 4);
    });

    it("observeSummaryWith + copy", async () => {
      const summary = Metric.observeSummaryWith(
        "s5",
        10,
        (1).minutes,
        0,
        Chunk(0, 1, 10),
        ...labels
      )((s: string) => s.length).copy({ name: "s5c", tags: Chunk.empty() });

      const program = Effect.Do()
        .tap(() => Effect.succeed("x").apply(summary.apply))
        .tap(() => Effect.succeed("xyz").apply(summary.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                "s5",
                summary.maxSize,
                summary.maxAge,
                summary.error,
                summary.quantiles,
                labels
              )
            )
            .map((snapshot) => snapshot.details))
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                "s5c",
                summary.maxSize,
                summary.maxAge,
                summary.error,
                summary.quantiles,
                Chunk.empty()
              )
            )
            .map((snapshot) => snapshot.details));

      const { result0, result1 } = await program.unsafeRunPromise();

      assert.strictEqual((result0.value as MetricType.Summary).count, 0);
      assert.strictEqual((result1.value as MetricType.Summary).count, 2);
      assert.strictEqual((result1.value as MetricType.Summary).sum, 4);
    });

    it("observeSummaryWith + taggedWith", async () => {
      const summary0 = Metric.observeSummaryWith(
        "s6",
        10,
        (1).minutes,
        0,
        Chunk(0, 1, 10),
        ...labels
      )((s: string) => s.length);
      const summary = summary0.taggedWith((s) => Chunk.single(MetricLabel("dyn", s)));

      const program = Effect.Do()
        .tap(() => Effect.succeed("x").apply(summary.apply))
        .tap(() => Effect.succeed("xyz").apply(summary.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary0.name,
                summary0.maxSize,
                summary0.maxAge,
                summary0.error,
                summary0.quantiles,
                labels
              )
            )
            .map((snapshot) => snapshot.details))
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary0.name,
                summary0.maxSize,
                summary0.maxAge,
                summary0.error,
                summary0.quantiles,
                labels.append(MetricLabel("dyn", "x"))
              )
            )
            .map((snapshot) => snapshot.details))
        .bindValue("result2", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary0.name,
                summary0.maxSize,
                summary0.maxAge,
                summary0.error,
                summary0.quantiles,
                labels.append(MetricLabel("dyn", "xyz"))
              )
            )
            .map((snapshot) => snapshot.details));

      const { result0, result1, result2 } = await program.unsafeRunPromise();

      assert.strictEqual((result0.value as MetricType.Summary).count, 0);
      assert.strictEqual((result1.value as MetricType.Summary).count, 1);
      assert.strictEqual((result2.value as MetricType.Summary).count, 1);
    });

    it("observeSummaryWith + taggedWith referential transparency", async () => {
      const summary0 = Metric.observeSummaryWith(
        "s7",
        10,
        (1).minutes,
        0,
        Chunk(0, 1, 10),
        ...labels
      )((s: string) => s.length);
      const summary = summary0.taggedWith((s) => Chunk.single(MetricLabel("dyn", s)));

      const program = Effect.Do()
        .tap(() => Effect.succeed("x").apply(summary.apply))
        .tap(() => Effect.succeed("xyz").apply(summary0.apply))
        .tap(() => Effect.succeed("xyz").apply(summary.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary0.name,
                summary0.maxSize,
                summary0.maxAge,
                summary0.error,
                summary0.quantiles,
                labels
              )
            )
            .map((snapshot) => snapshot.details))
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary0.name,
                summary0.maxSize,
                summary0.maxAge,
                summary0.error,
                summary0.quantiles,
                labels.append(MetricLabel("dyn", "x"))
              )
            )
            .map((snapshot) => snapshot.details))
        .bindValue("result2", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary0.name,
                summary0.maxSize,
                summary0.maxAge,
                summary0.error,
                summary0.quantiles,
                labels.append(MetricLabel("dyn", "xyz"))
              )
            )
            .map((snapshot) => snapshot.details));

      const { result0, result1, result2 } = await program.unsafeRunPromise();

      assert.strictEqual((result0.value as MetricType.Summary).count, 1);
      assert.strictEqual((result1.value as MetricType.Summary).count, 1);
      assert.strictEqual((result2.value as MetricType.Summary).count, 1);
    });
  });
});
