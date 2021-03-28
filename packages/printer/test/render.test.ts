import * as A from "@effect-ts/core/Array"
import { flow, pipe } from "@effect-ts/core/Function"
import * as I from "@effect-ts/core/Identity"

import type { Doc } from "../src/Core/Doc"
import * as D from "../src/Core/Doc"
import * as R from "../src/Core/Render"

const fun = <A>(doc: Doc<A>): Doc<A> =>
  D.hcat([D.hang_(D.hcat([D.text("fun("), D.softLineBreak, doc]), 2), D.text(")")])

const funs = flow(fun, fun, fun, fun, fun)

const doc = funs(D.align(D.list(D.words("abcdef ghijklm"))))

const dashes = D.text(pipe(A.replicate_(26 - 2, "-"), I.fold(I.string)))

const hr = D.hcat([D.vbar, dashes, D.vbar])

const page = D.vsep([hr, doc, hr])

describe("Render", () => {
  describe("rendering algorithms", () => {
    it("renderPretty", () => {
      expect(R.renderPretty_(page, 14, 1)).toBe(
        `
|------------------------|
fun(fun(fun(
          fun(
            fun(
              [ abcdef
              , ghijklm ])))))
|------------------------|
        `.trim()
      )
    })

    it("renderPrettyDefault", () => {
      expect(R.renderPrettyDefault(page)).toBe(
        `
|------------------------|
fun(fun(fun(fun(fun([abcdef, ghijklm])))))
|------------------------|
        `.trim()
      )
    })

    it("renderPrettyUnbounded", () => {
      expect(R.renderPrettyUnbounded(page)).toBe(
        `
|------------------------|
fun(fun(fun(fun(fun([abcdef, ghijklm])))))
|------------------------|
      `.trim()
      )
    })

    it("renderSmart", () => {
      expect(R.renderSmart_(page, 14, 1)).toBe(
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

    it("renderSmartDefault", () => {
      expect(R.renderSmartDefault(page)).toBe(
        `
|------------------------|
fun(fun(fun(fun(fun([abcdef, ghijklm])))))
|------------------------|
      `.trim()
      )
    })

    it("renderSmartUnbounded", () => {
      expect(R.renderSmartDefault(page)).toBe(
        `
|------------------------|
fun(fun(fun(fun(fun([abcdef, ghijklm])))))
|------------------------|
      `.trim()
      )
    })

    it("renderCompact", () => {
      expect(R.renderCompact(page)).toBe(
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
