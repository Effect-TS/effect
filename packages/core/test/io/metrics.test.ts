import { Chunk } from "../../src/collection/immutable/Chunk"
import { Option } from "../../src/data/Option"
import { Effect } from "../../src/io/Effect"
import { Counter } from "../../src/io/Metrics/Counter"
import { MetricClient } from "../../src/io/Metrics/MetricClient"
import { MetricKey } from "../../src/io/Metrics/MetricKey"
import { MetricLabel } from "../../src/io/Metrics/MetricLabel"
import { MetricType } from "../../src/io/Metrics/MetricType"

const labels = Chunk(MetricLabel("x", "a"), MetricLabel("y", "b"))

describe("Metrics", () => {
  describe("Counter", () => {
    it("custom increment as aspect", async () => {
      const counter = Counter<any>(
        "c1",
        labels,
        (metric) => (effect) => effect.tap(() => metric.increment())
      )

      const program = Effect.unit
        .apply((effect) => counter.track(effect))
        .tap(() => Effect.unit.apply((effect) => counter.track(effect)))
        .flatMap(() => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map((snapshots) =>
          snapshots
            .get(MetricKey.Counter("c1", labels))
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Counter(2)))
    })
  })
})
