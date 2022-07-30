const labels = Chunk(MetricLabel("x", "a"), MetricLabel("y", "b"))

describe.concurrent("Metrics", () => {
  describe.concurrent("Gauge", () => {
    it("custom set as aspect", async () => {
      const gauge = Metric.gauge("g1").taggedWithLabels(labels)

      const program = Effect.sync(1) / gauge >
        Effect.sync(3) / gauge >
        gauge.value

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == MetricState.Gauge(3))
    })

    it("direct set", async () => {
      const gauge = Metric.gauge("g2").taggedWithLabels(labels)

      const program = gauge.set(1) > gauge.set(3) > gauge.value

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == MetricState.Gauge(3))
    })

    it("custom set with contramap", async () => {
      const gauge = Metric.gauge("g3").taggedWithLabels(labels).contramap((n: number) => n * 2)

      const program = Effect.sync(1) / gauge >
        Effect.sync(3) / gauge >
        gauge.value

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == MetricState.Gauge(6))
    })

    it("gauge + taggedWith", async () => {
      const base = Metric.gauge("g4").tagged("static", "0").contramap((s: string) => s.length)
      const gauge = base.taggedWith((input: string) => HashSet(MetricLabel("dyn", input)))

      const program = Effect.sync("hello") / gauge >
        Effect.sync("!") / gauge >
        Effect.sync("!") / gauge >
        base.tagged("dyn", "!").value

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == MetricState.Gauge(1))
    })
  })
})
