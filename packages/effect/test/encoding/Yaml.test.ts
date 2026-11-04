import { assert, describe, it } from "@effect/vitest"
import { Result } from "effect"
import * as Yaml from "effect/encoding/Yaml"
import * as YAML from "yaml"

const parse = (input: string): unknown => Result.getOrThrow(Yaml.parse(input))

const parseAll = (input: string): unknown => Result.getOrThrow(Yaml.parseAll(input))

const failureMessage = (input: string, decode: typeof Yaml.parse | typeof Yaml.parseAll = Yaml.parse): string => {
  const error = Result.getOrThrow(Result.flip(decode(input)))
  assert.strictEqual(error.kind, "Decode")
  assert.strictEqual(error.module, "Yaml")
  assert.strictEqual(error.input, input)
  return error.message
}

describe("Yaml", () => {
  it("parses nested block and flow collections", () => {
    assert.deepStrictEqual(
      parse(`
name: effect
enabled: true
ports: [3000, 3001]
database:
  host: localhost
  credentials:
    - user: root
      roles: [admin, writer]
    - user: guest
      roles: []
`),
      {
        name: "effect",
        enabled: true,
        ports: [3000, 3001],
        database: {
          host: "localhost",
          credentials: [
            { user: "root", roles: ["admin", "writer"] },
            { user: "guest", roles: [] }
          ]
        }
      }
    )
  })

  it("parses quoted and block scalars", () => {
    assert.deepStrictEqual(
      parse(`
quoted: "line\\nvalue"
literal: |
  first
  second
folded: >-
  first
  second
`),
      {
        quoted: "line\nvalue",
        literal: "first\nsecond\n",
        folded: "first second"
      }
    )
  })

  it("preserves paragraph and indentation breaks in folded block scalars", () => {
    assert.deepStrictEqual(
      parse(`
paragraph: >-
  first

  second
indented: >-
  first
    second
  third
`),
      {
        paragraph: "first\nsecond",
        indented: "first\n  second\nthird"
      }
    )
  })

  it.each([
    [
      "leading blanks before a more-indented first line",
      "message: >-2\n\n    first\n  second\n",
      "\n  first\nsecond"
    ],
    [
      "keep chomping after a more-indented final line",
      "message: >+2\n  first\n    second\n",
      "first\n  second\n"
    ],
    [
      "multiple blank paragraph lines",
      "message: >-\n  first\n\n\n  second\n",
      "first\n\nsecond"
    ],
    ["literal tab content", "message: |\n  all:\n  \tcc\n", "all:\n\tcc\n"],
    ["folded tab-led content", "message: >\n  a\n  \tb\n  c\n", "a\n\tb\nc\n"],
    ["whitespace-only content", "message: |\n  a\n    \n  b\n", "a\n  \nb\n"],
    ["explicit-indicator leading whitespace", "message: |1\n   \n  x\n", "  \n x\n"]
  ])("preserves %s", (_, source, expected) => {
    assert.deepStrictEqual(parse(source), { message: expected })
  })

  describe.each(["|", ">"])("block scalar chomping (%s)", (style) => {
    it.each([
      ["strip", "-", "  text\n\n\n", "text"],
      ["clip", "", "  text\n\n\n", "text\n"],
      ["keep", "+", "  text\n\n\n", "text\n\n\n"],
      ["keep without trailing empty lines", "+", "  text\n", "text\n"],
      ["empty clip", "", "", ""],
      ["empty keep", "+", "", ""],
      ["keep with only empty lines", "+", "\n\n", "\n\n"]
    ])("applies %s before a sibling key", (_, chomp, content, expected) => {
      assert.deepStrictEqual(parse(`message: ${style}${chomp}\n${content}next: 1\n`), {
        message: expected,
        next: 1
      })
    })

    // YAML 1.2.2 §8.1.1.2: end-of-input is not a final line break.
    it.each([
      ["clip without a final line break", "", "  text", "text"],
      ["keep without a final line break", "+", "  text", "text"],
      ["keep with trailing empty lines", "+", "  text\n\n\n", "text\n\n\n"]
    ])("applies %s at end-of-input", (_, chomp, content, expected) => {
      assert.deepStrictEqual(parse(`message: ${style}${chomp}\n${content}`), { message: expected })
    })
  })

  it("parses YAML 1.2.2 example 8.6 (empty scalar chomping)", () => {
    assert.deepStrictEqual(parse("strip: >-\n\nclip: >\n\nkeep: |+\n\n"), {
      strip: "",
      clip: "",
      keep: "\n"
    })
  })

  it("preserves kept trailing lines in block sequence entries", () => {
    assert.deepStrictEqual(parse("- |+\n  first\n\n- second\n"), ["first\n\n", "second"])
  })

  it.each([
    ["|", "    first\n    second\n", "first\nsecond\n"],
    [">-", "\n    first\n    second\n\n", "\nfirst second"],
    ["|2+", "    # text\n\n", "  # text\n\n"]
  ])("ends %s scalars before less-indented comments", (indicator, content, expected) => {
    assert.deepStrictEqual(parse(`message: ${indicator}\n${content} # outside\nnext: 1\n`), {
      message: expected,
      next: 1
    })
  })

  it("rejects less-indented block scalar content", () => {
    failureMessage("message: |\n    first\n  second\nnext: 1\n")
  })

  it("resolves aliases", () => {
    assert.deepStrictEqual(
      parse(`
defaults: &defaults
  host: localhost
  port: 5432
development:
  settings: *defaults
`),
      {
        defaults: { host: "localhost", port: 5432 },
        development: { settings: { host: "localhost", port: 5432 } }
      }
    )
  })

  it("rejects invalid indentation", () => {
    failureMessage("root:\n   child: true\n  sibling: false\n")
  })

  it("allows tabs on comment and blank lines outside scalars", () => {
    assert.deepStrictEqual(parse("a: 1\n\t# comment\n\t\nb: 2\n"), { a: 1, b: 2 })
  })

  it.each([
    ["structural indentation", "root:\n\tchild: true\n"],
    ["below block content indentation", "text: |\n  x\n\t\nnext: 1\n"],
    ["plain continuation", "text: a\n\t\n  b\n"],
    ["single-quoted continuation", "text: 'a\n\tb'\n"],
    ["double-quoted continuation", "text: \"a\n\tb\"\n"]
  ])("rejects tabs in %s", (_, source) => {
    assert.match(failureMessage(source), /Tabs cannot be used for YAML indentation/)
  })

  it("rejects leading empty lines more indented than the first block content line", () => {
    failureMessage("text: |\n    \n  \tx\n")
  })

  // YAML 1.2.2 §8.2.1: a mapping value's block sequence may be indentless.
  describe("indentless sequences", () => {
    it.each([
      {
        name: "top-level mapping value",
        source: "allowed-tools:\n- Read\n- Bash\n",
        expected: { "allowed-tools": ["Read", "Bash"] }
      },
      {
        name: "nested mapping value",
        source: "metadata:\n  tools:\n  - Read\n",
        expected: { metadata: { tools: ["Read"] } }
      },
      {
        name: "multiple sequences and sibling keys",
        source: "tools:\n- Read\n- Bash\nroles:\n- admin\nenabled: true\n",
        expected: { tools: ["Read", "Bash"], roles: ["admin"], enabled: true }
      },
      {
        name: "comments and blank lines before and between items",
        source: "tools: # key comment\n# before sequence\n\n- Read # item comment\n  # between items\n\n- Bash\n",
        expected: { tools: ["Read", "Bash"] }
      },
      {
        name: "nested mapping items and their indentless sequences",
        source: "steps:\n- name: deploy\n  tools:\n  - Read\n  - Bash\n  enabled: true\n- name: verify\n",
        expected: { steps: [{ name: "deploy", tools: ["Read", "Bash"], enabled: true }, { name: "verify" }] }
      },
      {
        name: "nested sequences ending at mapping boundaries",
        source: "metadata:\n  tools:\n  - Read\n  roles:\n  - admin\n  enabled: true\nname: deploy\n",
        expected: { metadata: { tools: ["Read"], roles: ["admin"], enabled: true }, name: "deploy" }
      },
      {
        name: "multiline descriptions alongside sequences",
        source:
          "description: Deploy the service\n  and verify it.\ntools:\n- Read\nmetadata:\n  description: 'Check\n    the logs'\n  tools:\n  - Bash\n",
        expected: {
          description: "Deploy the service and verify it.",
          tools: ["Read"],
          metadata: { description: "Check the logs", tools: ["Bash"] }
        }
      }
    ])("parses $name", ({ source, expected }) => {
      assert.deepStrictEqual(parse(source), expected)
    })
  })

  // YAML 1.2.2 §8.2.1: a sequence entry's mapping is indented to its first key.
  // Expected values and rejection fixtures were checked with yaml 2.9.1 and js-yaml 4.3.2.
  describe("sequence entry mappings indented past the dash", () => {
    it.each([
      {
        name: "root sequence",
        source: "-   name: a\n    age: 1\n",
        expected: [{ name: "a", age: 1 }]
      },
      {
        name: "indentless sequence",
        source: "items:\n-   name: a\n    age: 1\n-   name: b\n    age: 2\n",
        expected: { items: [{ name: "a", age: 1 }, { name: "b", age: 2 }] }
      }
    ])("parses $name", ({ source, expected }) => {
      assert.deepStrictEqual(parse(source), expected)
    })

    it.each([
      ["two spaces", "-   name: a\n  age: 1\n"],
      ["three spaces", "-   name: a\n   age: 1\n"]
    ])("rejects a later key indented by %s", (_, source) => {
      failureMessage(source)
    })

    it("rejects a tab before the first key", () => {
      assert.match(failureMessage("- \tname: a\n   age: 1\n"), /Tabs cannot be used for YAML indentation/)
    })
  })

  // YAML 1.2.2 §§6.5–6.7 and 7.3.1–7.3.3: flow scalar folding and comments.
  // Expected values and rejection fixtures were checked with yaml 2.9.1.
  describe("multiline flow scalars", () => {
    it.each([
      [
        "plain scalar starting below the key",
        "description:\n  Deploy the service\n  and verify it.\n",
        "Deploy the service and verify it."
      ],
      [
        "plain scalar starting on the key line",
        "description: Deploy the service\n  and verify it.\n",
        "Deploy the service and verify it."
      ],
      [
        "varying continuation indentation",
        "description:\n    Deploy\n  the service\n      and verify it.\n",
        "Deploy the service and verify it."
      ],
      ["one blank line", "description: Deploy\n\n  and verify.\n", "Deploy\nand verify."],
      ["multiple blank lines", "description: Deploy\n\n\n  and verify.\n", "Deploy\n\nand verify."],
      ["whitespace-only blank line", "description: Deploy\n   \n  and verify.\n", "Deploy\nand verify."],
      [
        "leading and trailing comments",
        "# before key\ndescription: # before value\n  # before scalar\n  Deploy\n  and verify. # after scalar\n# after value\n",
        "Deploy and verify."
      ],
      ["trailing whitespace", "description: Deploy  \n    and verify.  \n", "Deploy and verify."],
      ["CRLF line breaks", "description: Deploy\r\n  and verify.\r\n", "Deploy and verify."],
      ["double-quoted scalar", "description: \"Deploy it\n  and more\"\n", "Deploy it and more"],
      ["single-quoted scalar", "description: 'Deploy it\n  and more'\n", "Deploy it and more"],
      ["single-quoted apostrophe", "description: 'Deploy it\n  and don''t stop'\n", "Deploy it and don't stop"],
      ["double-quoted blank lines", "description: \"Deploy\n\n\n  and verify.\"\n", "Deploy\n\nand verify."],
      ["single-quoted blank line", "description: 'Deploy\n\n  and verify.'\n", "Deploy\nand verify."],
      ["quoted whitespace folding", "description: \"Deploy  \n    and verify.\"\n", "Deploy and verify."],
      ["double-quoted escaped line break", "description: \"De\\\n  ploy\"\n", "Deploy"],
      ["space before escaped line break", "description: \"Deploy \\\n  it\"\n", "Deploy it"],
      ["escaped line break followed by blank line", "description: \"Deploy\\\n\n  it\"\n", "Deploy it"],
      ["space before escaped line break followed by blank line", "description: \"Deploy \\\n\n  it\"\n", "Deploy  it"],
      ["escaped leading space after line break", "description: \"Deploy\\\n  \\ it\"\n", "Deploy it"],
      ["escaped trailing space before a folded break", "description: \"Deploy\\ \n  it\"\n", "Deploy  it"],
      // YAML 1.2.2 §5.7: a backslash followed by a literal tab escapes a tab.
      ["escaped literal tab before a folded break", "description: \"Deploy\\\t\n  it\"\n", "Deploy\t it"],
      ["escaped break followed by multiple blank lines", "description: \"Deploy\\\n\n\n  it\"\n", "Deploy\nit"],
      ["hash inside double quotes", "description: \"Deploy\n  # still text\" # comment\n", "Deploy # still text"],
      ["hash inside single quotes", "description: 'Deploy\n  # still text' # comment\n", "Deploy # still text"],
      [
        "colon and hash without separating spaces",
        "description: Visit https://example.com\n  for issue#123\n",
        "Visit https://example.com for issue#123"
      ],
      ["apostrophe in plain text before a comment", "description: Don't deploy # comment\n", "Don't deploy"],
      ["quote in plain text before a comment", "description: Use a \"quote # comment\n", "Use a \"quote"],
      ["single quote starting a plain continuation", "description: Deploy\n  'it # end\n", "Deploy 'it"],
      ["double quote starting a plain continuation", "description: Deploy\n  \"it # end\n", "Deploy \"it"],
      ["bracket and quote inside plain text", "description: plain [ a 'quote # comment\n", "plain [ a 'quote"]
    ])("folds %s", (_, source, expected) => {
      assert.deepStrictEqual(parse(source), { description: expected })
      const nested = source.split(/\r?\n/).map((line) => `  ${line}`).join("\n")
      assert.deepStrictEqual(parse(`metadata:\n${nested}`), { metadata: { description: expected } })
    })

    it("ends plain scalars at sibling keys after terminating comments", () => {
      assert.deepStrictEqual(
        parse("description: Deploy\n  and verify. # end\n# between keys\nenabled: true\n"),
        { description: "Deploy and verify.", enabled: true }
      )
    })

    it("folds plain sequence items", () => {
      assert.deepStrictEqual(parse("- Deploy\n  and verify.\n- Finish\n"), ["Deploy and verify.", "Finish"])
    })
  })

  // YAML 1.2.2 §§7.4–7.5: flow collections may span lines indented past the parent node.
  // Unlike the spec, the closing bracket may also sit at the parent's indentation.
  describe("multiline flow collections", () => {
    it.each(
      [
        [
          "JSON-style mapping below its key",
          "example:\n  {\n    \"active_anon\": 1572864,\n    \"active_file\": 5115904\n  }\n",
          { example: { active_anon: 1572864, active_file: 5115904 } }
        ],
        ["closing bracket at the parent indentation", "a: [\n  1,\n  2\n]\n", { a: [1, 2] }],
        ["nested collections", "a: {\n  b: [\n    1\n  ],\n  c: {d: 2}\n  }\n", { a: { b: [1], c: { d: 2 } } }],
        ["sibling key after the collection", "a: [\n  1\n  ]\nb: 2\n", { a: [1], b: 2 }],
        ["comment and blank lines", "a: [1, # one\n# between\n\n  2]\n", { a: [1, 2] }],
        ["quoted hash after a comma on a continuation line", "a: [\n  1, \"a # b\"\n  ]\n", { a: [1, "a # b"] }],
        ["multiline plain values", "a: [b\n  c, d\n\n  e]\n", { a: ["b c", "d\ne"] }],
        // YAML 1.2.2 §7.3: quoted scalars fold across lines inside flow collections too.
        ["multiline quoted items", "a: [\"x\n  y\", 'p\n\n  q']\nb: 1\n", { a: ["x y", "p\nq"], b: 1 }],
        ["multiline quoted keys and values", "a: {k: \"v\n  w\", 'k2\n  x': 1}\n", { a: { k: "v w", "k2 x": 1 } }],
        ["escaped line break in a quoted item", "a: [\"x\\\n  y\"]\n", { a: ["xy"] }],
        ["escaped trailing space before a quoted line break", "a: [\"x\\ \n  y\"]\n", { a: ["x  y"] }],
        ["escaped literal tab before a quoted line break", "a: [\"x\\\t\n  y\"]\n", { a: ["x\t y"] }],
        ["hash on a quoted continuation line", "a: [\"x\n  # y\"]\n", { a: ["x # y"] }],
        ["escaped single quote across lines", "a: ['it''s\n  ok']\n", { a: ["it's ok"] }],
        ["white space around a quoted line break", "a: [\"x  \n  \ty\"]\n", { a: ["x y"] }],
        ["quoted continuation at the collection's indentation", "a:\n  [\"x\n  y\"]\n", { a: ["x y"] }]
      ] as const
    )("parses %s", (_, source, expected) => {
      assert.deepStrictEqual(parse(source), expected)
    })

    it.each([
      ["continuation at the parent indentation", "a: {\nb: 1 }\n"],
      ["unterminated collection before a sibling key", "a: [1,\n  2\nb: 3\n"],
      ["content after the closing bracket", "a: [1,\n  2] extra\n"],
      ["quoted continuation at the parent indentation", "a: [\"x\ny\"]\n"],
      ["unterminated multiline quoted item", "a: [\"x\n  y]\n"],
      ["quoted hash at the parent indentation", "a: [\"x\n# y\"]\n"],
      ["quoted bracket at the parent indentation", "a: [\"x\n]y\"]\n"]
    ])("rejects %s", (_, source) => {
      failureMessage(source)
    })
  })

  // YAML 1.2.2 §7.4: a flow sequence entry may be a single `key: value` pair, read as a
  // one-entry mapping, and a flow mapping key may have no value. In flow context `: ` ends a
  // plain scalar. Expected values and rejection fixtures were checked with yaml 2.9.1 and js-yaml 4.3.2.
  describe("flow implicit pairs and keys without values", () => {
    it.each(
      [
        ["single pairs in a flow sequence", "x: [a: 1, b]\n", { x: [{ a: 1 }, "b"] }],
        ["quoted pair keys followed directly by a colon", "x: [\"a\": 1, 'b':2]\n", { x: [{ a: 1 }, { b: 2 }] }],
        ["a pair with an empty value", "x: [a: ]\n", { x: [{ a: null }] }],
        ["a pair with a flow value", "x: [a: [1, 2]]\n", { x: [{ a: [1, 2] }] }],
        ["colons that do not separate a pair", "x: [a:1, http://x]\n", { x: ["a:1", "http://x"] }],
        ["flow mapping keys without values", "x: {enabled, debug: true}\n", { x: { enabled: null, debug: true } }],
        ["a multi-word key without a value", "x: {a b, c: 1}\n", { x: { "a b": null, c: 1 } }],
        ["a last key without a value", "x: {a: 1, b}\n", { x: { a: 1, b: null } }],
        ["a key without a value before a continuation line", "x: {a: 1, b\n  , c: 2}\n", { x: { a: 1, b: null, c: 2 } }]
      ] as const
    )("parses %s", (_, source, expected) => {
      assert.deepStrictEqual(parse(source), expected)
    })

    it.each([
      ["a second separator in a sequence pair", "x: [a: b: c]\n"],
      ["a second separator after a sequence item", "x: [a, b: c: d]\n"],
      ["a second separator in a flow mapping value", "x: {a: b: c}\n"]
    ])("rejects %s", (_, source) => {
      failureMessage(source)
    })

    // YAML 1.2.2 §7.3.3 (ns-plain-safe-in): a plain flow scalar cannot contain a flow indicator.
    // `{a:1}` is the key `a:1` in YAML but `{a: 1}` in JSON-like input, so it fails rather than
    // giving either.
    it.each([
      ["an opening bracket in a key without a value", "x: {a[}\n"],
      ["an opening brace in a key without a value", "x: {a{}\n"],
      ["an opening bracket in a sequence pair key", "x: [a[: 1]\n"],
      ["a colon in a key without a value", "x: {a:1}\n"]
    ])("rejects %s with parse and parseAll", (_, source) => {
      failureMessage(source)
      failureMessage(source, Yaml.parseAll)
    })

    it("keeps flow indicators and colons in quoted keys", () => {
      const source = "x: {\"a[\", 'b{', \"c:1\", d: 1, http://e: 2}\ny: [\"a[\": 1]\n"
      const expected = { x: { "a[": null, "b{": null, "c:1": null, d: 1, "http://e": 2 }, y: [{ "a[": 1 }] }
      assert.deepStrictEqual(parse(source), expected)
      assert.deepStrictEqual(parseAll(source), [expected])
    })
  })

  // YAML 1.2.2 §7.3.3 (ns-plain-first): a plain scalar may start with `-` only when a
  // non-space character other than a flow indicator follows, so `- ` cannot start a flow node.
  // Expected values and rejection fixtures were checked with yaml 2.9.1 and js-yaml 4.3.2.
  describe("flow plain scalars starting with a dash", () => {
    it("parses a dash followed by content or a key's colon", () => {
      assert.deepStrictEqual(parse("a: {-: [-1, -x, b - c]}\n"), { a: { "-": [-1, "-x", "b - c"] } })
    })

    it.each([
      ["a dash and a space before an item", "a: [- 1]\n"],
      ["a dash and a tab before an item", "a: [-\t1]\n"],
      ["a lone dash before a closing bracket", "a: [1, -]\n"],
      ["a dash and a space before a key's colon", "a: {- : 1}\n"],
      ["a block sequence entry in a multiline collection", "a: [\n  - 1\n]\n"]
    ])("rejects %s", (_, source) => {
      failureMessage(source)
    })
  })

  describe("scalar conformance boundaries", () => {
    it.each([
      ["colon followed by space", "description: Use when: deploy\n"],
      ["colon at end of plain scalar", "description: Deploy:\n"],
      ["colon followed by tab", "description: Use when:\tdeploy\n"],
      ["colon in a continuation", "description: Deploy\n  when: ready\n"],
      ["continuation after an inline comment", "description: Deploy # end\n  and verify.\n"],
      ["continuation after a comment line", "description: Deploy\n  # end\n  and verify.\n"],
      ["continuation after a trailing continuation comment", "description: Deploy\n  and verify # end\n  again\n"],
      ["continuation after a comment following a literal single quote", "description: Deploy\n  'it # end\n  again\n"],
      ["continuation after a comment following a literal double quote", "description: Deploy\n  \"it # end\n  again\n"],
      ["unterminated double quote", "description: \"Deploy\n  and verify\n"],
      ["unterminated single quote", "description: 'Deploy\n  and verify\n"],
      ["content after closing double quote", "description: \"Deploy\n  it\" extra\n"],
      ["content after closing single quote", "description: 'Deploy\n  it' extra\n"],
      ["tab-indented scalar", "description:\n\tDeploy\n"],
      ["duplicate key", "description: first\ndescription: second\n"]
    ])("rejects %s", (_, source) => {
      failureMessage(source)
    })

    it("preserves numeric decoding and quoted colon content", () => {
      assert.deepStrictEqual(
        parse("description: 123\nquoted: 'Use when: deploy'\ntrailing: \"Deploy:\"\n"),
        { description: 123, quoted: "Use when: deploy", trailing: "Deploy:" }
      )
    })
    // YAML 1.2.2 §10.3.2: plain scalars resolve with the core schema, the same patterns the core
    // tags use. Expected values were checked with yaml 2.9.1 and js-yaml 4.3.2.
    it("resolves plain scalars with the core schema", () => {
      assert.deepStrictEqual(
        parse("a: tRuE\nb: nULL\nc: .iNf\nd: 0X1F\ne: 0O17\nf: 1_000\ng: _1\nh: 012\ni: -012\nj: 5.\nk: .5e3\nl: 0.\n"),
        {
          a: "tRuE",
          b: "nULL",
          c: ".iNf",
          d: "0X1F",
          e: "0O17",
          f: "1_000",
          g: "_1",
          h: 12,
          i: -12,
          j: 5,
          k: 500,
          l: 0
        }
      )
    })
  })

  describe("malformed content around compatibility shapes", () => {
    const shapes = [
      ["indentless sequence", "tools:\n- Read\n- Bash\n"],
      ["nested indentless sequence", "metadata:\n  tools:\n  - Read\n"],
      ["multiline plain scalar", "description: Deploy\n  and verify.\n"],
      ["multiline quoted scalar", "description: \"Deploy\n  and verify.\"\n"]
    ]
    it.each([
      ["unterminated flow sequence", "broken: [one, two\n"],
      ["unterminated flow mapping", "broken: {one: two\n"],
      ["unmatched top-level line", "broken: true\nunmatched\n"],
      ["tab indentation", "broken:\n\tchild: true\n"],
      ["invalid mapping indentation", "broken:\n   child: true\n  sibling: false\n"],
      ["duplicate keys", "broken: one\nbroken: two\n"]
    ])("rejects %s alone and before or after valid shapes", (_, malformed) => {
      failureMessage(malformed)
      for (const [, source] of shapes) {
        failureMessage(malformed + source)
        failureMessage(source + malformed)
      }
    })
  })

  // YAML 1.2.2 §8.2.1: a sequence entry may start a compact nested sequence on its own line.
  // Expected values were checked with yaml 2.9.1.
  describe("compact nested block sequences", () => {
    it.each(
      [
        ["an indentless mapping value", "a:\n- - 1\n  - 2\n", { a: [[1, 2]] }],
        ["an indented mapping value", "a:\n  - - 1\n    - 2\n", { a: [[1, 2]] }],
        ["a root sequence", "- - 1\n  - 2\n", [[1, 2]]],
        ["a blank line between nested entries", "- - 1\n\n  - 2\n", [[1, 2]]],
        ["a nested entry after a scalar item", "a:\n- 1\n- - 2\n", { a: [1, [2]] }],
        ["a nested mapping item", "a:\n- - b: 1\n", { a: [[{ b: 1 }]] }],
        ["a single-line nested sequence", "- - 1\n", [[1]]],
        ["an empty nested entry", "- -\n", [[null]]],
        ["three levels", "- - - 1\n    - 2\n  - 3\n- 4\n", [[[1, 2], 3], 4]],
        ["extra space after the outer dash", "-   - 1\n    - b: 1\n      c: 2\n", [[1, { b: 1, c: 2 }]]],
        [
          "anchors, aliases, flow collections and block scalars",
          "- - &a x\n  - *a\n  - [1, {b: c}]\n  - |\n    text\n",
          [["x", "x", [1, { b: "c" }], "text\n"]]
        ]
      ] as const
    )("parses %s", (_, source, expected) => {
      assert.deepStrictEqual(parse(source), expected)
    })

    it("parses YAML 1.2.2 example 8.15 (block sequence entry types)", () => {
      assert.deepStrictEqual(
        parse("- # Empty\n- |\n block node\n- - one # Compact\n  - two # sequence\n- one: two # Compact mapping\n"),
        [null, "block node\n", ["one", "two"], { one: "two" }]
      )
    })

    it.each([
      ["less-indented nested entry", "- - 1\n - 2\n"],
      ["nested sequence on a mapping key line", "a: - - 1\n"],
      ["sequence on a mapping key line", "a: - 1\n"]
    ])("rejects a %s", (_, source) => {
      failureMessage(source)
    })

    it.each(
      [
        ["mapping value", "a: one\n  - two\n", { a: "one - two" }],
        ["sequence item", "- one\n  - two\n", ["one - two"]],
        ["nested sequence item", "- - 1\n   - 2\n", [["1 - 2"]]]
      ] as const
    )("preserves a dash in a plain continuation of a %s", (_, source, expected) => {
      assert.deepStrictEqual(parse(source), expected)
    })
  })

  // YAML 1.2.2 §§6.2 and 8.2.1: a tab after `-` separates the indicator from the entry's node,
  // but a compact collection after the dash must be indented with spaces.
  // Expected values and rejection fixtures were checked with yaml 2.9.1.
  describe("tab after a sequence dash", () => {
    it.each(
      [
        ["a root entry", "-\t1\n", [1]],
        ["a later entry", "- 1\n-\t2\n", [1, 2]],
        ["an empty entry", "-\t\n- 2\n", [null, 2]],
        ["an indentless mapping value", "a:\n-\t1\n", { a: [1] }],
        ["a compact nested entry", "- -\t1\n", [[1]]]
      ] as const
    )("parses %s", (_, source, expected) => {
      assert.deepStrictEqual(parse(source), expected)
    })

    it.each([
      ["compact nested sequence", "-\t- 1\n"],
      ["compact mapping", "-\tk: v\n"]
    ])("rejects a tab before a %s", (_, source) => {
      assert.match(failureMessage(source), /Tabs cannot be used for YAML indentation/)
    })

    it.each([
      ["mapping key line", "a: -\t1\n"],
      ["document start line", "--- -\t1\n"]
    ])("rejects a sequence on the %s", (_, source) => {
      failureMessage(source)
    })
  })

  describe("document boundaries", () => {
    // YAML 1.2.2 §9.1.2: document markers must start at column zero.
    it.each([
      ["---", ""],
      ["---", " # comment"],
      ["...", ""],
      ["...", " # comment"]
    ])("preserves indented %s%s as a mapping value", (marker, suffix) => {
      assert.deepStrictEqual(parse(`a:\n  ${marker}${suffix}\n`), { a: marker })
      assert.deepStrictEqual(parse(`metadata:\n  a:\n    ${marker}${suffix}\n`), { metadata: { a: marker } })
    })

    // YAML 1.2.2 §9.2: a stream holds any number of documents. Expected values were checked with yaml 2.9.1.
    it.each(
      [
        ["mappings", "a: 1\n---\nb: 2\n", [{ a: 1 }, { b: 2 }]],
        ["sequences", "- one\n---\n- two\n", [["one"], ["two"]]],
        ["plain scalars", "one\n---\ntwo\n", ["one", "two"]],
        ["explicit initial marker", "---\na: 1\n--- # second document\nb: 2\n", [{ a: 1 }, { b: 2 }]],
        ["empty first document", "---\n---\nb: 2\n", [null, { b: 2 }]],
        ["empty trailing document", "a: 1\n---\n", [{ a: 1 }, null]],
        ["end marker before a start marker", "a: 1\n...\n---\nb: 2\n", [{ a: 1 }, { b: 2 }]],
        ["bare document after an end marker", "a: 1\n...\nb: 2\n", [{ a: 1 }, { b: 2 }]],
        ["content on start marker lines", "--- a\n--- [1, 2]\n--- &x {b: 1}\n", ["a", [1, 2], { b: 1 }]],
        ["start marker content after a mapping", "a: 1\n--- {b: 2}\n--- \"x: y\"\n", [{ a: 1 }, { b: 2 }, "x: y"]],
        ["an anchored empty document", "--- &a\n--- b\n", [null, "b"]],
        [
          "quoted hashes on start marker lines",
          "--- \"a # b\"\n--- 'a # b'\n--- [\"a # b\"]\n",
          ["a # b", "a # b", ["a # b"]]
        ],
        [
          "separation whitespace after markers and directives",
          "a: 1\n... \t\n%YAML\t1.2 \n---\nb: 2\n",
          [{ a: 1 }, { b: 2 }]
        ],
        ["byte order marks in document prefixes", "1\n...\n\uFEFF---\n2\n...\n\uFEFF%YAML 1.2\n---\n3\n", [1, 2, 3]]
      ] as const
    )("parses a stream of %s with parseAll and rejects it in parse", (_, source, expected) => {
      assert.deepStrictEqual(parseAll(source), expected)
      assert.match(failureMessage(source), /parseAll/)
    })

    it.each([
      ["empty input", ""],
      ["comment-only input", "# comment\n\n"]
    ])("parses %s as an empty stream", (_, source) => {
      assert.deepStrictEqual(parseAll(source), [])
    })

    // yaml 2.9.1 reports an extra empty document for example 9.3; the expected values follow the spec.
    it.each(
      [
        [
          "2.7",
          "# Ranking of 1998 home runs\n---\n- Mark McGwire\n- Sammy Sosa\n- Ken Griffey\n\n# Team ranking\n---\n- Chicago Cubs\n- St Louis Cardinals\n",
          [["Mark McGwire", "Sammy Sosa", "Ken Griffey"], ["Chicago Cubs", "St Louis Cardinals"]]
        ],
        [
          "2.8",
          "---\ntime: 20:03:20\nplayer: Sammy Sosa\naction: strike (miss)\n...\n---\ntime: 20:03:47\nplayer: Sammy Sosa\naction: grand slam\n...\n",
          [
            { time: "20:03:20", player: "Sammy Sosa", action: "strike (miss)" },
            { time: "20:03:47", player: "Sammy Sosa", action: "grand slam" }
          ]
        ],
        ["9.2", "%YAML 1.2\n---\nDocument\n... # Suffix\n", ["Document"]],
        [
          "9.3",
          "Bare\ndocument\n...\n# No document\n...\n|\n%!PS-Adobe-2.0 # Not the first line\n",
          ["Bare document", "%!PS-Adobe-2.0 # Not the first line\n"]
        ],
        ["9.4", "---\n{ matches\n% : 20 }\n...\n---\n# Empty\n...\n", [{ "matches %": 20 }, null]],
        ["9.5", "%YAML 1.2\n--- |\n%!PS-Adobe-2.0\n...\n%YAML 1.2\n---\n# Empty\n...\n", ["%!PS-Adobe-2.0\n", null]],
        ["9.6", "Document\n---\n# Empty\n...\n%YAML 1.2\n---\nmatches %: 20\n", ["Document", null, { "matches %": 20 }]]
      ] as const
    )("parses YAML 1.2.2 example %s with parseAll", (_, source, expected) => {
      assert.deepStrictEqual(parseAll(source), expected)
    })

    it("scopes anchors to their document", () => {
      assert.deepStrictEqual(parseAll("a: &x 1\nb: *x\n---\nc: &x 2\nd: *x\n"), [{ a: 1, b: 1 }, { c: 2, d: 2 }])
      assert.match(failureMessage("a: &x 1\n---\nb: *x\n", Yaml.parseAll), /alias/)
    })

    // YAML 1.2.2 §§6.8 and 9.2: only %YAML 1.2 is processed, and directives must precede a start marker.
    it.each([
      ["a directive without a start marker", "%YAML 1.2\na: 1\n"],
      ["a directive after a bare document", "a: 1\n%YAML 1.2\n---\nb: 2\n"],
      ["an unsupported YAML version", "%YAML 1.1\n---\na: yes\n"],
      ["a YAML directive with extra parameters", "%YAML 1.2 x\n---\na\n"],
      ["a TAG directive", "%TAG !e! tag:example.com,2000:\n---\na: 1\n"],
      ["an indented plain scalar starting with %", "a:\n  %foo\nb: 1\n"],
      ["content after an end marker following a mapping", "a: 1\n... trailing: 2\n"],
      ["a non-separation character after an end marker", "a: 1\n... \u00A0\n"],
      ["a non-separation character before an end marker comment", "a: 1\n... \u00A0 # tail\n"],
      ["an unsupported YAML version after a byte order mark", "1\n...\n\uFEFF%YAML 1.1\n---\na: yes\n"]
    ])("rejects %s", (_, source) => {
      failureMessage(source)
      failureMessage(source, Yaml.parseAll)
    })

    it.each(
      [
        ["mapping", "# before\n--- # start\na: 1\n... # end\n# after\n", { a: 1 }],
        ["sequence", "---\n- one\n- two\n...\n", ["one", "two"]],
        ["plain scalar", "---\none\n...\n", "one"],
        ["empty document", "---\n...\n", null],
        ["anchored empty document", "--- &a\n...\n", null],
        ["%YAML 1.2 directive", "%YAML 1.2\n---\nDocument\n... # Suffix\n", "Document"]
      ] as const
    )("preserves single-document markers around a %s", (_, source, expected) => {
      assert.deepStrictEqual(parse(source), expected)
    })
  })

  describe("merge keys", () => {
    it("merges mappings with explicit keys and earlier sources taking precedence", () => {
      const source = `base: &base {a: 1, b: 2}
other: &other {b: 3, c: 4}
block:
  c: 5
  <<: [*base, *other]
flow: {<<: *other, c: 5}
items:
  - <<: *base
    a: 5
`
      const result = parse(source)
      assert.deepStrictEqual(result, {
        base: { a: 1, b: 2 },
        other: { b: 3, c: 4 },
        block: { a: 1, b: 2, c: 5 },
        flow: { b: 3, c: 5 },
        items: [{ a: 5, b: 2 }]
      })
      assert.deepStrictEqual(Object.keys((result as { readonly flow: object }).flow), ["b", "c"])
    })

    it("merges through a plain << key that carries an anchor", () => {
      assert.deepStrictEqual(parse("&a <<: {x: 1}\nb: {&c <<: {y: 2}, z: 3}\n"), { x: 1, b: { y: 2, z: 3 } })
    })

    it("treats quoted merge keys as ordinary keys", () => {
      assert.deepStrictEqual(parse("\"<<\": 1\nflow: {'<<': 2}\n"), { "<<": 1, flow: { "<<": 2 } })
    })

    // Each merge copies its source's keys, so a chain of merges grows the output quadratically.
    it("rejects a document whose merges copy more than 100,000 keys", () => {
      const lines = ["a0: &a0 {k0: 0}"]
      for (let i = 1; i < 600; i++) lines.push(`a${i}: &a${i} {<<: *a${i - 1}, k${i}: ${i}}`)
      assert.match(failureMessage(`${lines.join("\n")}\n`), /merge/i)
    })

    it("merges within the budget", () => {
      const keys = Array.from({ length: 50 }, (_, i) => `k${i}: ${i}`).join(", ")
      const lines = [`base: &base {${keys}}`]
      for (let i = 0; i < 500; i++) lines.push(`m${i}: {<<: *base}`)
      const result = parse(`${lines.join("\n")}\n`) as Record<string, Record<string, number>>
      assert.strictEqual(Object.keys(result.m499).length, 50)
    })

    it.each(["<<: 1\n", "{<<: [{a: 1}, 2]}", "<<: {a: 1}\n<<: {b: 2}\n"])(
      "rejects invalid merge usage in %j",
      (source) => {
        failureMessage(source)
      }
    )
  })

  describe("anchors and quoted comment boundaries", () => {
    it.each([
      ["plain", "description: &text Deploy\n  and verify.\nalias: *text\n", "Deploy and verify."],
      [
        "single-quoted",
        "description: &text 'Deploy # first\n  # second' # end\nalias: *text\n",
        "Deploy # first # second"
      ],
      [
        "double-quoted",
        "description: &text \"Deploy # first\n  # second\" # end\nalias: *text\n",
        "Deploy # first # second"
      ]
    ])("resolves anchored multiline %s scalars", (_, source, expected) => {
      assert.deepStrictEqual(parse(source), { description: expected, alias: expected })
    })

    it("resolves anchored nested indentless sequences", () => {
      assert.deepStrictEqual(
        parse("metadata:\n  tools: &tools\n  - Read\n  - Bash\n  alias: *tools\n"),
        { metadata: { tools: ["Read", "Bash"], alias: ["Read", "Bash"] } }
      )
    })

    it("resolves anchors defined inside flow collections", () => {
      assert.deepStrictEqual(
        parse("mapping: {a: &value 1, b: *value}\nsequence: [&item one, *item, &empty, *empty]\nalias: *value\n"),
        { mapping: { a: 1, b: 1 }, sequence: ["one", "one", null, null], alias: 1 }
      )
    })

    it.each(["{a: &}", "[&item[1]]", "[&first &second 1]"])("rejects invalid flow anchor %s", (source) => {
      failureMessage(source)
    })

    it("preserves hashes in JSON-style flow strings without colon spacing", () => {
      assert.deepStrictEqual(parse("{\"description\":\"Deploy # now\"} # end\n"), { description: "Deploy # now" })
    })

    it("preserves hashes in single- and double-quoted flow sequence items", () => {
      assert.deepStrictEqual(
        parse("descriptions: [\"Deploy # now\", 'Verify # later'] # end\n"),
        { descriptions: ["Deploy # now", "Verify # later"] }
      )
    })
  })

  // Stage 3 hardening: input that used to acquire silent, misleading semantics.
  // YAML 1.2.2 §10.3: tags of the core schema resolve, and every other tag fails rather than
  // being kept as text. Expected values were checked with yaml 2.9.1, except `!!float 1`:
  // the core schema's float pattern matches it, while yaml 2.9.1 rejects it.
  describe("tags", () => {
    it.each(
      [
        ["!!str", "a: !!str 123\nb: !!str true\nc: !!str ~\nd: !!str\n", { a: "123", b: "true", c: "~", d: "" }],
        ["!!int", "a: !!int 0x10\nb: !!int \"42\"\nc: !!int -7\nd: !!int 0o17\n", { a: 16, b: 42, c: -7, d: 15 }],
        [
          "!!float",
          "a: !!float 1\nb: !!float \"2.5\"\nc: !!float -.Inf\nd: !!float 1e3\n",
          { a: 1, b: 2.5, c: Number.NEGATIVE_INFINITY, d: 1000 }
        ],
        ["!!bool", "a: !!bool true\nb: !!bool \"false\"\nc: !!bool True\n", { a: true, b: false, c: true }],
        ["!!null", "a: !!null ~\nb: !!null\nc: !!null \"\"\nd: !!null Null\n", { a: null, b: null, c: null, d: null }],
        [
          "!!seq and !!map",
          "a: !!seq\n- 1\nb: !!seq [2]\nc: !!map\n  d: 1\ne: !!map {f: 2}\n",
          { a: [1], b: [2], c: { d: 1 }, e: { f: 2 } }
        ],
        ["a document root tag", "--- !!seq\n- 1\n", [1]],
        [
          "tags in flow collections",
          "- !!int 1\n- [!!str 1, !!bool false]\n- {!!str 1: !!null }\n",
          [1, ["1", false], { "1": null }]
        ],
        ["empty flow scalars", "a: {b: !!str}\nc: [!!str , x]\n", { a: { b: "" }, c: ["", "x"] }],
        ["block keys with anchors", "!!str 1: x\n&k !!str foo: 1\nb: *k\n", { "1": "x", foo: 1, b: "foo" }],
        ["flow keys with anchors", "{&k !!str foo: 1, b: *k}\n", { foo: 1, b: "foo" }],
        ["anchors before and after tags", "a: !!str &x 1\nb: *x\nc: &y !!int \"7\"\nd: *y\n", {
          a: "1",
          b: "1",
          c: 7,
          d: 7
        }],
        ["block and quoted scalars", "a: !!str |\n  x\nb: !!str 'y'\n", { a: "x\n", b: "y" }],
        ["a root quoted scalar with a colon", "!!str \"x: y\"\n", "x: y"],
        ["a quoted sequence item with a colon", "- !!str \"x: y\"\n", ["x: y"]],
        ["quoted scalars with a hash", "a: !!str \"x # y\"\nb: [!!str \"x # y\"]\n", { a: "x # y", b: ["x # y"] }],
        ["a root flow mapping", "!!map {a: 1}\n", { a: 1 }],
        ["a tag before the end of a flow sequence", "a: [!!str]\n", { a: [""] }],
        ["quoted keys that look like collections", "!!str \"[1]\": a\nb: {!!str \"[2]\": c}\n", {
          "[1]": "a",
          b: { "[2]": "c" }
        }],
        ["a quoted ampersand", "a: !!str \"&\"\n", { a: "&" }],
        [
          "properties split across lines",
          "a: !!str\n  &a 0x10\nb: *a\nc: !!int\n  &c \"7\"\nd: *c\n",
          { a: "0x10", b: "0x10", c: 7, d: 7 }
        ],
        [
          "properties on later lines before an indentless sequence",
          "a: !!seq\n  &a\n- 1\nb: *a\nc: &c\n  !!seq\n- 2\nd: *c\ne:\n  !!seq &e\n- 3\nf: *e\n",
          { a: [1], b: [1], c: [2], d: [2], e: [3], f: [3] }
        ]
      ] as const
    )("resolves %s", (_, source, expected) => {
      assert.deepStrictEqual(parse(source), expected)
    })

    it.each([
      ["local tag", "a: !custom x\n"],
      ["non-specific tag", "a: ! x\n"],
      ["verbatim tag", "a: !<tag:yaml.org,2002:str> x\n"],
      ["YAML 1.1 !!binary tag", "a: !!binary aGk=\n"],
      ["YAML 1.1 !!timestamp tag", "a: !!timestamp 2001-12-14\n"],
      ["unknown !! tag", "a: !!foo x\n"]
    ])("rejects a %s", (_, source) => {
      assert.match(failureMessage(source), /tag/i)
    })

    it.each([
      ["!!int", "a: !!int x\n"],
      ["!!int", "a: !!int 1.5\n"],
      ["!!float", "a: !!float x\n"],
      ["!!float", "a: !!float 0x10\n"],
      ["!!bool", "a: !!bool yes\n"],
      ["!!null", "a: !!null x\n"],
      ["!!str", "a: !!str [1]\n"],
      ["!!seq", "a: !!seq {b: 1}\n"],
      ["!!seq", "a: !!seq x\n"],
      ["!!map", "a: !!map [1]\n"],
      ["!!map", "a: !!map\n"]
    ])("rejects content that does not match %s in %j", (_, source) => {
      assert.match(failureMessage(source), /tag/i)
    })

    // YAML 1.2.2 §§6.9 and 7.1: a node has at most one tag and one anchor, an alias has none,
    // and flow content is separated from its properties.
    it.each([
      ["a second tag on a block key", "!!str !!int 1: value\n"],
      ["an explicit key after a tag", "!!str ? bad: value\n"],
      ["two anchors after a flow tag", "[!!str &a &b foo, *a, *b]\n"],
      ["a tagged alias on the next line", "a: &a 42\nb: !!str\n  *a\n"],
      ["a second tag on the next line", "a: !!str\n  !!int 1\n"],
      ["a second anchor on the next line", "a: &x\n  &y 1\n"],
      ["flow content directly after a tag", "{a: !!seq[1]}\n"],
      ["a scalar tag on a flow sequence key", "!!str [1]: value\n"],
      ["a scalar tag on a flow sequence key in a flow mapping", "{!!str [1]: value}\n"],
      ["a scalar tag on a flow mapping key", "!!str {k: 1}: value\n"],
      // YAML 1.2.2 §6.9.2: an anchor has a name, and `&` cannot start a plain scalar.
      ["an empty anchor after a tag and anchor", "a: !!str &a &\nb: *a\n"],
      ["an empty anchor after a tag", "a: !!str &\n"],
      ["an empty anchor", "a: &\n"],
      ["an empty anchor before content", "a: & x\n"],
      ["an empty anchor on a key", "& : 1\n"]
    ])("rejects %s", (_, source) => {
      failureMessage(source)
    })

    it("keeps ampersands inside plain scalars", () => {
      assert.deepStrictEqual(parse("a: x &\nb: [y &]\n"), { a: "x &", b: ["y &"] })
    })

    it("keeps exclamation marks inside plain scalars", () => {
      assert.deepStrictEqual(parse("a: x!y\nb: hello!\n"), { a: "x!y", b: "hello!" })
    })
  })

  // Expected values were checked with yaml 2.9.1.
  describe("alias keys", () => {
    it("resolves aliases of scalars used as keys", () => {
      assert.deepStrictEqual(parse("a: &k key\n*k : 1\nb: &n 1\nc: {*n : 2}\n"), {
        a: "key",
        key: 1,
        b: 1,
        c: { "1": 2 }
      })
    })

    it("records anchors on keys", () => {
      assert.deepStrictEqual(parse("&k foo: 1\nb: *k\nc: {&f bar: 2, d: *f}\n"), {
        foo: 1,
        b: "foo",
        c: { bar: 2, d: "bar" }
      })
    })

    it("reads colons that belong to alias names", () => {
      assert.deepStrictEqual(parse("a: &a:b key\nb: {*a:b : 1}\nc: &c: other\n*c: : 2\n"), {
        a: "key",
        b: { key: 1 },
        c: "other",
        other: 2
      })
    })

    it("does not merge through an alias that resolves to <<", () => {
      assert.deepStrictEqual(parse("a: &k \"<<\"\nb: {*k : {x: 1}}\nc: &p <<\nd: {*p : {y: 2}}\n"), {
        a: "<<",
        b: { "<<": { x: 1 } },
        c: "<<",
        d: { "<<": { y: 2 } }
      })
    })

    // Expected values were checked with yaml 2.9.1.
    it.each(
      [
        ["hex", "{0x10: 1}\n", { "16": 1 }],
        ["null", "{null: 1}\n", { "": 1 }],
        ["anchored hex", "{&a 0x10: 1, b: *a}\n", { "16": 1, b: 16 }],
        ["anchored null", "{&a null: 1, b: *a}\n", { "": 1, b: null }]
      ] as const
    )("converts %s flow keys like block keys", (_, source, expected) => {
      assert.deepStrictEqual(parse(source), expected)
    })

    it("rejects aliases of collections used as keys", () => {
      assert.match(failureMessage("a: &k [1]\n*k : 2\n"), /alias/i)
    })
  })

  describe("explicit keys", () => {
    it.each([
      ["block scalar key", "? a\n: 1\n"],
      ["block collection key", "? [a, b]\n: 1\n"],
      ["flow mapping key", "{? a : 1}\n"]
    ])("rejects a %s", (_, source) => {
      assert.match(failureMessage(source), /explicit key/i)
    })
  })

  describe("nesting depth", () => {
    const flow = (depth: number) => "[".repeat(depth) + "]".repeat(depth)
    const block = (depth: number) => Array.from({ length: depth }, (_, i) => `${" ".repeat(i)}k:`).join("\n")

    it.each([["flow", flow], ["block", block]] as const)("allows 1000 nested %s collections", (_, nested) => {
      assert.isTrue(Result.isSuccess(Yaml.parse(nested(1000))))
    })

    it("counts a sequence item's mapping before its first value", () => {
      assert.isTrue(Result.isSuccess(Yaml.parse(`- k: ${flow(998)}\n`)))
      assert.match(failureMessage(`- k: ${flow(999)}\n`), /depth/i)
    })

    // Block input grows quadratically with depth, so its deep case stays at 5000 levels.
    it.each([["flow", flow, 100_000], ["block", block, 5000]] as const)(
      "rejects deeper %s nesting",
      (_, nested, deep) => {
        assert.match(failureMessage(nested(1001)), /depth/i)
        assert.match(failureMessage(nested(deep)), /depth/i)
      }
    )
  })

  // YAML 1.2.2 §5.5: only spaces and tabs are white space; NBSP and U+2028 are content.
  // Expected values were checked with yaml 2.9.1.
  describe("non-separation whitespace", () => {
    it.each(
      [
        ["trailing a plain value", "a: x   \n", { a: "x  " }],
        ["leading a plain value", "a:  x\n", { a: " x" }],
        ["before a hash", "a: x #y\n", { a: "x #y" }],
        ["in a block key", "x : 1\n", { "x ": 1 }],
        ["on a plain continuation line", "a: x\n   \n  y\n", { a: "x   y" }],
        ["at a quoted continuation", "a: \"x\n   y\"\n", { a: "x  y" }],
        ["in flow keys and values", "{a : [ b, c ]}\n", { "a ": [" b", "c "] }],
        ["as a line separator", "a: x \n", { a: "x " }],
        ["on a document start line", "---  a\n", " a"],
        [
          "in anchored values",
          "a: &k \u2028x\nb: *k\nc: &q \"\u2029y\"\nd: *q\n",
          { a: "\u2028x", b: "\u2028x", c: "\u2029y", d: "\u2029y" }
        ]
      ] as const
    )("keeps NBSP and U+2028 %s", (_, source, expected) => {
      assert.deepStrictEqual(parse(source), expected)
    })
  })

  describe("stringify", () => {
    // `yaml` is the reference implementation the module tracks; it checks the
    // output is valid YAML with the intended meaning, independent of `parse`,
    // and `parse` must then read the output back the same way.
    const oracle = (output: string): unknown => {
      const value = YAML.parse(output)
      assert.deepStrictEqual(parse(output), value)
      return value
    }

    it("prints scalars, nested collections, and empty collections", () => {
      const value = {
        name: "effect",
        enabled: true,
        nothing: null,
        ratio: 0.5,
        tags: ["a", "b"],
        empty: {},
        none: [],
        nested: { list: [{ id: 1 }, { id: 2, roles: ["admin"] }] }
      }
      const output = Result.getOrThrow(Yaml.stringify(value))
      assert.strictEqual(
        output,
        `name: effect
enabled: true
nothing: null
ratio: 0.5
tags:
  - a
  - b
empty: {}
none: []
nested:
  list:
    - id: 1
    - id: 2
      roles:
        - admin
`
      )
      assert.deepStrictEqual(oracle(output), value)
    })

    it("round-trips nested sequences and root scalars through the reference parser", () => {
      for (const value of [[[1, 2], [], [[null]]], "text", 42, null, true]) {
        assert.deepStrictEqual(oracle(Result.getOrThrow(Yaml.stringify(value))), value)
      }
    })

    it.each([
      ["plain text", "plain text"],
      ["1.5.0", "1.5.0"],
      ["true", "\"true\""],
      ["1", "\"1\""],
      ["1_000", "\"1_000\""],
      ["0x1F", "\"0x1F\""],
      ["~", "\"~\""],
      ["", "\"\""],
      ["- a", "\"- a\""],
      ["a: b", "\"a: b\""],
      ["a #b", "\"a #b\""],
      [" x", "\" x\""],
      ["x ", "\"x \""],
      ["---", "\"---\""]
    ])("prints %j as %s so it re-parses as the same string", (value, expected) => {
      const output = Result.getOrThrow(Yaml.stringify(value))
      assert.strictEqual(output, `${expected}\n`)
      assert.strictEqual(oracle(output), value)
    })

    // js-yaml 4.3.2 reads `---x` at the start of a line as a document marker followed by `x`.
    it("quotes strings and keys that start with a document marker", () => {
      assert.strictEqual(Result.getOrThrow(Yaml.stringify("---x")), "\"---x\"\n")
      assert.strictEqual(Result.getOrThrow(Yaml.stringify("...x")), "\"...x\"\n")
      assert.strictEqual(Result.getOrThrow(Yaml.stringify({ "---a": 1 })), "\"---a\": 1\n")
    })

    it("quotes mapping keys that would re-parse as other types", () => {
      const value = { "true": 1, "1": 2, "a: b": 3, "": 4 }
      const output = Result.getOrThrow(Yaml.stringify(value))
      assert.strictEqual(output, "\"1\": 2\n\"true\": 1\n\"a: b\": 3\n\"\": 4\n")
      assert.deepStrictEqual(oracle(output), value)
    })

    it("quotes the merge key so it stays a literal key", () => {
      const value = { "<<": { a: 1 }, b: 2 }
      const output = Result.getOrThrow(Yaml.stringify(value))
      assert.strictEqual(output, "\"<<\":\n  a: 1\nb: 2\n")
      assert.deepStrictEqual(YAML.parse(output, { merge: true }), value)
      assert.deepStrictEqual(parse(output), value)
    })

    it("fails for keys that do not fit an implicit key once printed", () => {
      // YAML 1.2.2 §7.4.2: an implicit key fits on one line within 1024 characters.
      const longest = "k".repeat(1024)
      const output = Result.getOrThrow(Yaml.stringify({ [longest]: 1 }))
      assert.deepStrictEqual(oracle(output), { [longest]: 1 })

      for (const key of ["k".repeat(1025), `${"k".repeat(1022)}: x`]) {
        const result = Yaml.stringify({ nested: { [key]: 1 } })
        assert.isTrue(Result.isFailure(result))
        if (Result.isFailure(result)) {
          assert.strictEqual(result.failure.kind, "Encode")
          assert.include(result.failure.message, "1024")
          assert.include(result.failure.message, "value.nested")
        }
      }
    })

    it.each([
      ["clipped", "first\nsecond\n", "|\n  first\n  second\n"],
      ["stripped", "first\nsecond", "|-\n  first\n  second\n"],
      ["kept", "first\n\n\n", "|+\n  first\n\n\n"],
      ["with blank lines", "first\n\nthird\n", "|\n  first\n\n  third\n"],
      ["with trailing spaces", "first \nsecond", "\"first \\nsecond\"\n"]
    ])("prints a multiline string %s as a literal block scalar when it is representable", (_, value, expected) => {
      const output = Result.getOrThrow(Yaml.stringify({ text: value }))
      assert.strictEqual(output, `text: ${expected}`)
      assert.deepStrictEqual(oracle(output), { text: value })
    })

    it.each([
      ["a C1 control", "\x80", "\"\\x80\""],
      ["a C1 control inside text", "a\x9fb", "\"a\\x9fb\""],
      ["a non-character", "\ufffe", "\"\\ufffe\""],
      ["a lone surrogate", "\ud800", "\"\\ud800\""],
      ["a lone surrogate in a multiline string", "a\nb\udc00", "\"a\\nb\\udc00\""],
      ["an interior byte order mark", "a\uFEFFb", "\"a\\ufeffb\""],
      ["an interior byte order mark in a multiline string", "a\nb\uFEFFc", "\"a\\nb\\ufeffc\""],
      ["a supplementary character, left plain", "\u{1F600}", "\u{1F600}"]
    ])("escapes %s so the output contains only printable characters", (_, value, expected) => {
      // YAML 1.2.2 §5.1: non-printable characters must be escaped on output.
      // §5.4: a byte order mark is not a content character outside quotes.
      const output = Result.getOrThrow(Yaml.stringify(value))
      assert.strictEqual(output, `${expected}\n`)
      assert.strictEqual(oracle(output), value)
    })

    it("escapes an interior byte order mark in a mapping key", () => {
      assert.strictEqual(Result.getOrThrow(Yaml.stringify({ "a\uFEFFb": 1 })), "\"a\\ufeffb\": 1\n")
    })

    it("prints non-finite numbers and negative zero so they round-trip", () => {
      const value = [Infinity, -Infinity, NaN, -0, 1e21]
      const output = Result.getOrThrow(Yaml.stringify(value))
      assert.strictEqual(output, "- .inf\n- -.inf\n- .nan\n- -0.0\n- 1e+21\n")
      assert.deepStrictEqual(oracle(output), value)
    })

    it("omits undefined properties, prints undefined items as null, and applies toJSON", () => {
      const value = {
        skipped: undefined,
        items: [undefined, 1],
        date: new Date("2024-01-02T03:04:05.000Z"),
        custom: { toJSON: () => ({ replaced: true }) },
        [Symbol("ignored")]: 1
      }
      assert.strictEqual(
        Result.getOrThrow(Yaml.stringify(value)),
        "items:\n  - null\n  - 1\ndate: 2024-01-02T03:04:05.000Z\ncustom:\n  replaced: true\n"
      )
      const sparse: Array<number> = []
      sparse[1] = 1
      assert.strictEqual(Result.getOrThrow(Yaml.stringify(sparse)), "- null\n- 1\n")
      assert.strictEqual(Result.getOrThrow(Yaml.stringify(new Array(2))), "- null\n- null\n")
    })

    it("indents nested collections by the indent option", () => {
      assert.strictEqual(
        Result.getOrThrow(Yaml.stringify({ a: { b: [1, { c: 2 }] } }, { indent: 4 })),
        "a:\n    b:\n        - 1\n        - c: 2\n"
      )
    })

    it.each([
      ["a root undefined", undefined, "value"],
      ["a bigint", { n: 1n }, "value.n"],
      ["a function", { handlers: [() => 1] }, "value.handlers[0]"],
      ["a symbol", { s: Symbol("s") }, "value.s"],
      ["a Map", { m: new Map() }, "value.m"],
      ["an instance whose prototype has a non-string constructor name", {
        nested: Object.create({ constructor: { name: Symbol("Name") } })
      }, "value.nested"],
      ["a class instance without toJSON", {
        d: new (class Point {
          x = 1
        })()
      }, "value.d"]
    ])("fails with the path of %s", (_, value, path) => {
      const result = Yaml.stringify(value)
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) {
        assert.strictEqual(result.failure.module, "Yaml")
        assert.strictEqual(result.failure.kind, "Encode")
        assert.strictEqual(result.failure.input, value)
        assert.include(result.failure.message, path)
      }
    })

    it("fails with the path of a cycle and prints shared references inline", () => {
      const cyclic: { items: Array<unknown> } = { items: [] }
      cyclic.items.push(cyclic)
      const result = Yaml.stringify(cyclic)
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) {
        assert.include(result.failure.message, "value.items[0]")
      }

      const shared = { port: 1 }
      assert.strictEqual(
        Result.getOrThrow(Yaml.stringify([shared, shared])),
        "- port: 1\n- port: 1\n"
      )
    })
  })

  describe("stringifyAll", () => {
    it("prints a document stream the reference parser reads back", () => {
      const documents = [{ a: 1 }, null, ["x"], "---"]
      const output = Result.getOrThrow(Yaml.stringifyAll(documents))
      assert.strictEqual(output, "a: 1\n---\nnull\n---\n- x\n---\n\"---\"\n")
      assert.deepStrictEqual(
        YAML.parseAllDocuments(output).map((document) => document.toJS()),
        documents
      )
      assert.deepStrictEqual(parseAll(output), documents)
    })

    it("prints an empty stream as an empty string and forwards the indent option", () => {
      assert.strictEqual(Result.getOrThrow(Yaml.stringifyAll([])), "")
      assert.strictEqual(
        Result.getOrThrow(Yaml.stringifyAll(new Set([{ a: [1] }]), { indent: 4 })),
        "a:\n    - 1\n"
      )
    })

    it("fails with the document index of an unsupported value", () => {
      const result = Yaml.stringifyAll([1, { n: 2n }])
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) {
        assert.strictEqual(result.failure.module, "Yaml")
        assert.strictEqual(result.failure.kind, "Encode")
        assert.include(result.failure.message, "value[1].n")
      }
    })

    it("fails for a stream that is not iterable", () => {
      for (const values of [42, { 0: "a", length: 1 }]) {
        const result = Yaml.stringifyAll(values as any)
        assert.isTrue(Result.isFailure(result))
        if (Result.isFailure(result)) {
          assert.strictEqual(result.failure.module, "Yaml")
          assert.strictEqual(result.failure.kind, "Encode")
        }
      }
    })
  })
})
