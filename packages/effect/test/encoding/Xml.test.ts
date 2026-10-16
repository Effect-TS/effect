import { assert, describe, it } from "@effect/vitest"
import { Channel, Effect, Ref, Result, Stream } from "effect"
import { Xml } from "effect/encoding"

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
const BOM = String.fromCharCode(0xFEFF)

const start = (name: string, attributes: Record<string, string> = {}): Xml.Event => ({
  _tag: "StartElement",
  name,
  attributes
})
const end = (name: string): Xml.Event => ({ _tag: "EndElement", name })
const text = (text: string): Xml.Event => ({ _tag: "Text", text })
const comment = (text: string): Xml.Event => ({ _tag: "Comment", text })
const pi = (target: string, data: string): Xml.Event => ({ _tag: "ProcessingInstruction", target, data })

const decodeString = (chunks: ReadonlyArray<string>, options?: Xml.DecodeOptions) =>
  Stream.fromIterable(chunks, { chunkSize: 1 }).pipe(
    Stream.pipeThroughChannel(Xml.decodeString(options)),
    Stream.runCollect
  )

const decodeBytes = (chunks: ReadonlyArray<Uint8Array>, options?: Xml.DecodeOptions) =>
  Stream.fromIterable(chunks, { chunkSize: 1 }).pipe(
    Stream.pipeThroughChannel(Xml.decode(options)),
    Stream.runCollect
  )

const encodeString = (events: ReadonlyArray<Xml.Event>) =>
  Stream.fromIterable(events).pipe(
    Stream.pipeThroughChannel(Xml.encodeString()),
    Stream.mkString
  )

const elements = (xml: string, path: ReadonlyArray<string>, options?: Xml.ElementsOptions) =>
  Stream.make(xml).pipe(
    Stream.pipeThroughChannel(Xml.decodeString()),
    Stream.pipeThroughChannel(Xml.elements(path, options)),
    Stream.runCollect
  )

// The kind and position of an XML error
const failure = <A>(effect: Effect.Effect<A, Xml.XmlError>) =>
  Effect.map(Effect.flip(effect), (error) => [error.kind, error.line, error.column])

// One-character chunks, and every split into two chunks
const splits = (input: string): Array<Array<string>> => {
  const out: Array<Array<string>> = [input.split("")]
  for (let i = 0; i <= input.length; i++) out.push([input.slice(0, i), input.slice(i)])
  return out
}

const byteSplits = (bytes: Uint8Array): Array<Array<Uint8Array>> => {
  const out: Array<Array<Uint8Array>> = [Array.from(bytes, (byte) => Uint8Array.of(byte))]
  for (let i = 0; i <= bytes.length; i++) out.push([bytes.subarray(0, i), bytes.subarray(i)])
  return out
}

