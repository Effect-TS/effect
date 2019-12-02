import { mergeDeep } from "../src/utils/merge";
import * as assert from "assert";

describe("Merge", () => {
  it("should merge", async () => {
    const a = { foo: { bar: "bar" } };
    const b = { foo: { baz: "baz" }, key: { key: "value" } };
    const c = mergeDeep(a, b);

    assert.deepEqual(c, {
      foo: { bar: "bar", baz: "baz" },
      key: { key: "value" }
    });
  });
});
