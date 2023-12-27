import * as Doc from "@effect/printer/Doc"
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

const doc = Doc.vsep([hr, funs(Doc.align(Doc.list(Doc.words("abcdef ghijklm")))), hr])

describe.concurrent("Render", () => {
  it("pretty", () => {
    expect(Render.pretty(doc, { lineWidth: 14 })).toBe(String.stripMargin(
      `||------------------------|
       |fun(fun(fun(
       |          fun(
       |            fun(
       |              [ abcdef
       |              , ghijklm ])))))
       ||------------------------|`
    ))
  })

  it("prettyDefault", () => {
    expect(Render.prettyDefault(doc)).toBe(String.stripMargin(
      `||------------------------|
       |fun(fun(fun(fun(fun([abcdef, ghijklm])))))
       ||------------------------|`
    ))
  })

  it("prettyUnbounded", () => {
    expect(Render.prettyUnbounded(doc)).toBe(String.stripMargin(
      `||------------------------|
       |fun(fun(fun(fun(fun([abcdef, ghijklm])))))
       ||------------------------|`
    ))
  })

  it("smart", () => {
    expect(Render.smart(doc, { lineWidth: 14 })).toBe(String.stripMargin(
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

  it("smartDefault", () => {
    expect(Render.smartDefault(doc)).toBe(String.stripMargin(
      `||------------------------|
       |fun(fun(fun(fun(fun([abcdef, ghijklm])))))
       ||------------------------|`
    ))
  })

  it("renderSmartUnbounded", () => {
    expect(Render.smartUnbounded(doc)).toBe(String.stripMargin(
      `||------------------------|
       |fun(fun(fun(fun(fun([abcdef, ghijklm])))))
       ||------------------------|`
    ))
  })

  it("compact", () => {
    expect(Render.compact(doc)).toBe(String.stripMargin(
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
