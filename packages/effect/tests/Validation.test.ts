import * as T from "../src";
import * as S from "fp-ts/lib/Semigroup";
import * as A from "fp-ts/lib/Array";
import * as assert from "assert";

describe("Validation", () => {
  it("should trasverse", async () => {
    const V = T.getValidationM(S.semigroupString);

    const checks = A.array.traverse(V)([0, 1, 2, 3, 4], x =>
      x < 2 ? T.left(`(error: ${x})`) : T.right(x)
    );

    const res = await T.run(checks)();

    assert.deepEqual(res, T.raise("(error: 0)(error: 1)"));
  });
});
