const labels = Chunk(MetricLabel("x", "a"), MetricLabel("y", "b"))

describe.concurrent("Metrics", () => {
  describe.concurrent("Frequency", () => {
    it("custom occurrences as aspect", async () => {
      const frequency = Metric.frequency("f1").taggedWithLabels(labels)

      const program = Effect.sync("hello") / frequency >
        Effect.sync("hello") / frequency >
        Effect.sync("world") / frequency >
        frequency.value

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result.occurrences == HashMap(
          ["hello", 2] as const,
          ["world", 1] as const
        )
      )
    })

    it("direct occurrences", async () => {
      const frequency = Metric.frequency("f2").taggedWithLabels(labels)

      const program = frequency.update("hello") >
        frequency.update("hello") >
        frequency.update("world") >
        frequency.value

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result.occurrences == HashMap(
          ["hello", 2] as const,
          ["world", 1] as const
        )
      )
    })

    it("custom occurrences with contramap", async () => {
      const frequency = Metric
        .frequency("f3")
        .taggedWithLabels(labels)
        .contramap((n: number) => n.toString())

      const program = Effect.sync(1) / frequency >
        Effect.sync(1) / frequency >
        Effect.sync(100) / frequency >
        frequency.value

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result.occurrences == HashMap(
          ["1", 2] as const,
          ["100", 1] as const
        )
      )
    })

    it("occurences + taggedWith", async () => {
      const base = Metric.frequency("f4").taggedWithLabels(labels)
      const frequency = base.taggedWith((s: string) => HashSet(MetricLabel("dyn", s)))

      const program = Effect.sync("hello") / frequency >
        Effect.sync("hello") / frequency >
        Effect.sync("world") / frequency >
        Effect.struct({
          r0: base.value,
          r1: base.tagged("dyn", "hello").value,
          r2: base.tagged("dyn", "world").value
        })

      const { r0, r1, r2 } = await program.unsafeRunPromise()

      assert.isTrue(r0.occurrences.isEmpty)
      assert.isTrue(r1.occurrences == HashMap(["hello", 2] as const))
      assert.isTrue(r2.occurrences == HashMap(["world", 1] as const))
    })
  })
})
