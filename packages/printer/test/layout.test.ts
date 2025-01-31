import * as Doc from "@effect/printer/Doc"
import * as Layout from "@effect/printer/Layout"
import * as PageWidth from "@effect/printer/PageWidth"
import { describe, expect, it } from "@effect/vitest"
import * as String from "effect/String"

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
    expect(Doc.renderStream(Layout.unbounded(doc))).toBe(String.stripMargin(
      `||------------------------|
       |fun(fun(fun(fun(fun([abcdef, ghijklm])))))
       ||------------------------|`
    ))
  })

  it("pretty", () => {
    expect(Doc.renderStream(Layout.pretty(doc, layoutOptions))).toBe(String.stripMargin(
      `||------------------------|
       |fun(fun(fun(fun(fun(
       |                  [ abcdef
       |                  , ghijklm ])))))
       ||------------------------|`
    ))
  })

  it("smart", () => {
    expect(Doc.renderStream(Layout.smart(doc, layoutOptions))).toBe(String.stripMargin(
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
    expect(Doc.renderStream(Layout.compact(doc))).toBe(String.stripMargin(
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
