import { LiveClock } from "@effect-ts/core/io/Clock/live";
import { constTrue } from "@tsplus/stdlib/data/Function";

describe.concurrent("Effect", () => {
  describe.concurrent("provideSomeLayer", () => {
    it("can split environment into two parts", async () => {
      const clockLayer: Layer<{}, never, HasClock> = Layer.fromValue(HasClock)(
        new LiveClock()
      );
      const effect: Effect<HasClock & HasRandom, never, void> = Effect.unit;
      const program: Effect<HasRandom, never, boolean> = effect
        .map(constTrue)
        .provideSomeLayer(clockLayer);

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });
  });
});
