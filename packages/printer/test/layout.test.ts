import * as A from "@effect-ts/core/Array"
import { flow, pipe } from "@effect-ts/core/Function"
import * as I from "@effect-ts/core/Identity"

import type { Doc } from "../src/Core/Doc"
import * as D from "../src/Core/Doc"
import type { Layout, LayoutOptions } from "../src/Core/Layout"
import * as L from "../src/Core/Layout"
import type { PageWidth } from "../src/Core/PageWidth"
import * as PW from "../src/Core/PageWidth"
import * as R from "../src/Core/Render"

describe("Layout", () => {
  describe("constructors", () => {
    it("defaultLayoutOptions", () => {
      expect(L.defaultLayoutOptions).toMatchObject({
        pageWidth: { _tag: "AvailablePerLine", lineWidth: 80, ribbonFraction: 1 }
      })
    })
  })

  describe("destructors", () => {
    it("match", () => {
      const match = L.match({
        Nil: () => "Nil",
        Cons: () => "Cons",
        UndoAnnotation: () => "UndoAnnotation"
      })

      expect(match(L.nil)).toBe("Nil")
      expect(match(L.cons(4, D.empty, L.nil))).toBe("Cons")
      expect(match(L.undoAnnotation(L.nil))).toBe("UndoAnnotation")
    })
  })

  describe("layout algorithms", () => {
    const fun = <A>(doc: Doc<A>): Doc<A> =>
      D.hcat([D.hang_(D.hcat([D.text("fun("), D.softLineBreak, doc]), 2), D.text(")")])

    const funs = flow(fun, fun, fun, fun, fun)

    const doc = funs(D.align(D.list(D.words("abcdef ghijklm"))))

    const pageWidth: PageWidth = PW.availablePerLine(26, 1)

    const layoutOptions: LayoutOptions = L.layoutOptions(pageWidth)

    const dashes = D.text(pipe(A.replicate_(26 - 2, "-"), I.fold(I.string)))

    const hr = D.hcat([D.vbar, dashes, D.vbar])

    const render = <A>(doc: Doc<A>) => (
      layoutAlgorithm: (doc: Doc<A>) => Layout<A>
    ): string => pipe(layoutOptions, layoutAlgorithm(D.vsep([hr, doc, hr])), R.render)

    it("unbounded", () => {
      expect(pipe(L.unbounded(D.vsep([hr, doc, hr])), R.render)).toBe(
        `
|------------------------|
fun(fun(fun(fun(fun([abcdef, ghijklm])))))
|------------------------|
      `.trim()
      )
    })

    it("pretty", () => {
      expect(pipe(L.pretty, render(doc))).toBe(
        `
|------------------------|
fun(fun(fun(fun(fun(
                  [ abcdef
                  , ghijklm ])))))
|------------------------|
        `.trim()
      )
    })

    it("smart", () => {
      expect(pipe(L.smart, render(doc))).toBe(
        `
|------------------------|
fun(
  fun(
    fun(
      fun(
        fun(
          [ abcdef
          , ghijklm ])))))
|------------------------|
        `.trim()
      )
    })

    it("compact", () => {
      expect(pipe(L.compact(D.vsep([hr, doc, hr])), R.render)).toBe(
        `
|------------------------|
fun(
fun(
fun(
fun(
fun(
[ abcdef
, ghijklm ])))))
|------------------------|
      `.trim()
      )
    })
  })
})
