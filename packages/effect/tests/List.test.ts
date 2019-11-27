import * as assert from "assert";
import * as _ from "../src/list";
import { none, some } from "fp-ts/lib/Option";

describe("List", () => {
  it("empty", () => {
    const l = _.empty<string>();
    assert.deepStrictEqual(_.isEmpty(l), true);
    assert.deepStrictEqual(_.singleton(l), false);
    assert.deepStrictEqual(_.pop(l), none);
  });
  it("push", () => {
    const l = _.empty<string>();
    _.push(l, "a");
    assert.deepStrictEqual(_.isEmpty(l), false);
    assert.deepStrictEqual(_.singleton(l), true);
    _.push(l, "b");
    assert.deepStrictEqual(_.isEmpty(l), false);
    assert.deepStrictEqual(_.singleton(l), false);
  });
  it("pop", () => {
    const l = _.empty<string>();
    _.push(l, "a");
    _.push(l, "b");
    assert.deepStrictEqual(_.pop(l), some("a"));
    assert.deepStrictEqual(_.isEmpty(l), false);
    assert.deepStrictEqual(_.singleton(l), true);
    assert.deepStrictEqual(_.pop(l), some("b"));
    assert.deepStrictEqual(_.isEmpty(l), true);
    assert.deepStrictEqual(_.singleton(l), false);
    assert.deepStrictEqual(_.pop(l), none);
  });
});
