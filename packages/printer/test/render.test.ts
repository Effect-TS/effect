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

const doc = Doc.vsep([hr, funs(Doc.list(Doc.words("abcdef ghijklm")).align), hr])

describe.concurrent("Render", () => {
  it("pretty", () => {
    assert.strictEqual(
      doc.pretty(14, 1),
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

  it("prettyDefault", () => {
    assert.strictEqual(
      doc.prettyDefault,
      String.stripMargin(
        `||------------------------|
         |fun(fun(fun(fun(fun([abcdef, ghijklm])))))
         ||------------------------|`
      )
    )
  })

  it("prettyUnbounded", () => {
    assert.strictEqual(
      doc.prettyUnbounded,
      String.stripMargin(
        `||------------------------|
         |fun(fun(fun(fun(fun([abcdef, ghijklm])))))
         ||------------------------|`
      )
    )
  })

  it("smart", () => {
    assert.strictEqual(
      doc.smart(14, 1),
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

  it("smartDefault", () => {
    assert.strictEqual(
      doc.smartDefault,
      String.stripMargin(
        `||------------------------|
         |fun(fun(fun(fun(fun([abcdef, ghijklm])))))
         ||------------------------|`
      )
    )
  })

  it("renderSmartUnbounded", () => {
    assert.strictEqual(
      doc.smartDefault,
      String.stripMargin(
        `||------------------------|
         |fun(fun(fun(fun(fun([abcdef, ghijklm])))))
         ||------------------------|`
      )
    )
  })

  it("compact", () => {
    assert.strictEqual(
      doc.compact,
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
