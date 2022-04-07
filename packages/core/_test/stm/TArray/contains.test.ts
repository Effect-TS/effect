import { makeStair, n } from "@effect/core/test/stm/TArray/test-utils";

describe.concurrent("TArray", () => {
  describe.concurrent("contains", () => {
    it("true when in the array", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.contains(Equivalence.number)(3).commit());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });

    it("false when not in the array", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .contains(Equivalence.number)(n + 1)
            .commit()
        );

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });

    it("false for empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.contains(Equivalence.number)(0).commit());

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });
  });
});
