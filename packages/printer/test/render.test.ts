import * as Doc from "@effect/printer/Doc"
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

const doc = Doc.vsep([hr, funs(Doc.align(Doc.list(Doc.words("abcdef ghijklm")))), hr])

describe.concurrent("Render", () => {
  it("pretty", () => {
    expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 14 } })).toBe(
      String.stripMargin(
        `||------------------------|
         |fun(fun(fun(
         |          fun(
         |            fun(
         |              [ abcdef
         |              , ghijklm ])))))
         ||------------------------|`
      )
    )
  })

  it("pretty", () => {
    expect(Doc.render(doc, { style: "pretty" })).toBe(String.stripMargin(
      `||------------------------|
       |fun(fun(fun(fun(fun([abcdef, ghijklm])))))
       ||------------------------|`
    ))
  })

  it("pretty - unbounded", () => {
    expect(Doc.render(doc, { style: "pretty", options: PageWidth.unbounded })).toBe(
      String.stripMargin(
        `||------------------------|
         |fun(fun(fun(fun(fun([abcdef, ghijklm])))))
         ||------------------------|`
      )
    )
  })

  it("smart", () => {
    expect(Doc.render(doc, { style: "smart" })).toBe(String.stripMargin(
      `||------------------------|
       |fun(fun(fun(fun(fun([abcdef, ghijklm])))))
       ||------------------------|`
    ))
  })

  it("smart - limited line width", () => {
    expect(Doc.render(doc, { style: "smart", options: { lineWidth: 14 } })).toBe(
      String.stripMargin(
        `||------------------------|
         |fun(
         |  fun(
         |    fun(
         |      fun(
         |        fun(
         |          [ abcdef
         |          , ghijklm ])))))
         ||------------------------|`
      )
    )
  })

  it("smart - unbounded", () => {
    expect(Doc.render(doc, { style: "smart", options: PageWidth.unbounded })).toBe(
      String.stripMargin(
        `||------------------------|
         |fun(fun(fun(fun(fun([abcdef, ghijklm])))))
         ||------------------------|`
      )
    )
  })

  it("compact", () => {
    expect(Doc.render(doc, { style: "compact" })).toBe(String.stripMargin(
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
