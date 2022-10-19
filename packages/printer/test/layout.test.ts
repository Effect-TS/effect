import * as String from "@fp-ts/data/String"

function fun<A>(doc: Doc<A>): Doc<A> {
  return Doc
    .hcat([Doc.text("fun("), Doc.softLineBreak, doc])
    .hang(2)
    .cat(Doc.text(")"))
}

function funs<A>(doc: Doc<A>): Doc<A> {
  return fun(fun(fun(fun(fun(doc)))))
}

const dashes = Doc.text(Array.from({ length: 26 - 2 }, () => "-").join(""))

const hr = Doc.hcat([Doc.vbar, dashes, Doc.vbar])

const doc = Doc.vsep([
  hr,
  funs(Doc.list(Doc.words("abcdef ghijklm")).align),
  hr
])

const pageWidth: PageWidth = PageWidth.AvailablePerLine(26, 1)

const layoutOptions: Layout.Options = Layout.Options(pageWidth)

describe.concurrent("Layout", () => {
  it("unbounded", () => {
    assert.strictEqual(
      doc.layoutUnbounded.render,
      String.stripMargin(
        `||------------------------|
         |fun(fun(fun(fun(fun([abcdef, ghijklm])))))
         ||------------------------|`
      )
    )
  })

  it("pretty", () => {
    assert.strictEqual(
      doc.layoutPretty(layoutOptions).render,
      String.stripMargin(
        `||------------------------|
         |fun(fun(fun(fun(fun(
         |                  [ abcdef
         |                  , ghijklm ])))))
         ||------------------------|`
      )
    )
  })

  it("smart", () => {
    assert.strictEqual(
      doc.layoutSmart(layoutOptions).render,
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

  it("compact", () => {
    assert.strictEqual(
      doc.layoutCompact.render,
      String.stripMargin(
        `||------------------------|
         |fun(
         |fun(
         |fun(
         |fun(
         |fun(
         |[ abcdef
         |, ghijklm ])))))
         ||------------------------|`
      )
    )
  })
})
