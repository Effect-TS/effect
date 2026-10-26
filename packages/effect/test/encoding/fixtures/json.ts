/**
 * Acceptance and decoded values verified against json5 2.2.3 and jsonc-parser
 * 3.3.1 with default options, treating any reported JSONC error as rejection.
 * These are existing parser-test inputs; CI consumes literal expectations and
 * does not depend on either reference library. The reference field names the
 * relevant sections of https://spec.json5.org/ and https://jsonc.org/.
 *
 * Error positions, messages, and __proto__ safety are separate Effect contracts.
 */

type Expected =
  | { readonly valid: true; readonly value: unknown }
  | { readonly valid: false }

type JsonFixture = {
  readonly name: string
  readonly input: string
  readonly json5: Expected
  readonly jsonc: Expected
  readonly reference: string
}

export const jsonFixtures: ReadonlyArray<JsonFixture> = [
  {
    "name": "comment at end of input",
    "input": "1 // comment at EOF",
    "json5": {
      "valid": true,
      "value": 1
    },
    "jsonc": {
      "valid": true,
      "value": 1
    },
    "reference": "JSON5 section 7; JSONC Single-line and Multi-line Comments"
  },
  {
    "name": "multiline block comments",
    "input": "/* first\r\nsecond */ [/* third\nfourth */ 1]",
    "json5": {
      "valid": true,
      "value": [
        1
      ]
    },
    "jsonc": {
      "valid": true,
      "value": [
        1
      ]
    },
    "reference": "JSON5 section 7; JSONC Single-line and Multi-line Comments"
  },
  {
    "name": "escaped quotes and comment-like string content",
    "input": "[\"\\\\\",/* comment */\"\\\"/* text */\"]",
    "json5": {
      "valid": true,
      "value": [
        "\\",
        "\"/* text */"
      ]
    },
    "jsonc": {
      "valid": true,
      "value": [
        "\\",
        "\"/* text */"
      ]
    },
    "reference": "JSON5 section 5.1; JSONC Syntax"
  },
  {
    "name": "JSON scalars and decimal numbers",
    "input": "[0,-12.25,1e+2,\"text\",null,false]",
    "json5": {
      "valid": true,
      "value": [
        0,
        -12.25,
        100,
        "text",
        null,
        false
      ]
    },
    "jsonc": {
      "valid": true,
      "value": [
        0,
        -12.25,
        100,
        "text",
        null,
        false
      ]
    },
    "reference": "JSON5 section 6; JSONC Syntax"
  },
  {
    "name": "negative zero",
    "input": "-0",
    "json5": {
      "valid": true,
      "value": -0.0
    },
    "jsonc": {
      "valid": true,
      "value": -0.0
    },
    "reference": "JSON5 section 6; JSONC Syntax"
  },
  {
    "name": "numeric overflow",
    "input": "1e400",
    "json5": {
      "valid": true,
      "value": Infinity
    },
    "jsonc": {
      "valid": true,
      "value": Infinity
    },
    "reference": "JSON5 section 6; JSONC Syntax"
  },
  {
    "name": "trailing array comma",
    "input": "[1,]",
    "json5": {
      "valid": true,
      "value": [
        1
      ]
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 4; JSONC Trailing Commas"
  },
  {
    "name": "trailing object comma",
    "input": "{\"a\":1,}",
    "json5": {
      "valid": true,
      "value": {
        "a": 1
      }
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 3; JSONC Trailing Commas"
  },
  {
    "name": "unquoted identifier key",
    "input": "{unquoted: 1}",
    "json5": {
      "valid": true,
      "value": {
        "unquoted": 1
      }
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 3; JSONC Syntax"
  },
  {
    "name": "single-quoted key",
    "input": "{'single': 1}",
    "json5": {
      "valid": true,
      "value": {
        "single": 1
      }
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 3; JSONC Syntax"
  },
  {
    "name": "hexadecimal number",
    "input": "0x1f",
    "json5": {
      "valid": true,
      "value": 31
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 6; JSONC Syntax"
  },
  {
    "name": "explicit positive sign",
    "input": "+1",
    "json5": {
      "valid": true,
      "value": 1
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 6; JSONC Syntax"
  },
  {
    "name": "leading decimal point",
    "input": ".5",
    "json5": {
      "valid": true,
      "value": 0.5
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 6; JSONC Syntax"
  },
  {
    "name": "trailing decimal point",
    "input": "5.",
    "json5": {
      "valid": true,
      "value": 5
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 6; JSONC Syntax"
  },
  {
    "name": "NaN literal",
    "input": "NaN",
    "json5": {
      "valid": true,
      "value": NaN
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 6; JSONC Syntax"
  },
  {
    "name": "Infinity literal",
    "input": "Infinity",
    "json5": {
      "valid": true,
      "value": Infinity
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 6; JSONC Syntax"
  },
  {
    "name": "hexadecimal string escape",
    "input": "\"\\x41\"",
    "json5": {
      "valid": true,
      "value": "A"
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 5.1; JSONC Syntax"
  },
  {
    "name": "byte order mark",
    "input": "\ufeff{}",
    "json5": {
      "valid": true,
      "value": {}
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 8; JSONC Syntax"
  },
  {
    "name": "repeated array comma",
    "input": "[1,,]",
    "json5": {
      "valid": false
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 4; JSONC Syntax"
  },
  {
    "name": "leading zero",
    "input": "01",
    "json5": {
      "valid": false
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 6; JSONC Syntax"
  },
  {
    "name": "comment splitting a number",
    "input": "1/* gap */2",
    "json5": {
      "valid": false
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 7; JSONC Single-line and Multi-line Comments"
  },
  {
    "name": "unterminated block comment",
    "input": "{} /* unterminated",
    "json5": {
      "valid": false
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 7; JSONC Single-line and Multi-line Comments"
  },
  {
    "name": "invalid Unicode escape",
    "input": "\"\\uZZZZ\"",
    "json5": {
      "valid": false
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 5.1; JSONC Syntax"
  },
  {
    "name": "vertical-tab whitespace",
    "input": "\u000b{}",
    "json5": {
      "valid": true,
      "value": {}
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 8; JSONC Syntax"
  },
  {
    "name": "escaped line continuation",
    "input": "\"line\\\nbreak\"",
    "json5": {
      "valid": true,
      "value": "linebreak"
    },
    "jsonc": {
      "valid": false
    },
    "reference": "JSON5 section 5.1; JSONC Syntax"
  }
]
