import * as assert from "assert";
import * as _ from "../src/list";
import { none, some } from "fp-ts/lib/Option";

describe("List", () => {
  it("empty", () => {
    const l = _.empty<string>();
    assert.deepStrictEqual(_.head(l), none);
    assert.deepStrictEqual(_.last(l), none);
    assert.deepStrictEqual(_.isNotEmpty(l), false);
    assert.deepStrictEqual(_.pop(l), none);
  });
  it("push", () => {
    const l = _.empty<string>();
    _.push(l, "a");
    assert.deepStrictEqual(_.head(l), some("a"));
    assert.deepStrictEqual(_.last(l), some("a"));
    assert.deepStrictEqual(_.isNotEmpty(l), true);
    _.push(l, "b");
    assert.deepStrictEqual(_.head(l), some("a"));
    assert.deepStrictEqual(_.last(l), some("b"));
    assert.deepStrictEqual(_.isNotEmpty(l), true);
  });
  it("pop", () => {
    const l = _.empty<string>();
    assert.deepStrictEqual(_.pop(l), none);
    _.push(l, "a");
    _.push(l, "b");
    assert.deepStrictEqual(_.head(l), some("a"));
    assert.deepStrictEqual(_.last(l), some("b"));
    assert.deepStrictEqual(_.pop(l), some("a"));
    assert.deepStrictEqual(_.isNotEmpty(l), true);
    assert.deepStrictEqual(_.pop(l), some("b"));
    assert.deepStrictEqual(_.head(l), none);
    assert.deepStrictEqual(_.last(l), none);
    assert.deepStrictEqual(_.isNotEmpty(l), false);
    assert.deepStrictEqual(_.pop(l), none);
  });
});
