import { mergeDeep } from "../src/utils/merge";
import * as assert from "assert";

describe("Merge", () => {
  it("should merge", async () => {
    const sa = Symbol();
    const sb = Symbol();
    const a = { foo: { bar: "bar" }, [sa]: { foo: "x" }, [sb]: "a" };
    const b = {
      foo: { baz: "baz" },
      key: { key: "value" },
      [sa]: { bar: "y" },
      [sb]: "b"
    };
    const c = mergeDeep(a, b);

    assert.deepEqual(c, {
      foo: { bar: "bar", baz: "baz" },
      key: { key: "value" },
      [sa]: { bar: "y" },
      [sb]: "b"
    });
  });
});
