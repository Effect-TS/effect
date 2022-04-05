import { makeStair, n } from "@effect-ts/core/test/stm/TArray/test-utils";

describe.concurrent("TArray", () => {
  describe.concurrent("firstOption", () => {
    it("retrieves the first item", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.firstOption.commit());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(1));
    });

    it("is none for an empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.firstOption.commit());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.none);
    });
  });
});
