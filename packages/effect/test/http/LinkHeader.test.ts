import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { LinkHeader } from "effect/http"

describe("LinkHeader", () => {
  it("parses quoted values containing commas and semicolons and multiple relation types", () => {
    assert.deepStrictEqual(
      LinkHeader.parse("</items?page=2>; title=\"Page 2, continued; details\"; rel=\"next last\""),
      [{ target: "/items?page=2", rel: ["next", "last"], params: { title: "Page 2, continued; details" } }]
    )
  })

  it("parses mixed case names, tokens, valueless and repeated parameters and title*", () => {
    assert.deepStrictEqual(
      LinkHeader.parse(
        "<https://a.example/app.js>; REL=Preload; AS=script; nopush, " +
          "<https://b.example/de>; rel=\"alternate\"; hreflang=de; hreflang=fr; title=\"plain\"; title*=UTF-8''Gr%C3%BC%C3%9Fe"
      ),
      [
        { target: "https://a.example/app.js", rel: ["preload"], params: { as: "script", nopush: "" } },
        { target: "https://b.example/de", rel: ["alternate"], params: { hreflang: "de", title: "Grüße" } }
      ]
    )
  })

  it("stops at malformed input and keeps the links read so far", () => {
    assert.deepStrictEqual(LinkHeader.parse("<a>; rel=\"next\", garbage"), [{ target: "a", rel: ["next"], params: {} }])
    assert.deepStrictEqual(LinkHeader.parse("garbage"), [])
  })

  it("ends parameter names at whitespace and keeps the first rel and extended parameter", () => {
    assert.deepStrictEqual(LinkHeader.parse("<a>; rel=next; anchor junk, <b>; rel=last"), [
      { target: "a", rel: ["next"], params: { anchor: "" } }
    ])
    assert.deepStrictEqual(
      LinkHeader.parse("<a>; rel=prev; rel*=UTF-8''next; title=plain; title*=bad; title*=UTF-8''later"),
      [{ target: "a", rel: ["prev"], params: { title: "plain" } }]
    )
  })

  it("format escapes quoted values, writes non-ASCII values as name* and round trips", () => {
    const links = [
      { target: "/a", rel: ["next", "https://example.com/rel;v=1,2"], params: { title: "say \"hi\" \\ there" } },
      { target: "/b", rel: ["alternate"], params: { title: "Grüße" } }
    ]
    const formatted = LinkHeader.format(links)
    assert.strictEqual(
      formatted,
      "</a>; rel=\"next https://example.com/rel;v=1,2\"; title=\"say \\\"hi\\\" \\\\ there\", </b>; rel=\"alternate\"; title*=UTF-8''Gr%C3%BC%C3%9Fe"
    )
    assert.deepStrictEqual(LinkHeader.parse(formatted), links)
    assert.strictEqual(LinkHeader.format([{ target: "/c", rel: ["x\"; a=\"b c"] }]), "</c>; rel=\"x%22;%20a=%22b%20c\"")
  })

  it("FromString decodes and encodes through Schema", () => {
    const header = "<https://example.com/>; rel=\"canonical\""
    const links = Schema.decodeUnknownSync(LinkHeader.FromString)(header)
    assert.deepStrictEqual(links, [{ target: "https://example.com/", rel: ["canonical"], params: {} }])
    assert.strictEqual(Schema.encodeSync(LinkHeader.FromString)(links), header)
  })
})