describe("Xml", () => {
  it("identifies Xml errors", () => {
    assert.isTrue(Xml.isXmlError(new Xml.XmlError({ kind: "Syntax", message: "boom" })))
    assert.isFalse(Xml.isXmlError({ _tag: "XmlError" }))
    assert.isFalse(Xml.isXmlError(null))
  })

  describe("decode", () => {
    it.effect("decodes documents split at every index with fresh state per run", () =>
      Effect.gen(function*() {
        const document = BOM + `<?xml version="1.0" encoding="UTF-8"?>
<!-- prolog -->
<!DOCTYPE feed PUBLIC "-//A//B" "feed.dtd" [
  <!ENTITY note "a ]> b">
  <!-- ]> -->
  <?skip ]>?>
  <!ATTLIST feed lang CDATA '>]'>
]>
<feed lang = 'en' title="Tom &amp; &#x4A;erry">a &lt;b&gt;&#13;\r\nc<![CDATA[<raw>&amp;]]>d<br/><e
  x="1"></e><!--inner--><?pi data ?>
</feed>
<!-- epilog -->
`
        const expected: ReadonlyArray<Xml.Event> = [
          { _tag: "Declaration", version: "1.0", encoding: "UTF-8" },
          comment(" prolog "),
          { _tag: "Doctype", name: "feed", publicId: "-//A//B", systemId: "feed.dtd" },
          start("feed", { lang: "en", title: "Tom & Jerry" }),
          text("a <b>\r\nc<raw>&amp;d"),
          start("br"),
          end("br"),
          start("e", { x: "1" }),
          end("e"),
          comment("inner"),
          pi("pi", "data "),
          text("\n"),
          end("feed"),
          comment(" epilog ")
        ]
        for (const chunks of splits(document)) {
          assert.deepStrictEqual(yield* decodeString(chunks), expected)
        }
        const channel = Xml.decodeString()
        const run = (xml: string) => Stream.make(xml).pipe(Stream.pipeThroughChannel(channel), Stream.runCollect)
        assert.deepStrictEqual(yield* run("<a/>"), [start("a"), end("a")])
        assert.deepStrictEqual(yield* run("<b/>"), [start("b"), end("b")])
      }))

    it.effect("decodes text, references and CDATA sections", () =>
      Effect.gen(function*() {
        const xml = "<a b=\"x\ty\r\nz&#10;&#9;&quot;\" c='&apos;\"'>&lt;&gt;&amp;&apos;&quot;&#65;&#x42;\r\n\r&#13;</a>"
        assert.deepStrictEqual(yield* decodeString([xml]), [
          start("a", { b: "x y z\n\t\"", c: "'\"" }),
          text("<>&'\"AB\n\n\r"),
          end("a")
        ])
        // Text and CDATA sections are merged until the next markup
        assert.deepStrictEqual(yield* decodeString(["<a>x<![CDATA[<y>]]]]>z<!--c-->w<![CDATA[]]></a>"]), [
          start("a"),
          text("x<y>]]z"),
          comment("c"),
          text("w"),
          end("a")
        ])
        assert.deepStrictEqual(yield* decodeString(["<a><![CDATA[]]></a>"]), [start("a"), end("a")])
        // Whitespace is reported inside the root element only
        assert.deepStrictEqual(yield* decodeString(["\n <a>\n <b /> </a>\n\t"]), [
          start("a"),
          text("\n "),
          start("b"),
          end("b"),
          text(" "),
          end("a")
        ])
        // "&", CR and "]]>" in attributes and CDATA sections between text runs
        for (const chunks of splits("<a>p<b c=\"&amp;]]>\r\"/>q\r\nr<![CDATA[&\r]]>s&lt;</a>")) {
          assert.deepStrictEqual(yield* decodeString(chunks), [
            start("a"),
            text("p"),
            start("b", { c: "&]]> " }),
            end("b"),
            text("q\nr&\ns<"),
            end("a")
          ])
        }
      }))

    it.effect("decodes declarations and DOCTYPEs without expanding entities", () =>
      Effect.gen(function*() {
        assert.deepStrictEqual(
          yield* decodeString(["<?xml version='1.1' standalone=\"no\" ?><?a?><?b  c?><r/><?xml-stylesheet d?>"]),
          [
            { _tag: "Declaration", version: "1.1", standalone: false },
            pi("a", ""),
            pi("b", "c"),
            start("r"),
            end("r"),
            pi("xml-stylesheet", "d")
          ]
        )
        assert.deepStrictEqual(yield* decodeString(["<!DOCTYPE r SYSTEM 'r.dtd'><r/>"]), [
          { _tag: "Doctype", name: "r", systemId: "r.dtd" },
          start("r"),
          end("r")
        ])
        const doctype = "<!DOCTYPE a [\n<!ENTITY e \"]>\"><!ELEMENT a (#PCDATA|b)*><!ATTLIST a b CDATA 'x'>\n" +
          "<!NOTATION n PUBLIC 'n'><!ENTITY % p '<!ENTITY q \"\">'>%p;<!-- ]> --><?p ]>?>]>"
        for (const chunks of splits(doctype + "<a/>")) {
          // Default attribute values are not applied
          assert.deepStrictEqual(yield* decodeString(chunks), [{ _tag: "Doctype", name: "a" }, start("a"), end("a")])
        }
        assert.deepStrictEqual(yield* failure(decodeString([doctype + "\n<a>&e;</a>"])), ["Unsupported", 4, 4])
        const xxe = "<!DOCTYPE a [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]><a>&xxe;</a>"
        assert.deepStrictEqual(yield* failure(decodeString([xxe])), ["Unsupported", 1, xxe.indexOf("&xxe;") + 1])
        const laughs = "<!DOCTYPE a [<!ENTITY a \"x\"><!ENTITY b \"&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;\">]><a b=\"&b;\"/>"
        assert.deepStrictEqual(yield* failure(decodeString([laughs])), ["Unsupported", 1, laughs.indexOf("&b;") + 1])
        for (
          const subset of [
            "<!ELEMENT a (b|c,d)>",
            "<!ELEMENT a (#PCDATA|b)>",
            "<!ATTLIST a b CDATA>",
            "<!ENTITY e \"%p;\">",
            "<!ENTITY e PUBLIC 'p'>",
            "<!FOO a>",
            "\"x\""
          ]
        ) {
          assert.deepStrictEqual((yield* failure(decodeString([`<!DOCTYPE a [${subset}]><a/>`])))[0], "Syntax")
        }
      }))

    it.effect("decodes UTF-8 bytes", () =>
      Effect.gen(function*() {
        const bytes = textEncoder.encode(BOM + "<名前 é=\"日本\">😀 &#x1F600;</名前>")
        for (const chunks of byteSplits(bytes)) {
          assert.deepStrictEqual(yield* decodeBytes(chunks), [
            start("名前", { "é": "日本" }),
            text("😀 😀"),
            end("名前")
          ])
        }
        assert.deepStrictEqual(yield* decodeString(["", BOM, "<a/>"]), [start("a"), end("a")])
        // Invalid UTF-8 and invalid characters after non-ASCII text
        const invalid: ReadonlyArray<readonly [Uint8Array, number, number]> = [
          [Uint8Array.of(...textEncoder.encode("<a>\né"), 0xFF, ...textEncoder.encode("</a>")), 2, 2],
          [Uint8Array.of(...textEncoder.encode("<a>"), 0xC0, 0x80, ...textEncoder.encode("</a>")), 1, 4],
          [textEncoder.encode("<a/>€").subarray(0, -1), 1, 5],
          [textEncoder.encode("<a>é日本" + String.fromCharCode(0xFFFE) + "</a>"), 1, 7],
          [textEncoder.encode("<a>😀" + String.fromCharCode(1) + "</a>"), 1, 6]
        ]
        for (const [input, line, column] of invalid) {
          for (const chunks of byteSplits(input)) {
            assert.deepStrictEqual(yield* failure(decodeBytes(chunks)), ["Syntax", line, column])
          }
        }
        // Byte input accepts only UTF-8 and US-ASCII encoding declarations
        const latin1 = "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?><a/>"
        assert.deepStrictEqual(yield* failure(decodeBytes([textEncoder.encode(latin1)])), ["Unsupported", 1, 1])
        assert.deepStrictEqual((yield* decodeString([latin1]))[0], {
          _tag: "Declaration",
          version: "1.0",
          encoding: "ISO-8859-1"
        })
        const ascii = "<?xml version=\"1.0\" encoding=\"us-ascii\"?><a/>"
        assert.strictEqual((yield* decodeBytes([textEncoder.encode(ascii)])).length, 3)
      }))

    it.effect("fails on malformed documents with positions", () =>
      Effect.gen(function*() {
        const cases: ReadonlyArray<readonly [string, Xml.XmlError["kind"], number, number]> = [
          ["<a><b></a>", "Syntax", 1, 7],
          ["<a>\n<b>\n</c>", "Syntax", 3, 1],
          ["<a>\r\n<b>\r</c>", "Syntax", 3, 1],
          ["<a\r\n\r\nb='1'\r\rb='2'/>", "Syntax", 5, 1],
          [BOM + "<a><b></a>", "Syntax", 1, 7],
          ["<a>", "Syntax", 1, 4],
          ["", "Syntax", 1, 1],
          ["  ", "Syntax", 1, 3],
          ["</a>", "Syntax", 1, 1],
          ["<a/><b/>", "Syntax", 1, 5],
          ["<a/>x", "Syntax", 1, 5],
          ["x<a/>", "Syntax", 1, 1],
          ["<a b='1' b='2'/>", "Syntax", 1, 10],
          ["<a b=1/>", "Syntax", 1, 6],
          ["<a b>", "Syntax", 1, 5],
          ["<a b='<'/>", "Syntax", 1, 7],
          ["<a b='1'c='2'/>", "Syntax", 1, 9],
          ["<a/ >", "Syntax", 1, 4],
          ["<1a/>", "Syntax", 1, 2],
          ["<a>]]></a>", "Syntax", 1, 4],
          ["<a>x<![CDATA[y]]>z]]>", "Syntax", 1, 19],
          ["<a>&#0;</a>", "Syntax", 1, 4],
          ["<a>&#xD800;</a>", "Syntax", 1, 4],
          ["<a>&#X41;</a>", "Syntax", 1, 4],
          ["<a>& b</a>", "Syntax", 1, 4],
          ["<a>&foo;</a>", "Syntax", 1, 4],
          ["<a b='&foo;'/>", "Syntax", 1, 7],
          ["<a>" + String.fromCharCode(1) + "</a>", "Syntax", 1, 4],
          ["<a>" + String.fromCharCode(0xFFFE) + "</a>", "Syntax", 1, 4],
          ["<a>" + String.fromCharCode(0xD800) + "</a>", "Syntax", 1, 4],
          ["<a><!-- a -- b --></a>", "Syntax", 1, 11],
          ["<a><!-- a ---></a>", "Syntax", 1, 11],
          ["<a><![CDATA[x</a>", "Syntax", 1, 4],
          ["<![CDATA[x]]><a/>", "Syntax", 1, 1],
          ["<a><!x></a>", "Syntax", 1, 4],
          [" <?xml version='1.0'?><a/>", "Syntax", 1, 2],
          ["<?xml version='2.0'?><a/>", "Syntax", 1, 1],
          ["<?xml encoding='UTF-8'?><a/>", "Syntax", 1, 1],
          ["<a><?XML x?></a>", "Syntax", 1, 4],
          ["<a><?pi?x?></a>", "Syntax", 1, 8],
          [BOM + BOM + "<a/>", "Syntax", 1, 1],
          ["<a/><!DOCTYPE a>", "Syntax", 1, 5],
          ["<!DOCTYPE a><!DOCTYPE a><a/>", "Syntax", 1, 13],
          ["<!DOCTYPE a><a>&foo;</a>", "Unsupported", 1, 16]
        ]
        for (const [xml, kind, line, column] of cases) {
          for (const chunks of splits(xml)) {
            assert.deepStrictEqual(yield* failure(decodeString(chunks)), [kind, line, column], JSON.stringify(chunks))
          }
        }
        // Events completed before an error are emitted first
        for (const chunks of splits("<a><b/>text</c>")) {
          const results = yield* Stream.fromIterable(chunks, { chunkSize: 1 }).pipe(
            Stream.pipeThroughChannel(Xml.decodeString()),
            Stream.result,
            Stream.map(Result.match({ onFailure: (error) => error.kind, onSuccess: (event) => event._tag })),
            Stream.runCollect
          )
          assert.deepStrictEqual(results, ["StartElement", "StartElement", "EndElement", "Syntax"])
        }
      }))

    it.effect("limits token size and nesting depth", () =>
      Effect.gen(function*() {
        // The token in the middle of each document is its largest
        const limits: ReadonlyArray<readonly [string, string, string]> = [
          ["<a>", "0123456789", "</a>"],
          ["<a>", "<![CDATA[0123456789]]>", "</a>"],
          ["", "<a b='0123456789'/>", ""],
          ["", "<!--0123456789-->", "<a/>"],
          ["", "<?pi 0123456789?>", "<a/>"],
          ["", "<!DOCTYPE a [<!ENTITY e 'x'>]>", "<a/>"]
        ]
        for (const [before, token, after] of limits) {
          for (const chunks of splits(before + token + after)) {
            assert.isTrue((yield* decodeString(chunks, { maxTokenSize: token.length })).length > 0)
            assert.deepStrictEqual(
              yield* failure(decodeString(chunks, { maxTokenSize: token.length - 1 })),
              ["Limit", 1, before.length + 1]
            )
          }
        }
        // Text made of several parts fails at the part that exceeds the limit
        for (const chunks of splits("<a>\n\n<![CDATA[\n]]>&amp;</a>")) {
          assert.deepStrictEqual(yield* failure(decodeString(chunks, { maxTokenSize: 14 })), ["Limit", 3, 1])
          assert.deepStrictEqual(yield* failure(decodeString(chunks, { maxTokenSize: 19 })), ["Limit", 4, 4])
          assert.strictEqual((yield* decodeString(chunks, { maxTokenSize: 20 })).length, 3)
        }
        const nested = "<a><a><a/></a></a>"
        assert.strictEqual((yield* decodeString([nested], { maxDepth: 3 })).length, 6)
        assert.deepStrictEqual(yield* failure(decodeString([nested], { maxDepth: 2 })), ["Limit", 1, 7])
        const large = "x".repeat(10 * 1024 * 1024 + 1)
        assert.deepStrictEqual(yield* failure(decodeString(["<a>", large, "</a>"])), ["Limit", 1, 4])
        assert.deepStrictEqual(yield* decodeString(["<a>", large, "</a>"], { maxTokenSize: Infinity }), [
          start("a"),
          text(large),
          end("a")
        ])
      }))

    it("rejects invalid options at construction", () => {
      for (const value of [0, -1, Number.NaN]) {
        assert.throws(() => Xml.decodeString({ maxTokenSize: value }))
        assert.throws(() => Xml.decode({ maxDepth: value }))
        assert.throws(() => Xml.elements(["a"], { maxElementSize: value }))
      }
      assert.throws(() => Xml.elements([]))
      assert.throws(() => Xml.elements(["a b"]))
    })
  })

  describe("encode", () => {
    it.effect("writes events as escaped XML", () =>
      Effect.gen(function*() {
        const escaped = [start("a", { b: "<&>\"'\t\n\r" }), text("<&> ]]> \"' \t\n\r"), end("a")]
        const xml = "<a b=\"&lt;&amp;>&quot;'&#9;&#10;&#13;\">&lt;&amp;&gt; ]]&gt; \"' \t\n&#13;</a>"
        // Repeated runs check that the escaping patterns keep no state
        assert.strictEqual(yield* encodeString(escaped), xml)
        assert.strictEqual(yield* encodeString(escaped), xml)
        assert.deepStrictEqual(yield* decodeString([xml]), escaped)
        const events: ReadonlyArray<Xml.Event> = [
          { _tag: "Declaration", version: "1.0", encoding: "UTF-8", standalone: true },
          text("\n"),
          { _tag: "Doctype", name: "html", publicId: "-//W3C//DTD XHTML 1.0 Strict//EN", systemId: "x\"y" },
          comment(" c "),
          pi("xml-stylesheet", "href=\"s.xsl\""),
          start("html"),
          start("br"),
          end("br"),
          start("p", { "xml:lang": "en" }),
          text(""),
          end("p"),
          pi("t", ""),
          end("html"),
          text("\n")
        ]
        assert.strictEqual(
          yield* encodeString(events),
          "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n" +
            "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" 'x\"y'><!-- c -->" +
            "<?xml-stylesheet href=\"s.xsl\"?><html><br/><p xml:lang=\"en\"></p><?t?></html>\n"
        )
      }))

    it.effect("round trips decoded documents", () =>
      Effect.gen(function*() {
        const xml = "<?xml version=\"1.0\"?><!--c--><feed xmlns:a=\"urn:a\" a:b='&lt;\"'>" +
          "<a:entry>x &amp; <![CDATA[<y>]]>\r\n</a:entry><e/><?p d?></feed>"
        const events = yield* decodeString([xml])
        const bytes = yield* Stream.fromIterable(events).pipe(
          Stream.pipeThroughChannel(Xml.encode()),
          Stream.runCollect
        )
        assert.deepStrictEqual(yield* decodeBytes(bytes), events)
        assert.strictEqual(
          bytes.map((chunk) => textDecoder.decode(chunk)).join(""),
          "<?xml version=\"1.0\"?><!--c--><feed xmlns:a=\"urn:a\" a:b=\"&lt;&quot;\">" +
            "<a:entry>x &amp; &lt;y&gt;\n</a:entry><e/><?p d?></feed>"
        )
      }))

    it.effect("fails on events that do not form a document", () =>
      Effect.gen(function*() {
        const declaration: Xml.Event = { _tag: "Declaration", version: "1.0" }
        const doctype: Xml.Event = { _tag: "Doctype", name: "a" }
        const cases: ReadonlyArray<ReadonlyArray<Xml.Event>> = [
          [],
          [start("a")],
          [start("a"), end("b")],
          [end("a")],
          [start("a"), end("a"), start("b"), end("b")],
          [text("x"), start("a"), end("a")],
          [start("a"), end("a"), text("x")],
          [start("1a"), end("1a")],
          [start("a", { "b c": "" }), end("a")],
          [start("a"), text(String.fromCharCode(0)), end("a")],
          [start("a", { b: String.fromCharCode(0xFFFF) }), end("a")],
          [start("a"), comment("a--b"), end("a")],
          [start("a"), comment("a-"), end("a")],
          [start("a"), pi("xml", "x"), end("a")],
          [start("a"), pi("p", "?>"), end("a")],
          [start("a"), pi("p q", ""), end("a")],
          [comment(""), declaration, start("a"), end("a")],
          [{ _tag: "Declaration", version: "2.0" }, start("a"), end("a")],
          [start("a"), end("a"), doctype],
          [doctype, doctype, start("a"), end("a")],
          [{ _tag: "Doctype", name: "a", publicId: "p" }, start("a"), end("a")],
          [{ _tag: "Doctype", name: "a", systemId: "'\"" }, start("a"), end("a")]
        ]
        for (const events of cases) {
          const error = yield* Effect.flip(encodeString(events))
          assert.strictEqual(error.kind, "InvalidEvent", JSON.stringify(events))
        }
        // Byte output can only declare UTF-8 or US-ASCII
        const latin1 = Stream.make<ReadonlyArray<Xml.Event>>(
          { _tag: "Declaration", version: "1.0", encoding: "ISO-8859-1" },
          start("a"),
          end("a")
        )
        assert.strictEqual(
          yield* latin1.pipe(Stream.pipeThroughChannel(Xml.encodeString()), Stream.mkString),
          "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?><a/>"
        )
        const error = yield* latin1.pipe(Stream.pipeThroughChannel(Xml.encode()), Stream.runDrain, Effect.flip)
        assert.strictEqual(error.kind, "InvalidEvent")
        // Output written before an invalid event is emitted first
        const results = yield* Stream.make(start("a"), text("x"), end("b")).pipe(
          Stream.pipeThroughChannel(Xml.encodeString()),
          Stream.result,
          Stream.map(Result.match({ onFailure: (error) => error.kind, onSuccess: (xml) => xml })),
          Stream.runCollect
        )
        assert.deepStrictEqual(results, ["<a>x", "InvalidEvent"])
      }))
  })

  describe("elements", () => {
    it.effect("collects the elements at a path", () =>
      Effect.gen(function*() {
        const feed = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Feed</title>
  <item><title>One</title><link>https://a.example/?x=1&amp;y=2</link></item>
  <item><title>Two<!-- c --> &amp; <![CDATA[<b>]]></title><enclosure url="u" length="1"/></item>
</channel></rss>`
        assert.deepStrictEqual(yield* elements(feed, ["rss", "channel", "item"]), [
          {
            name: "item",
            attributes: {},
            children: [
              { name: "title", attributes: {}, children: ["One"] },
              { name: "link", attributes: {}, children: ["https://a.example/?x=1&y=2"] }
            ]
          },
          {
            name: "item",
            attributes: {},
            children: [
              { name: "title", attributes: {}, children: ["Two & <b>"] },
              { name: "enclosure", attributes: { url: "u", length: "1" }, children: [] }
            ]
          }
        ])
        assert.deepStrictEqual(yield* elements(feed, ["channel", "item"]), [])
        // Nested elements with the same name stay in their tree
        const xml = "<a><item id='1'><item id='2'>x</item></item><b><item/></b> <item id='3'/></a>"
        assert.deepStrictEqual(yield* elements(xml, ["a", "item"]), [
          {
            name: "item",
            attributes: { id: "1" },
            children: [{ name: "item", attributes: { id: "2" }, children: ["x"] }]
          },
          { name: "item", attributes: { id: "3" }, children: [] }
        ])
        assert.deepStrictEqual((yield* elements(xml, ["*", "*"])).map((element) => element.name), [
          "item",
          "b",
          "item"
        ])
        assert.deepStrictEqual((yield* elements(xml, ["a", "*", "item"])).map((element) => element.attributes), [
          { id: "2" },
          {}
        ])
      }))

    it.effect("fails on oversized elements and unbalanced events", () =>
      Effect.gen(function*() {
        // Sizes count names, attribute names and values, and text
        const xml = "<a><b c='12'>3</b><b>1234567</b></a>"
        assert.strictEqual((yield* elements(xml, ["a", "b"], { maxElementSize: 8 })).length, 2)
        assert.strictEqual((yield* Effect.flip(elements(xml, ["a", "b"], { maxElementSize: 7 }))).kind, "Limit")
        for (const events of [[end("a")], [start("a")]]) {
          const error = yield* Stream.fromIterable(events).pipe(
            Stream.pipeThroughChannel(Xml.elements(["a"])),
            Stream.runDrain,
            Effect.flip
          )
          assert.strictEqual(error.kind, "InvalidEvent")
        }
      }))
  })

  describe("channels", () => {
    it.effect("propagate upstream errors and done values", () =>
      Effect.gen(function*() {
        const failing = Stream.make("<a><b>").pipe(Stream.concat(Stream.fail("upstream")))
        const decoded = failing.pipe(Stream.pipeThroughChannel(Xml.decodeString<string>()))
        assert.strictEqual(yield* Effect.flip(Stream.runDrain(decoded)), "upstream")
        const collected = decoded.pipe(Stream.pipeThroughChannel(Xml.elements<Xml.XmlError | string>(["a"])))
        assert.strictEqual(yield* Effect.flip(Stream.runDrain(collected)), "upstream")
        const encoded = Stream.make(start("a")).pipe(
          Stream.concat(Stream.fail("upstream")),
          Stream.pipeThroughChannel(Xml.encodeString<string>())
        )
        assert.strictEqual(yield* Effect.flip(Stream.runDrain(encoded)), "upstream")

        const input = <A>(...values: ReadonlyArray<A>) =>
          Channel.fromIteratorArray(function*(): Generator<A, string> {
            yield* values
            return "done"
          })
        const events = [start("a"), end("a")]
        assert.strictEqual(yield* Channel.runDrain(Channel.pipeTo(input("<a/>"), Xml.decodeString())), "done")
        assert.strictEqual(
          yield* Channel.runDrain(Channel.pipeTo(input(textEncoder.encode("<a/>")), Xml.decode())),
          "done"
        )
        assert.strictEqual(yield* Channel.runDrain(Channel.pipeTo(input(...events), Xml.encodeString())), "done")
        assert.strictEqual(yield* Channel.runDrain(Channel.pipeTo(input(...events), Xml.encode())), "done")
        assert.strictEqual(yield* Channel.runDrain(Channel.pipeTo(input(...events), Xml.elements(["a"]))), "done")
      }))

    it.effect("do not pull input after downstream completes", () =>
      Effect.gen(function*() {
        const pulls = yield* Ref.make(0)
        const input = Stream.fromIterable(["<a>", "<item/>", "<item/>", "<item/>", "</a>"], { chunkSize: 1 }).pipe(
          Stream.tap(() => Ref.update(pulls, (n) => n + 1))
        )
        const first = yield* input.pipe(
          Stream.pipeThroughChannel(Xml.decodeString()),
          Stream.take(1),
          Stream.runCollect
        )
        assert.deepStrictEqual(first, [start("a")])
        assert.strictEqual(yield* Ref.get(pulls), 1)
        yield* Ref.set(pulls, 0)
        const item = yield* input.pipe(
          Stream.pipeThroughChannel(Xml.decodeString()),
          Stream.pipeThroughChannel(Xml.elements(["a", "item"])),
          Stream.take(1),
          Stream.runCollect
        )
        assert.deepStrictEqual(item, [{ name: "item", attributes: {}, children: [] }])
        assert.strictEqual(yield* Ref.get(pulls), 2)
      }))
  })
})
