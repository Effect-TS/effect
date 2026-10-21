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

  // YAML 1.2.2 §6.2: tabs may separate tokens after the indentation.
  it("allows tabs as separation after indicators", () => {
    assert.deepStrictEqual(Yaml.parse("-\tfoo\n- a:\tb\n"), ["foo", { a: "b" }])
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
      ["block sequence after a key", "description: - Deploy\n"],
      ["zero indentation indicator", "description: |0\n"],
      ["text after a block scalar indicator", "description: > Deploy\n"],
      ["reserved @", "description: @Deploy\n"]
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

  // YAML 1.2.2 §§7.4–7.5: flow collections may span lines indented past the parent node.
  describe("multiline flow collections", () => {
    it.each(
      [
        [
          "mapping below its key",
          "example:\n  {\n    \"active_anon\": 1572864,\n    \"active_file\": 5115904\n  }\n",
          { example: { active_anon: 1572864, active_file: 5115904 } }
        ],
        ["nested collections", "a: {\n  b: [\n    1\n  ],\n  c: {d: 2}\n  }\n", { a: { b: [1], c: { d: 2 } } }],
        ["multiline scalars and comments", "a: [b\n  c, # one\n  \"d\n  e\"]\n", { a: ["b c", "d e"] }],
        ["trailing commas", "a: [\n  1,\n  {b: 2,},\n  ]\n", { a: [1, { b: 2 }] }],
        // The spec requires the closing bracket past the parent indentation; common parsers accept it at the parent column.
        ["closing bracket at the mapping indentation", "a: [\n  1,\n  2\n]\n", { a: [1, 2] }],
        ["closing bracket at the sequence indentation", "- [\n  1\n]\n", [[1]]]
      ] as const
    )("parses %s", (_, source, expected) => {
      assert.deepStrictEqual(Yaml.parse(source), expected)
    })

    it("rejects continuation lines at the parent indentation", () => {
      assert.throws(() => Yaml.parse("a: {\nb: 1 }\n"), SyntaxError)
    })
  })

  // YAML 1.2.2 §§7.4, 8.2.2: explicit `?` keys, flow keys without values, and flow sequence pairs.
  describe("explicit keys and flow pairs", () => {
    it.each(
      [
        ["explicit key", "? a\n: b\n", { a: "b" }],
        ["flow key without a value", "{a, b: 1}\n", { a: null, b: 1 }],
        ["flow sequence pair", "[a: 1, b]\n", [{ a: 1 }, "b"]],
        ["colon without a following space", "{a:1}\n", { "a:1": null }]
      ] as const
    )("parses %s", (_, source, expected) => {
      assert.deepStrictEqual(Yaml.parse(source), expected)
    })

    // Valid YAML, rejected because mapping keys are JavaScript strings.
    it.each([
      ["block", "? [a]\n: v\n"],
      ["flow", "{[a]: v}\n"]
    ])("rejects a %s collection key", (_, source) => {
      assert.throws(() => Yaml.parse(source), /YAML collection keys are not supported/)
    })
  })

  // YAML 1.2.2 §§6.8.2, 6.9, 10.3: node properties, tag handles, and core schema tags.
  describe("tags", () => {
    it("resolves core schema tags and keeps unknown tags as strings", () => {
      assert.deepStrictEqual(
        Yaml.parse(
          "a: !!int \"7\"\nb: !!str 1\nc: !Ref 123\nd: &x !!int \"1\"\ne: !!int &y \"2\"\nf: !!int \"012\"\ng: !!float \"1.\"\n"
        ),
        { a: 7, b: "1", c: "123", d: 1, e: 2, f: 12, g: 1 }
      )
    })

    it("resolves %TAG handles", () => {
      assert.deepStrictEqual(Yaml.parse("%TAG !e! tag:example.com,2000:\n---\na: !e!foo 1\n"), { a: "1" })
      assert.deepStrictEqual(Yaml.parse("%TAG !! tag:example.com:\n---\na: !!int 1\n"), { a: "1" })
    })

    it("rejects a repeated %TAG handle", () => {
      assert.throws(() => Yaml.parse("%TAG !e! tag:a:\n%TAG !e! tag:a:\n---\na: !e!x 1\n"), SyntaxError)
    })

    it.each(["!!int abc", "!!float 0x10", "!!float .i_nf"])(
      "rejects a core tag that does not match its scalar: %s",
      (value) => {
        assert.throws(() => Yaml.parse(`a: ${value}\n`), SyntaxError)
      }
    )
  })

  // YAML 1.2.2 §8.2.1: a block sequence entry may start with a compact nested node.
  describe("compact nested block sequences", () => {
    it.each(
      [
        ["root sequence", "- - 1\n  - 2\n", [[1, 2]]],
        ["indentless mapping value", "a:\n- - 1\n  - 2\n", { a: [[1, 2]] }],
        ["nested mapping item", "- - a: 1\n    b: 2\n  - c\n", [[{ a: 1, b: 2 }, "c"]]]
      ] as const
    )("parses %s", (_, source, expected) => {
      assert.deepStrictEqual(Yaml.parse(source), expected)
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

    // YAML 1.2.2 §§6.8, 9.1.3, 9.2: directives precede `---`, and the document's node may start on that line.
    it.each(
      [
        ["plain scalar on the start line", "--- text\n", "text"],
        ["block scalar on the start line", "--- |\n  a\n", "a\n"],
        ["%YAML directive", "%YAML 1.2\n---\na: 1\n", { a: 1 }]
      ] as const
    )("parses a %s", (_, source, expected) => {
      assert.deepStrictEqual(Yaml.parse(source), expected)
    })

    it.each([
      ["directive without a document start marker", "%YAML 1.2\na: 1\n"],
      ["directive-like line inside a document", "a:\n  %YAML 1.2\n"]
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

    it.each([
      ["flow", "a: &x [*x]\n"],
      ["block", "a: &x\n  b: *x\n"]
    ])("rejects a recursive alias in a %s collection", (_, source) => {
      assert.throws(() => Yaml.parse(source), /recursive/i)
    })

    // YAML 1.2.2 §7.1: an alias refers to the most recent preceding anchor.
    it("resolves an alias after a collection to an anchor redefined inside it", () => {
      assert.deepStrictEqual(Yaml.parse("first: &x [&x 1, *x]\nlast: *x\n"), { first: [1, 1], last: 1 })
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
