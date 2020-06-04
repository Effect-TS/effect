import * as assert from "assert"

import * as T from "../../src/Effect"
import { pipe } from "../../src/Function"
import * as I from "../../src/Monocle/Iso"
import * as L from "../../src/Monocle/Lens"
import { monoidSum } from "../../src/Monoid"
import * as O from "../../src/Option"

describe("Iso", () => {
  it("reverse", () => {
    const iso = I.create(
      (s: string) => s.split(""),
      (a) => a.join("")
    )

    const rev = I.reverse(iso)

    const res = pipe(["a", "b"], rev.get)
    const res2 = pipe("ab", rev.reverseGet)

    assert.deepStrictEqual(res, "ab")
    assert.deepStrictEqual(res2, ["a", "b"])
  })
  it("wrap/unwrap", () => {
    const iso = I.create(
      (s: string) => s.split(""),
      (a) => a.join("")
    )

    const res = pipe("ab", I.unwrap(iso), I.wrap(iso))

    assert.deepStrictEqual(res, "ab")
  })
  it("modify", () => {
    const iso = I.create(
      (s: string) => s.split(""),
      (a) => a.join("")
    )

    const res = pipe(
      "ab",
      I.modify(iso)((a) => [...a, "ok"])
    )

    assert.deepStrictEqual(res, "abok")
  })
  it("asLens", () => {
    const iso = I.create(
      (s: string) => s.split(""),
      (a) => a.join("")
    )

    const lens = I.asLens(iso)

    const res = pipe("ab", L.get(lens))

    assert.deepStrictEqual(res, ["a", "b"])
  })
  it("compose", () => {
    const iso = I.create(
      (s: string) => s.split(""),
      (a) => a.join("")
    )

    const isoB = I.create(
      (a: string[]) => [a],
      (a) => a[0]
    )

    const comp = pipe(iso, I.compose(isoB))

    const res = pipe("ab", comp.get)

    assert.deepStrictEqual(res, [["a", "b"]])
  })
  it("composeLens / asLens", () => {
    const iso = I.create(
      (s: string) => s.split(""),
      (a) => a.join("")
    )

    const isoB = I.create(
      (a: string[]) => [a],
      (a) => a[0]
    )

    const comp = pipe(iso, I.composeLens(I.asLens(isoB)))

    const res = pipe("ab", comp.set([["a"]]), comp.get)

    assert.deepStrictEqual(res, [["a"]])
  })
  it("composePrism / asPrism", () => {
    const iso = I.create(
      (s: string) => s.split(""),
      (a) => a.join("")
    )

    const isoB = I.create(
      (a: string[]) => [a],
      (a) => a[0]
    )

    const comp = pipe(iso, I.composePrism(I.asPrism(isoB)))

    const res = pipe("ab", comp.getOption)

    assert.deepStrictEqual(res, O.some([["a", "b"]]))
  })
  it("asOptional / composeOptional", () => {
    const iso = I.create(
      (s: string) => s.split(""),
      (a) => a.join("")
    )

    const isoB = I.create(
      (a: string[]) => [a],
      (a) => a[0]
    )

    const comp = pipe(iso, I.composeOptional(I.asOptional(isoB)))

    const res = pipe("ab", comp.set([["a"]]), comp.getOption)

    assert.deepStrictEqual(res, O.some([["a"]]))
  })
  it("asTraversal / composeTraversal", () => {
    const iso = I.create(
      (s: string) => s.split(""),
      (a) => a.join("")
    )

    const isoB = I.create(
      (a: string[]) => [a],
      (a) => a[0]
    )

    const comp = pipe(iso, I.composeTraversal(I.asTraversal(isoB)))

    const res = pipe(
      "ab",
      comp.modifyF(T.effect)(() => T.pure([["o", "k"]])),
      T.runUnsafeSync
    )

    assert.deepStrictEqual(res, "ok")
  })
  it("asFold / composeFold", () => {
    const iso = I.create(
      (s: string) => s.split(""),
      (a) => a.join("")
    )

    const isoB = I.create(
      (a: string[]) => [a],
      (a) => a[0]
    )

    const comp = pipe(iso, I.composeFold(I.asFold(isoB)))

    const res = pipe(
      "ab",
      comp.foldMap(monoidSum)((a) => a[0].length)
    )

    assert.deepStrictEqual(res, 2)
  })
  it("asGetter / composeGetter", () => {
    const iso = I.create(
      (s: string) => s.split(""),
      (a) => a.join("")
    )

    const isoB = I.create(
      (a: string[]) => [a],
      (a) => a[0]
    )

    const comp = pipe(iso, I.composeGetter(I.asGetter(isoB)))

    const res = pipe("ab", comp.get)

    assert.deepStrictEqual(res, [["a", "b"]])
  })
  it("asSetter / composeSetter", () => {
    const iso = I.create(
      (s: string) => s.split(""),
      (a) => a.join("")
    )

    const isoB = I.create(
      (a: string[]) => [a],
      (a) => a[0]
    )

    const comp = pipe(iso, I.composeSetter(I.asSetter(isoB)))

    const res = pipe(
      "ab",
      comp.modify((a) => [[...a[0], "c"]])
    )

    assert.deepStrictEqual(res, "abc")
  })
})
