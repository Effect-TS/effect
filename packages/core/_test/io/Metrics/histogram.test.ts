const labels = Chunk(MetricLabel("x", "a"), MetricLabel("y", "b"));

describe.concurrent("Metrics", () => {
  describe.concurrent("Histogram", () => {
    it("custom observe as aspect", async () => {
      const histogram = Histogram<number>(
        "h1",
        Boundaries.linear(0, 1, 10),
        labels,
        (metric) => (effect) => effect.tap((n) => metric.observe(n))
      );

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(histogram.apply))
        .tap(() => Effect.succeed(3).apply(histogram.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(histogram.name, histogram.boundaries, histogram.tags)
            )
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.strictEqual((result.value as MetricType.Histogram).count, 2);
      assert.strictEqual((result.value as MetricType.Histogram).sum, 4);
    });

    it("direct observe", async () => {
      const histogram = Histogram<number>(
        "h2",
        Boundaries.linear(0, 1, 10),
        labels,
        () => (effect) => effect
      );

      const program = Effect.Do()
        .tap(() => histogram.observe(1))
        .tap(() => histogram.observe(3))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(histogram.name, histogram.boundaries, histogram.tags)
            )
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.strictEqual((result.value as MetricType.Histogram).count, 2);
      assert.strictEqual((result.value as MetricType.Histogram).sum, 4);
    });

    it("observeDurations", async () => {
      const histogram = Metric.observeDurations(
        "h3",
        Boundaries.linear(0, 1, 10),
        ...labels
      )((duration) => duration.millis / 1000);

      // NOTE: observeDurations always uses real clock
      const program = Effect.Do()
        .bind("start", () => Effect(Date.now()))
        .tap(() => Effect.sleep((1).seconds).apply(histogram.apply))
        .tap(() => Effect.sleep((3).seconds).apply(histogram.apply))
        .bind("end", () => Effect(Date.now()))
        .bindValue("elapsed", ({ end, start }) => (end - start) / 1000)
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(histogram.name, histogram.boundaries, histogram.tags)
            )
            .map((snapshot) => snapshot.details));

      const { elapsed, result } = await program.unsafeRunPromise();

      assert.strictEqual((result.value as MetricType.Histogram).count, 2);
      assert.isTrue((result.value as MetricType.Histogram).sum > 3.9);
      assert.isTrue((result.value as MetricType.Histogram).sum <= elapsed);
    });

    it("observeHistogram", async () => {
      const histogram = Metric.observeHistogram(
        "h4",
        Boundaries.linear(0, 1, 10),
        ...labels
      );

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(histogram.apply))
        .tap(() => Effect.succeed(3).apply(histogram.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(histogram.name, histogram.boundaries, histogram.tags)
            )
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.strictEqual((result.value as MetricType.Histogram).count, 2);
      assert.strictEqual((result.value as MetricType.Histogram).sum, 4);
    });

    it("observeHistogramWith", async () => {
      const histogram = Metric.observeHistogramWith(
        "h5",
        Boundaries.linear(0, 1, 10),
        ...labels
      )((s: string) => s.length);

      const program = Effect.Do()
        .tap(() => Effect.succeed("x").apply(histogram.apply))
        .tap(() => Effect.succeed("xyz").apply(histogram.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(histogram.name, histogram.boundaries, histogram.tags)
            )
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.strictEqual((result.value as MetricType.Histogram).count, 2);
      assert.strictEqual((result.value as MetricType.Histogram).sum, 4);
    });

    it("observeHistogram + copy", async () => {
      const histogram = Metric.observeHistogram(
        "h6",
        Boundaries.linear(0, 1, 10),
        ...labels
      ).copy({ name: "h6c", tags: Chunk.empty() });

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(histogram.apply))
        .tap(() => Effect.succeed(3).apply(histogram.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Histogram("h6", histogram.boundaries, labels))
            .map((snapshot) => snapshot.details))
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Histogram("h6c", histogram.boundaries, Chunk.empty()))
            .map((snapshot) => snapshot.details));

      const { result0, result1 } = await program.unsafeRunPromise();

      assert.strictEqual((result0.value as MetricType.Histogram).count, 0);
      assert.strictEqual((result1.value as MetricType.Histogram).count, 2);
      assert.strictEqual((result1.value as MetricType.Histogram).sum, 4);
    });

    it("observeHistogramWith + taggedWith", async () => {
      const boundaries = Boundaries.linear(0, 1, 10);
      const histogram = Metric.observeHistogramWith(
        "h7",
        boundaries,
        ...labels
      )((s: string) => s.length).taggedWith((s) => Chunk.single(MetricLabel("dyn", s)));

      const program = Effect.Do()
        .tap(() => Effect.succeed("x").apply(histogram.apply))
        .tap(() => Effect.succeed("xyz").apply(histogram.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Histogram("h7", boundaries, labels))
            .map((snapshot) => snapshot.details))
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(
                "h7",
                boundaries,
                labels.append(MetricLabel("dyn", "x"))
              )
            )
            .map((snapshot) => snapshot.details))
        .bindValue("result2", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(
                "h7",
                boundaries,
                labels.append(MetricLabel("dyn", "xyz"))
              )
            )
            .map((snapshot) => snapshot.details));

      const { result0, result1, result2 } = await program.unsafeRunPromise();

      assert.strictEqual((result0.value as MetricType.Histogram).count, 0);
      assert.strictEqual((result1.value as MetricType.Histogram).count, 1);
      assert.strictEqual((result2.value as MetricType.Histogram).count, 1);
    });

    it("observeHistogramWith + taggedWith referential transparency", async () => {
      const boundaries = Boundaries.linear(0, 1, 10);
      const histogram1 = Metric.observeHistogramWith(
        "h8",
        boundaries,
        ...labels
      )((s: string) => s.length);
      const histogram2 = histogram1.taggedWith((s) => Chunk.single(MetricLabel("dyn", s)));

      const program = Effect.Do()
        .tap(() => Effect.succeed("x").apply(histogram2.apply))
        .tap(() => Effect.succeed("xyz").apply(histogram1.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Histogram("h8", boundaries, labels))
            .map((snapshot) => snapshot.details))
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(
                "h8",
                boundaries,
                labels.append(MetricLabel("dyn", "x"))
              )
            )
            .map((snapshot) => snapshot.details))
        .bindValue("result2", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(
                "h8",
                boundaries,
                labels.append(MetricLabel("dyn", "xyz"))
              )
            )
            .map((snapshot) => snapshot.details));

      const { result0, result1, result2 } = await program.unsafeRunPromise();

      assert.strictEqual((result0.value as MetricType.Histogram).count, 1);
      assert.strictEqual((result1.value as MetricType.Histogram).count, 1);
      assert.isTrue(result2 == Option.none);
    });
  });
});
