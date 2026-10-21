import { assert, describe, it } from "@effect/vitest"
import * as Yaml from "effect/encoding/Yaml"

describe("Yaml", () => {
  it("parses nested block and flow collections", () => {
    assert.deepStrictEqual(
      Yaml.parse(`
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
      Yaml.parse(`
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
      Yaml.parse(`
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
    assert.deepStrictEqual(Yaml.parse(source), { message: expected })
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
      assert.deepStrictEqual(Yaml.parse(`message: ${style}${chomp}\n${content}next: 1\n`), {
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
      assert.deepStrictEqual(Yaml.parse(`message: ${style}${chomp}\n${content}`), { message: expected })
    })
  })

  it("parses YAML 1.2.2 example 8.6 (empty scalar chomping)", () => {
    assert.deepStrictEqual(Yaml.parse("strip: >-\n\nclip: >\n\nkeep: |+\n\n"), {
      strip: "",
      clip: "",
      keep: "\n"
    })
  })

  it("preserves kept trailing lines in block sequence entries", () => {
    assert.deepStrictEqual(Yaml.parse("- |+\n  first\n\n- second\n"), ["first\n\n", "second"])
  })

  it.each([
    ["|", "    first\n    second\n", "first\nsecond\n"],
    [">-", "\n    first\n    second\n\n", "\nfirst second"],
    ["|2+", "    # text\n\n", "  # text\n\n"]
  ])("ends %s scalars before less-indented comments", (indicator, content, expected) => {
    assert.deepStrictEqual(Yaml.parse(`message: ${indicator}\n${content} # outside\nnext: 1\n`), {
      message: expected,
      next: 1
    })
  })

  it("rejects less-indented block scalar content", () => {
    assert.throws(() => Yaml.parse("message: |\n    first\n  second\nnext: 1\n"), SyntaxError)
  })

  it("resolves aliases", () => {
    assert.deepStrictEqual(
      Yaml.parse(`
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
    assert.throws(() => Yaml.parse("root:\n   child: true\n  sibling: false\n"))
  })

  it("allows tabs on comment and blank lines outside scalars", () => {
    assert.deepStrictEqual(Yaml.parse("a: 1\n\t# comment\n\t\nb: 2\n"), { a: 1, b: 2 })
  })

  it.each([
    ["structural indentation", "root:\n\tchild: true\n"],
    ["below block content indentation", "text: |\n  x\n\t\nnext: 1\n"],
    ["plain continuation", "text: a\n\t\n  b\n"],
    ["single-quoted continuation", "text: 'a\n\tb'\n"],
    ["double-quoted continuation", "text: \"a\n\tb\"\n"]
  ])("rejects tabs in %s", (_, source) => {
    assert.throws(() => Yaml.parse(source), /Tabs cannot be used for YAML indentation/)
  })

  // YAML 1.2.2 §6.1, §6.2: tabs may separate tokens after the indentation, but never indent a block collection.
  // Checked with yaml 2.9.1.
  it.each(
    [
      ["escaped tab", "a: \"x\\\ty\"\n", { a: "x\ty" }],
      ["escaped tab before a folded line break", "a: \"x\\\t\n  y\"\n", { a: "x\t y" }],
      ["tab-led quoted continuation", "a: \"b\n  \tc\"\n", { a: "b c" }],
      ["tab-led plain continuation", "x:\n - x\n  \tx\n", { x: ["x x"] }],
      ["tab-led top-level continuation", "1st\n\t2nd\n", "1st 2nd"],
      ["tab before a scalar value line", "foo:\n \tbar\n", { foo: "bar" }],
      ["tab before a top-level flow mapping", "\t{}\n", {}],
      ["tab-led top-level flow sequence", "\t[\n\t]\n", []],
      ["tab after a sequence indicator", "-\tfoo\n-\t-1\n", ["foo", -1]],
      ["tab after a value indicator", "- foo:\t bar\n", [{ foo: "bar" }]],
      ["tab after an explicit value indicator", "? a\n:\tb\n", { a: "b" }]
    ] as const
  )("allows a %s", (_, source, expected) => {
    assert.deepStrictEqual(Yaml.parse(source), expected)
  })

  it.each([
    ["before a compact mapping", "?\tkey:\n"],
    ["before a block mapping", "foo:\n \tbar: 1\n"],
    ["indenting a mapping entry", "a: 1\n\tb: 2\n"],
    ["indenting a sequence entry", "- a\n\t- b\n"]
  ])("rejects a tab %s", (_, source) => {
    assert.throws(() => Yaml.parse(source), /Tabs cannot be used for YAML indentation/)
  })

  it("rejects leading empty lines more indented than the first block content line", () => {
    assert.throws(() => Yaml.parse("text: |\n    \n  \tx\n"), SyntaxError)
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
      assert.deepStrictEqual(Yaml.parse(source), expected)
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
      assert.deepStrictEqual(Yaml.parse(source), { description: expected })
      const nested = source.split(/\r?\n/).map((line) => `  ${line}`).join("\n")
      assert.deepStrictEqual(Yaml.parse(`metadata:\n${nested}`), { metadata: { description: expected } })
    })

    it("ends plain scalars at sibling keys after terminating comments", () => {
      assert.deepStrictEqual(
        Yaml.parse("description: Deploy\n  and verify. # end\n# between keys\nenabled: true\n"),
        { description: "Deploy and verify.", enabled: true }
      )
    })

    it("folds plain sequence items", () => {
      assert.deepStrictEqual(Yaml.parse("- Deploy\n  and verify.\n- Finish\n"), ["Deploy and verify.", "Finish"])
    })
  })

  // YAML 1.2.2 §§7.4–7.5: flow collections may span lines indented past the parent node.
  // Expected values and rejection fixtures were checked with yaml 2.9.1, which also
  // accepts a closing bracket at the parent indentation.
  describe("multiline flow collections", () => {
    it.each(
      [
        [
          "JSON-style mapping below its key",
          "example:\n  {\n    \"active_anon\": 1572864,\n    \"active_file\": 5115904\n  }\n",
          { example: { active_anon: 1572864, active_file: 5115904 } }
        ],
        ["mapping starting on its key line", "a: {\n  b: 1,\n  c: 2\n  }\n", { a: { b: 1, c: 2 } }],
        ["closing bracket at the parent indentation", "a: {\n  b: 1\n}\n", { a: { b: 1 } }],
        ["closing bracket below the value indentation", "a:\n  {\n    b: 1\n}\n", { a: { b: 1 } }],
        ["sequence item", "- [\n  1,\n  2\n]\n", [[1, 2]]],
        ["root collection", "{\n\"a\": [\n1\n]\n}\n", { a: [1] }],
        ["nested collections", "a: {\n  b: [\n    1\n  ],\n  c: {d: 2}\n  }\n", { a: { b: [1], c: { d: 2 } } }],
        ["sibling key after the collection", "a: [\n  1\n  ]\nb: 2\n", { a: [1], b: 2 }],
        ["comment and blank lines", "a: [1, # one\n# between\n\n  2]\n", { a: [1, 2] }],
        ["tab separation after the indentation", "a: [1,\n  \t2]\n", { a: [1, 2] }],
        ["multiline plain values", "a: [b\n  c, d\n\n  e]\n", { a: ["b c", "d\ne"] }],
        ["multiline plain keys", "a: {b\n  c: 1}\n", { a: { "b c": 1 } }],
        ["multiline double-quoted values", "a: [\"b\n  c\", \"d\\\n  e\"]\n", { a: ["b c", "de"] }],
        ["multiline single-quoted values", "a: ['b\n\n  c', 'd''\n  e']\n", { a: ["b\nc", "d' e"] }],
        ["multiline quoted keys", "a: {\"b\n  c\": 1}\n", { a: { "b c": 1 } }],
        ["hashes in multiline quoted scalars", "a: [\"b # c\n  # d\" # e\n  ]\n", { a: ["b # c # d"] }],
        ["comments after continuation entries", "a: [\n  b, # c\n  d # e\n  ]\n", { a: ["b", "d"] }],
        ["anchored collection", "a: &x [\n  1\n  ]\nb: *x\n", { a: [1], b: [1] }]
      ] as const
    )("parses %s", (_, source, expected) => {
      assert.deepStrictEqual(Yaml.parse(source), expected)
    })

    it.each([
      ["continuation at the parent indentation", "a: {\nb: 1 }\n"],
      ["closing bracket below the parent indentation", "x:\n  a: {\n    b: 1\n }\n"],
      ["tab indentation", "a: [1,\n\t2]\n"],
      ["unterminated collection before a sibling key", "a: [1,\n  2\nb: 3\n"],
      ["content after the closing bracket", "a: [1,\n  2] extra\n"],
      ["content after a closing bracket at the parent indentation", "a: [\n  1\n], b: 2\n"],
      ["document marker inside a root collection", "[\n1,\n---\n]\n"],
      ["unterminated multiline quoted scalar", "a: [\"b\n  c]\n"],
      ["quoted continuation at the parent indentation", "a: [\"b\nc\"]\n"]
    ])("rejects %s", (_, source) => {
      assert.throws(() => Yaml.parse(source), SyntaxError)
    })
  })

  // YAML 1.2.2 §§7.4, 8.2.2: explicit `?` keys, flow keys without values, and flow sequence pairs.
  // Expected values and rejection fixtures were checked with yaml 2.9.1.
  describe("explicit keys and flow pairs", () => {
    it.each(
      [
        ["explicit key and value", "? a\n: b\n", { a: "b" }],
        ["explicit keys without values", "? a\n? b\nc:\n", { a: null, b: null, c: null }],
        ["block scalar key", "? |\n  block\n: v\n", { "block\n": "v" }],
        ["multiline key and value", "? a\n  b\n: c\n  d\n", { "a b": "c d" }],
        ["comment between key and value", "? a\n# comment\n: b\n", { a: "b" }],
        ["implicit and explicit entries", "a: 1\n? b\n: 2\nc: 3\n", { a: 1, b: 2, c: 3 }],
        ["compact sequence value", "? a\n: - b\n  - c\n", { a: ["b", "c"] }],
        ["indentless sequence value", "? a\n:\n- b\n", { a: ["b"] }],
        ["nested mapping", "m:\n  ? a\n  : b\n", { m: { a: "b" } }],
        ["sequence entry", "- ? a\n  : b\n", [{ a: "b" }]],
        ["empty key", "?\n: v\n", { "": "v" }],
        ["flow keys without values", "{a, b: 1}\n", { a: null, b: 1 }],
        ["explicit flow keys", "{? a, ? b: 1}\n", { a: null, b: 1 }],
        ["flow sequence pairs", "[a: 1, b]\n", [{ a: 1 }, "b"]],
        ["explicit flow sequence pairs", "[? a: 1, ? b]\n", [{ a: 1 }, { b: null }]],
        ["adjacent value after a quoted key", "[\"a\":1]\n", [{ a: 1 }]],
        ["empty flow key", "{: a}\n", { "": "a" }],
        ["colon inside plain flow scalars", "{http://x: [http://y]}\n", { "http://x": ["http://y"] }],
        ["colon without a following space", "{a:1}\n", { "a:1": null }],
        ["empty flow value", "{a: }\n", { a: null }]
      ] as const
    )("parses %s", (_, source, expected) => {
      assert.deepStrictEqual(Yaml.parse(source), expected)
    })

    it.each([
      ["multiline implicit flow sequence pair key", "a: [b\n  : c]\n"],
      ["empty flow sequence entry", "[a, , b]\n"],
      ["leading comma in a flow sequence", "[, a]\n"],
      ["leading comma in a flow mapping", "{, a: 1}\n"],
      ["block sequence entry in a flow sequence", "[-]\n"],
      ["nested implicit flow mapping value", "{a: b: c}\n"],
      ["duplicate explicit key", "? a\n: 1\na: 2\n"]
    ])("rejects %s", (_, source) => {
      assert.throws(() => Yaml.parse(source), SyntaxError)
    })

    // Valid YAML, rejected because mapping keys are JavaScript strings.
    it.each([
      ["sequence key", "? [a]\n: v\n"],
      ["mapping key", "? a: 1\n: v\n"],
      ["flow collection key", "{[a]: v}\n"],
      ["flow sequence pair collection key", "[[a]: v]\n"],
      ["sequence key without indentation", "?\n- a\n:\n- c\n"]
    ])("rejects a %s", (_, source) => {
      assert.throws(() => Yaml.parse(source), /YAML collection keys are not supported/)
    })
  })

  // YAML 1.2.2 §§6.8.2, 6.9, 10.3: node properties, tag handles, and core schema tags.
  // Expected values and rejection fixtures were checked with yaml 2.9.1.
  describe("tags and anchors", () => {
    it.each(
      [
        ["!!str 123", "123"],
        ["!!str 0x10", "0x10"],
        ["!!int \"7\"", 7],
        ["!!int 0x1F", 31],
        ["!!float 1.5", 1.5],
        ["!!bool \"true\"", true],
        ["!!null \"\"", null],
        ["!!str", ""],
        ["!!null", null],
        ["! 12", "12"],
        ["!local 12", "12"],
        ["!<tag:yaml.org,2002:int> \"3\"", 3],
        ["!<!foo> 1", "1"],
        ["!!str |\n  12\n", "12\n"]
      ] as const
    )("resolves %j", (value, expected) => {
      assert.deepStrictEqual(Yaml.parse(`a: ${value}\n`), { a: expected })
    })

    // yaml 2.9.1 also resolves these YAML 1.1 tags, to a Buffer, a Date, and a Set.
    it("ignores tags outside the core schema", () => {
      assert.deepStrictEqual(Yaml.parse("a: !!binary aGk=\nb: !!timestamp 2001-12-14\nc: !!set {x}\n"), {
        a: "aGk=",
        b: "2001-12-14",
        c: { x: null }
      })
    })

    it.each(
      [
        ["core collection tags", "a: !!map {b: 1}\nc: !!seq [1]\n", { a: { b: 1 }, c: [1] }],
        ["block collection tags", "a: !!map\n  b: 1\nc: !!seq\n- 1\n", { a: { b: 1 }, c: [1] }],
        ["unknown collection tags", "a: !foo [1]\nb: !bar\n  c: 1\n", { a: [1], b: { c: 1 } }],
        ["anchor before tag", "a: &x !!int \"1\"\nb: *x\n", { a: 1, b: 1 }],
        ["tag before anchor", "a: !!int &x \"1\"\nb: *x\n", { a: 1, b: 1 }],
        ["tagged keys", "!!str 1: a\n", { "1": "a" }],
        ["anchored keys", "&k a: b\nc: *k\n", { a: "b", c: "a" }],
        ["alias keys", "&a a: &b b\n*b : *a\n", { a: "b", b: "a" }],
        ["anchor names with colons", "&a: key: &a value\nfoo: *a:\n", { key: "value", foo: "key" }],
        ["properties on separate lines", "key: &x\n !!map\n  a: b\nalias: *x\n", {
          key: { a: "b" },
          alias: { a: "b" }
        }],
        ["properties before an indentless sequence", "seq:\n &x\n- a\nalias: *x\n", { seq: ["a"], alias: ["a"] }],
        [
          "properties before a mapping key line",
          "top:\n  &x\n  &k key: value\nalias: *x\n",
          { top: { key: "value" }, alias: { key: "value" } }
        ],
        [
          "flow properties",
          "[&a a: b, !!str 1, {&e e: f}, &g {g: h}, *a, *g]\n",
          [{ a: "b" }, "1", { e: "f" }, { g: "h" }, "a", { g: "h" }]
        ],
        ["empty tagged flow nodes", "{a: !!str , !!str : b}\n", { a: "", "": "b" }],
        ["named tag handles", "%TAG !e! tag:example.com,2000:\n---\na: !e!foo 1\n", { a: "1" }],
        ["overridden secondary handle", "%TAG !! tag:example.com:\n---\na: !!int 1\n", { a: "1" }]
      ] as const
    )("parses %s", (_, source, expected) => {
      assert.deepStrictEqual(Yaml.parse(source), expected)
    })

    it.each([
      ["undefined tag handle", "a: !e!x 1\n"],
      ["empty anchor", "a: & x\n"],
      ["two anchors", "a: &a &b x\n"],
      ["two anchors across lines", "a: &a\n  &b x\n"],
      ["two tags", "a: !a !b x\n"],
      ["tag followed by a comma", "a: !!str,x\n"],
      ["anchored alias", "a: &a 1\nb: &b *a\n"],
      ["anchored alias key", "a: &a 1\n&b *a : 2\n"],
      ["block sequence after a property", "&anchor - a\n"],
      ["block sequence after a key", "key: - a\n"]
    ])("rejects %s", (_, source) => {
      assert.throws(() => Yaml.parse(source), SyntaxError)
    })

    it.each(
      [
        ["block mapping", "a: &a\n  b: *a\n", ["a", "b"], ["a"]],
        ["block sequence", "- &a\n  - *a\n", [0, 0], [0]],
        ["flow sequence", "&a [*a]\n", [0], []],
        ["flow mapping", "&a {b: *a}\n", ["b"], []],
        ["nested flow collection", "a: &a [1, {b: *a}]\n", ["a", 1, "b"], ["a"]]
      ] as const
    )("resolves a recursive alias in a %s", (_, source, aliasPath, anchorPath) => {
      const value = Yaml.parse(source)
      const select = (path: ReadonlyArray<string | number>) =>
        path.reduce((node: unknown, key) => (node as Record<string | number, unknown>)[key], value)
      assert.strictEqual(select(aliasPath), select(anchorPath))
    })

    // yaml 2.9.1 warns and keeps the untagged value instead.
    it.each([
      ["!!int scalar", "a: !!int abc\n"],
      ["!!bool scalar", "a: !!bool yes\n"],
      ["!!map sequence", "a: !!map [1]\n"],
      ["!!seq mapping", "a: !!seq {b: 1}\n"],
      ["!!str collection", "a: !!str [1]\n"]
    ])("rejects a mismatched %s", (_, source) => {
      assert.throws(() => Yaml.parse(source), SyntaxError)
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
      ["duplicate key", "description: first\ndescription: second\n"],
      ["closing bracket", "a: ]\n"],
      ["comma", "a: ,b\n"],
      ["reserved @", "a: @x\n"],
      ["reserved backtick", "a: `x\n"],
      ["zero indentation indicator", "a: |0\n"],
      ["two-digit indentation indicator", "a: |10\n"],
      ["text after a block scalar indicator", "a: > text\n"],
      ["comment without whitespace after a block scalar indicator", "a: >#c\n  x\n"],
      ["block scalar indicator in a flow collection", "[a, |b]\n"],
      ["reserved @ in a flow collection", "[@a]\n"],
      ["comment without whitespace in a flow collection", "[a,#b\n]\n"]
    ])("rejects %s", (_, source) => {
      assert.throws(() => Yaml.parse(source), SyntaxError)
    })

    it("preserves numeric decoding and quoted colon content", () => {
      assert.deepStrictEqual(
        Yaml.parse("description: 123\nquoted: 'Use when: deploy'\ntrailing: \"Deploy:\"\n"),
        { description: 123, quoted: "Use when: deploy", trailing: "Deploy:" }
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
      assert.throws(() => Yaml.parse(malformed), SyntaxError)
      for (const [name, source] of shapes) {
        assert.throws(() => Yaml.parse(malformed + source), SyntaxError, undefined, `before ${name}`)
        assert.throws(() => Yaml.parse(source + malformed), SyntaxError, undefined, `after ${name}`)
      }
    })
  })

  // YAML 1.2.2 §8.2.1: a block sequence entry may start with a compact nested node.
  // Expected values and rejection fixtures were checked with yaml 2.9.1.
  describe("compact nested block sequences", () => {
    it.each(
      [
        ["indentless mapping value", "a:\n- - 1\n  - 2\n", { a: [[1, 2]] }],
        ["indented mapping value", "a:\n  - - 1\n    - 2\n", { a: [[1, 2]] }],
        ["root sequence", "- - 1\n  - 2\n", [[1, 2]]],
        ["blank line between nested entries", "- - 1\n\n  - 2\n", [[1, 2]]],
        ["nested entry after a scalar item", "a:\n- 1\n- - 2\n", { a: [1, [2]] }],
        ["nested mapping item", "- - a: 1\n    b: 2\n  - c\n", [[{ a: 1, b: 2 }, "c"]]],
        ["empty nested entry", "- -\n", [[null]]],
        ["three levels", "- - - 1\n    - 2\n  - 3\n- 4\n", [[[1, 2], 3], 4]],
        ["wide separation after the indicator", "-   - 1\n    - 2\n", [[1, 2]]],
        ["mapping after a wide separation", "-   a: 1\n    b: 2\n", [{ a: 1, b: 2 }]],
        ["block scalar entry", "- - |\n    x\n  - y\n", [["x\n", "y"]]],
        ["multiline plain entry", "- - a\n    b\n", [["a b"]]],
        ["multiline quoted entry", "- - \"a\n    b\"\n", [["a b"]]]
      ] as const
    )("parses %s", (_, source, expected) => {
      assert.deepStrictEqual(Yaml.parse(source), expected)
    })

    it.each([
      ["compact mapping sibling at the wrong indentation", "-  a: 1\n  b: 2\n"],
      ["tab before a nested sequence", "- \t- x\n"],
      ["tab before a nested mapping", "- \ta: 1\n"]
    ])("rejects %s", (_, source) => {
      assert.throws(() => Yaml.parse(source), SyntaxError)
    })

    it("allows a tab before a scalar entry", () => {
      assert.deepStrictEqual(Yaml.parse("- \tfoo\n"), ["foo"])
    })

    it.each(
      [
        ["mapping value", "a: one\n  - two\n", { a: "one - two" }],
        ["sequence item", "- one\n  - two\n", ["one - two"]]
      ] as const
    )("preserves a dash in a plain continuation of a %s", (_, source, expected) => {
      assert.deepStrictEqual(Yaml.parse(source), expected)
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
      assert.deepStrictEqual(Yaml.parse(`a:\n  ${marker}${suffix}\n`), { a: marker })
      assert.deepStrictEqual(Yaml.parse(`metadata:\n  a:\n    ${marker}${suffix}\n`), { metadata: { a: marker } })
    })

    it.each([
      ["mappings", "a: 1\n---\nb: 2\n"],
      ["sequences", "- one\n---\n- two\n"],
      ["plain scalars", "one\n---\ntwo\n"],
      ["explicit initial marker", "---\na: 1\n--- # second document\nb: 2\n"],
      ["empty first document", "---\n---\nb: 2\n"],
      ["empty trailing document", "a: 1\n---\n"]
    ])("rejects a document stream containing %s", (_, source) => {
      assert.throws(() => Yaml.parse(source), SyntaxError)
    })

    // YAML 1.2.2 §§6.8, 9.2: directives precede a `---` marker; unknown directives are ignored.
    // Checked with yaml 2.9.1, which accepts a duplicate %YAML directive.
    it.each(
      [
        ["%YAML directive", "%YAML 1.2\n---\na: 1\n", { a: 1 }],
        ["%YAML directive with spacing and a comment", "%YAML  1.1 # comment\n---\na\n", "a"],
        ["reserved directive", "%FOO bar baz\n---\na\n", "a"],
        ["percent sign in a plain continuation", "a: b\n  %c\n", { a: "b %c" }],
        ["directive-like line in a plain continuation", "---\nscalar\n%YAML 1.2\n", "scalar %YAML 1.2"]
      ] as const
    )("parses a %s", (_, source, expected) => {
      assert.deepStrictEqual(Yaml.parse(source), expected)
    })

    it.each([
      ["directive without a document", "%YAML 1.2\n"],
      ["directive before a document end marker", "%YAML 1.2\n...\n"],
      ["directive without a document start marker", "%YAML 1.2\na: 1\n"],
      ["%YAML directive with an extra parameter", "%YAML 1.2 foo\n---\n"],
      ["comment without whitespace after %YAML", "%YAML 1.1#...\n---\n"],
      ["duplicate %YAML directive", "%YAML 1.2\n%YAML 1.2\n---\n"],
      ["%TAG directive without a prefix", "%TAG !e!\n---\na\n"],
      ["percent sign starting a value", "a:\n  %c\n"]
    ])("rejects a %s", (_, source) => {
      assert.throws(() => Yaml.parse(source), SyntaxError)
    })

    // YAML 1.2.2 §§9.1.3, 9.2: the document's node may start on the `---` line,
    // unless it is a block collection. Checked with yaml 2.9.1.
    it.each(
      [
        ["plain scalar", "--- text\n", "text"],
        ["tab after the marker", "---\tscalar\n", "scalar"],
        ["quoted scalar", "--- \"foo\"\n", "foo"],
        ["block scalar", "--- |\n  a\n  b\n", "a\nb\n"],
        ["zero-indented block scalar", "--- >\nline1\n# not a comment\nline2\n", "line1 # not a comment line2\n"],
        ["properties before a block sequence", "--- &x\n- a\n", ["a"]],
        ["tag before a block mapping", "--- !!map\na: 1\n", { a: 1 }],
        ["flow collection", "--- {a: 1}\n", { a: 1 }],
        ["document end marker", "--- text\n...\n", "text"],
        ["block scalar before a document end marker", "|-\n ab\n \n...\n", "ab"],
        ["document-marker-like quoted line", "--- \"a\n...x\nb\"\n", "a ...x b"]
      ] as const
    )("parses a %s on the document start line", (_, source, expected) => {
      assert.deepStrictEqual(Yaml.parse(source), expected)
    })

    it.each([
      ["block mapping", "--- a: b\n"],
      ["anchored block mapping", "--- &x a: b\n"],
      ["block sequence", "--- - a\n"],
      ["explicit key", "--- ? a\n"],
      ["document start marker in a quoted scalar", "---\n\"\n---\n\"\n"],
      ["document end marker in a quoted scalar", "---\n'\n...\n'\n"],
      ["second document with content", "a: 1\n--- b\n"]
    ])("rejects a %s", (_, source) => {
      assert.throws(() => Yaml.parse(source), SyntaxError)
    })

    it.each(
      [
        ["mapping", "# before\n--- # start\na: 1\n... # end\n# after\n", { a: 1 }],
        ["sequence", "---\n- one\n- two\n...\n", ["one", "two"]],
        ["plain scalar", "---\none\n...\n", "one"],
        ["empty document", "---\n...\n", null]
      ] as const
    )("preserves single-document markers around a %s", (_, source, expected) => {
      assert.deepStrictEqual(Yaml.parse(source), expected)
    })
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
      assert.deepStrictEqual(Yaml.parse(source), { description: expected, alias: expected })
    })

    it("resolves anchored nested indentless sequences", () => {
      assert.deepStrictEqual(
        Yaml.parse("metadata:\n  tools: &tools\n  - Read\n  - Bash\n  alias: *tools\n"),
        { metadata: { tools: ["Read", "Bash"], alias: ["Read", "Bash"] } }
      )
    })

    it("preserves hashes in JSON-style flow strings without colon spacing", () => {
      assert.deepStrictEqual(Yaml.parse("{\"description\":\"Deploy # now\"} # end\n"), { description: "Deploy # now" })
    })

    it("preserves hashes in single- and double-quoted flow sequence items", () => {
      assert.deepStrictEqual(
        Yaml.parse("descriptions: [\"Deploy # now\", 'Verify # later'] # end\n"),
        { descriptions: ["Deploy # now", "Verify # later"] }
      )
    })
  })
})
