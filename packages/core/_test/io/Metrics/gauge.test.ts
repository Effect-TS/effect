const labels = Chunk(MetricLabel("x", "a"), MetricLabel("y", "b"));

describe.concurrent("Metrics", () => {
  describe.concurrent("Gauge", () => {
    it("custom set as aspect", async () => {
      const gauge = Gauge<number>(
        "g1",
        labels,
        (metric) => (effect) => effect.tap((n) => metric.set(n))
      );

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(gauge.apply))
        .tap(() => Effect.succeed(3).apply(gauge.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g1", labels))
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Gauge(3)));
    });

    it("direct increment", async () => {
      const gauge = Gauge<number>(
        "g2",
        labels,
        (metric) => (effect) => effect.tap((n) => metric.set(n))
      );

      const program = Effect.Do()
        .tap(() => gauge.set(1))
        .tap(() => gauge.set(3))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g2", labels))
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Gauge(3)));
    });

    it("custom adjust as aspect", async () => {
      const gauge = Gauge<number>(
        "g3",
        labels,
        (metric) => (effect) => effect.tap((n) => metric.adjust(n))
      );

      const program = Effect.Do()
        .tap(() => Effect.succeed(10).apply(gauge.apply))
        .tap(() => Effect.succeed(5).apply(gauge.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g3", labels))
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Gauge(15)));
    });

    it("direct adjust", async () => {
      const gauge = Gauge<number>(
        "g4",
        labels,
        (metric) => (effect) => effect.tap((n) => metric.adjust(n))
      );

      const program = Effect.Do()
        .tap(() => gauge.adjust(10))
        .tap(() => gauge.adjust(5))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g4", labels))
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Gauge(15)));
    });

    it("setGauge", async () => {
      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(Metric.setGauge("g5", ...labels).apply))
        .tap(() => Effect.succeed(3).apply(Metric.setGauge("g5", ...labels).apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g5", labels))
            .map((snapshot) => snapshot.details))
        .bind("value", () => Metric.setGauge("g5", ...labels).value());

      const { result, value } = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Gauge(3)));
      assert.strictEqual(value, 3);
    });

    it("adjustGauge", async () => {
      const program = Effect.Do()
        .tap(() => Effect.succeed(10).apply(Metric.adjustGauge("g6", ...labels).apply))
        .tap(() => Effect.succeed(5).apply(Metric.adjustGauge("g6", ...labels).apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g6", labels))
            .map((snapshot) => snapshot.details))
        .bind("value", () => Metric.adjustGauge("g6", ...labels).value());

      const { result, value } = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Gauge(15)));
      assert.strictEqual(value, 15);
    });

    it("setGaugeWith", async () => {
      const gauge = Metric.setGaugeWith("g7", ...labels)((n: number) => n + 1);

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(gauge.apply))
        .tap(() => Effect.succeed(3).apply(gauge.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g7", labels))
            .map((snapshot) => snapshot.details))
        .bind("value", () => gauge.value());

      const { result, value } = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Gauge(4)));
      assert.strictEqual(value, 4);
    });

    it("adjustGaugeWith", async () => {
      const gauge = Metric.adjustGaugeWith("g8", ...labels)((n: number) => n + 1);

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(gauge.apply))
        .tap(() => Effect.succeed(3).apply(gauge.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g8", labels))
            .map((snapshot) => snapshot.details))
        .bind("value", () => gauge.value());

      const { result, value } = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Gauge(6)));
      assert.strictEqual(value, 6);
    });

    it("adjustGaugeWith + copy", async () => {
      const gauge = Metric.adjustGaugeWith(
        "g9",
        ...labels
      )((s: string) => s.length).copy({ name: "g9c", tags: Chunk.empty() });

      const program = Effect.Do()
        .tap(() => Effect.succeed("hello").apply(gauge.apply))
        .tap(() => Effect.succeed("!").apply(gauge.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g9", labels))
            .map((snapshot) => snapshot.details))
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g9c", Chunk.empty()))
            .map((snapshot) => snapshot.details))
        .bind("value", () => gauge.value());

      const { result0, result1, value } = await program.unsafeRunPromise();

      assert.isTrue(result0 == Option.some(MetricType.Gauge(0)));
      assert.isTrue(result1 == Option.some(MetricType.Gauge(6)));
      assert.strictEqual(value, 6);
      assert.strictEqual(gauge.name, "g9c");
    });

    it("adjustGaugeWith + taggedWith", async () => {
      const gauge = Metric.adjustGaugeWith(
        "g10",
        MetricLabel("static", "0")
      )((s: string) => s.length).taggedWith((s) => Chunk.single(MetricLabel("dyn", s)));

      const program = Effect.Do()
        .tap(() => Effect.succeed("hello").apply(gauge.apply))
        .tap(() => Effect.succeed("!").apply(gauge.apply))
        .tap(() => Effect.succeed("!").apply(gauge.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Gauge(
                "g10",
                Chunk(MetricLabel("static", "0"), MetricLabel("dyn", "!"))
              )
            )
            .map((snapshot) => snapshot.details)
        );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(MetricType.Gauge(2)));
    });

    it("adjustGaugeWith + taggedWith referential transparency", async () => {
      const gauge1 = Metric.adjustGaugeWith(
        "g11",
        MetricLabel("static", "0")
      )((s: string) => s.length);
      const gauge2 = gauge1.taggedWith((s) => Chunk.single(MetricLabel("dyn", s)));

      const program = Effect.Do()
        .tap(() => Effect.succeed("!").apply(gauge2.apply))
        .tap(() => Effect.succeed("hello").apply(gauge1.apply))
        .tap(() => Effect.succeed("!").apply(gauge1.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g11", Chunk(MetricLabel("static", "0"))))
            .map((snapshot) => snapshot.details))
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Gauge(
                "g11",
                Chunk(MetricLabel("static", "0"), MetricLabel("dyn", "!"))
              )
            )
            .map((snapshot) => snapshot.details));

      const { result0, result1 } = await program.unsafeRunPromise();

      assert.isTrue(result0 == Option.some(MetricType.Gauge(6)));
      assert.isTrue(result1 == Option.some(MetricType.Gauge(1)));
    });
  });
});
