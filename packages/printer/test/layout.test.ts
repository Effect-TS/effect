import * as Doc from "@effect/printer/Doc"
import * as Layout from "@effect/printer/Layout"
import * as PageWidth from "@effect/printer/PageWidth"
import * as Render from "@effect/printer/Render"
import * as String from "effect/String"
import { describe, expect, it } from "vitest"

const fun = <A>(doc: Doc.Doc<A>): Doc.Doc<A> =>
  Doc.cat(
    Doc.hang(Doc.hcat([Doc.text("fun("), Doc.softLineBreak, doc]), 2),
    Doc.text(")")
  )

const funs = <A>(doc: Doc.Doc<A>): Doc.Doc<A> => fun(fun(fun(fun(fun(doc)))))

const dashes = Doc.text(Array.from({ length: 26 - 2 }, () => "-").join(""))

const hr = Doc.hcat([Doc.vbar, dashes, Doc.vbar])

const doc = Doc.vsep([
  hr,
  funs(Doc.align(Doc.list(Doc.words("abcdef ghijklm")))),
  hr
])

const pageWidth = PageWidth.availablePerLine(26, 1)

const layoutOptions = Layout.options(pageWidth)

describe.concurrent("Layout", () => {
  it("unbounded", () => {
    expect(Render.render(Layout.unbounded(doc))).toBe(String.stripMargin(
      `||------------------------|
       |fun(fun(fun(fun(fun([abcdef, ghijklm])))))
       ||------------------------|`
    ))
  })

  it("pretty", () => {
    expect(Render.render(Layout.pretty(doc, layoutOptions))).toBe(String.stripMargin(
      `||------------------------|
       |fun(fun(fun(fun(fun(
       |                  [ abcdef
       |                  , ghijklm ])))))
       ||------------------------|`
    ))
  })

  it("smart", () => {
    expect(Render.render(Layout.smart(doc, layoutOptions))).toBe(String.stripMargin(
      `||------------------------|
       |fun(
       |  fun(
       |    fun(
       |      fun(
       |        fun(
       |          [ abcdef
       |          , ghijklm ])))))
       ||------------------------|`
    ))
  })

  it("compact", () => {
    expect(Render.render(Layout.compact(doc))).toBe(String.stripMargin(
      `||------------------------|
       |fun(
       |fun(
       |fun(
       |fun(
       |fun(
       |[ abcdef
       |, ghijklm ])))))
       ||------------------------|`
    ))
  })
})
