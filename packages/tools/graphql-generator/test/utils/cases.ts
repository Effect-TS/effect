/**
 * Executable-document conformance cases, one table per grammar section.
 *
 * `printed` is the compact form the printer must produce: token-minimal, with
 * a single space only where two adjacent non-punctuator tokens would otherwise
 * merge, and with executable-definition descriptions dropped. The round-trip
 * tests re-parse it and expect the same AST apart from those descriptions. Diagnostics give the 1-based `line:column` of the offending token
 * and the message, worded as graphql-js words it so the reference
 * implementation can arbitrate disagreements.
 */
import type { ExpectedDiagnostic } from "./ast.ts"

export interface ExecutableCase {
  readonly name: string
  readonly source: string
  readonly printed: string
}

export interface ExecutableSection {
  readonly section: string
  readonly cases: ReadonlyArray<ExecutableCase>
}

export const executableSections: ReadonlyArray<ExecutableSection> = [
  {
    section: "operations",
    cases: [
      { name: "anonymous query shorthand", source: "{ a }", printed: "{a}" },
      { name: "anonymous query keyword collapses to the shorthand", source: "query { a }", printed: "{a}" },
      { name: "named query", source: "query Q { a }", printed: "query Q{a}" },
      { name: "mutation", source: "mutation M { do }", printed: "mutation M{do}" },
      { name: "subscription", source: "subscription S { ev }", printed: "subscription S{ev}" },
      {
        name: "anonymous query with variables keeps the keyword",
        source: "query ($a: Int) { f }",
        printed: "query($a:Int){f}"
      },
      { name: "operation directives", source: "query Q @a @b(x: 1) { f }", printed: "query Q@a@b(x:1){f}" },
      {
        name: "definitions keep their order",
        source: "fragment B on T { b } query A { ...B } fragment C on T { c }",
        printed: "fragment B on T{b}query A{...B}fragment C on T{c}"
      }
    ]
  },
  {
    section: "variables",
    cases: [
      {
        name: "types, non-null wrappers and defaults",
        source: "query Q($id: ID!, $n: Int = 10, $tags: [String!] = [\"a\", \"b\"]) { f(id: $id, n: $n, tags: $tags) }",
        printed: "query Q($id:ID!$n:Int=10$tags:[String!]=[\"a\" \"b\"]){f(id:$id n:$n tags:$tags)}"
      },
      {
        name: "nested list types",
        source: "query Q($m: [[Int!]!]!) { f(m: $m) }",
        printed: "query Q($m:[[Int!]!]!){f(m:$m)}"
      },
      {
        name: "variable directives",
        source: "query Q($a: Int @deprecated(reason: \"r\")) { f }",
        printed: "query Q($a:Int@deprecated(reason:\"r\")){f}"
      }
    ]
  },
  {
    section: "selections",
    cases: [
      { name: "aliases and nesting", source: "query Q { a alias: b { c d } }", printed: "query Q{a alias:b{c d}}" },
      {
        name: "field directives",
        source: "{ f @include(if: $x) @skip(if: false) }",
        printed: "{f@include(if:$x)@skip(if:false)}"
      },
      {
        name: "fragment spreads and inline fragments",
        source: "{ ...F ... on T { a } ... @include(if: $v) { b } ... { c } }",
        printed: "{...F...on T{a}...@include(if:$v){b}...{c}}"
      },
      { name: "spread with directives", source: "{ ...F @include(if: true) }", printed: "{...F@include(if:true)}" },
      {
        name: "keywords are valid names",
        source: "{ query mutation subscription fragment on true false null }",
        printed: "{query mutation subscription fragment on true false null}"
      },
      {
        name: "fragment definition with directives",
        source: "fragment F on T @d { a }",
        printed: "fragment F on T@d{a}"
      }
    ]
  },
  {
    section: "values",
    cases: [
      {
        name: "every value kind",
        source:
          "{ f(i: 1, neg: -2, fl: 1.5, exp: 1e10, s: \"x\", b: true, n: null, e: ENUM, l: [1, 2], o: {a: 1, b: {c: [true]}}) }",
        printed: "{f(i:1 neg:-2 fl:1.5 exp:1e10 s:\"x\" b:true n:null e:ENUM l:[1 2]o:{a:1 b:{c:[true]}})}"
      },
      {
        name: "numbers keep their source text",
        source: "{ f(a: -0, b: 0.0, c: -1.5e-3, d: 2E+2) }",
        printed: "{f(a:-0 b:0.0 c:-1.5e-3 d:2E+2)}"
      },
      {
        name: "enum values are not booleans or null",
        source: "{ f(a: TRUE, b: true, c: Null, d: null) }",
        printed: "{f(a:TRUE b:true c:Null d:null)}"
      },
      {
        name: "variables inside lists and objects",
        source: "{ f(a: [$x, 1], b: {k: $y}) }",
        printed: "{f(a:[$x 1]b:{k:$y})}"
      },
      { name: "empty list and object", source: "{ f(a: [], b: {}) }", printed: "{f(a:[]b:{})}" },
      {
        name: "block string argument prints as a regular string",
        source: "{ f(s: \"\"\"\n    multi\n      line\n    \"\"\") }",
        printed: "{f(s:\"multi\\n  line\")}"
      },
      {
        name: "string escapes",
        source: "{ f(s: \"a\\\"b\\\\c\\nd\\u00e9\") }",
        printed: "{f(s:\"a\\\"b\\\\c\\ndé\")}"
      },
      {
        name: "control characters",
        source: "{ f(s: \"\\u0001\\u007f\\b\") }",
        printed: "{f(s:\"\\u0001\\u007F\\b\")}"
      }
    ]
  },
  {
    section: "descriptions (September 2025 edition)",
    cases: [
      {
        name: "operation description is parsed and not printed",
        source: "\"docs\" query Q { a }",
        printed: "query Q{a}"
      },
      {
        name: "block string description on a mutation",
        source: "\"\"\"\n  Block\n  docs\n\"\"\" mutation M { do }",
        printed: "mutation M{do}"
      },
      {
        name: "variable definition descriptions",
        source: "query Q(\"x doc\" $x: Int = 1, \"\"\"y doc\"\"\" $y: String) { a }",
        printed: "query Q($x:Int=1$y:String){a}"
      },
      { name: "fragment description", source: "\"docs\" fragment F on T { a }", printed: "fragment F on T{a}" },
      {
        name: "described anonymous query still collapses to the shorthand",
        source: "\"docs\" query { a }",
        printed: "{a}"
      }
    ]
  },
  {
    section: "ignored tokens",
    cases: [
      { name: "comments and commas", source: "# leading\n{ a, b # trailing\n c }", printed: "{a b c}" },
      { name: "byte order mark", source: "\uFEFF{ a }", printed: "{a}" },
      { name: "CRLF line endings", source: "{\r\n  a\r\n}", printed: "{a}" },
      { name: "comment at end of input without a newline", source: "{ a } # done", printed: "{a}" }
    ]
  }
]

export const executableCases: ReadonlyArray<ExecutableCase> = executableSections.flatMap((section) => section.cases)

export interface DiagnosticCase extends ExpectedDiagnostic {
  readonly name: string
  readonly source: string
}

export const executableDiagnostics: ReadonlyArray<DiagnosticCase> = [
  {
    name: "description on the query shorthand",
    source: "\"docs\" { a }",
    line: 1,
    column: 1,
    message: "Unexpected description, descriptions are not supported on shorthand queries."
  },
  {
    name: "description on a field",
    source: "{ \"docs\" a }",
    line: 1,
    column: 3,
    message: "Expected Name, found String \"docs\"."
  },
  {
    name: "description at end of input",
    source: "query Q { a } \"trailing\"",
    line: 1,
    column: 25,
    message: "Unexpected <EOF>."
  },
  { name: "empty document", source: "", line: 1, column: 1, message: "Unexpected <EOF>." },
  { name: "comment-only document", source: "# only a comment", line: 1, column: 17, message: "Unexpected <EOF>." },
  { name: "unterminated selection set", source: "{", line: 1, column: 2, message: "Expected Name, found <EOF>." },
  { name: "stray closing brace", source: "{ a }}", line: 1, column: 6, message: "Unexpected \"}\"." },
  { name: "empty selection set", source: "query Q { }", line: 1, column: 11, message: "Expected Name, found \"}\"." },
  { name: "unterminated arguments", source: "{ a(b: 1 }", line: 1, column: 10, message: "Expected Name, found \"}\"." },
  {
    name: "argument without a colon",
    source: "{ f(a: 1 b) }",
    line: 1,
    column: 11,
    message: "Expected \":\", found \")\"."
  },
  { name: "argument without a value", source: "{ f(a: ) }", line: 1, column: 8, message: "Unexpected \")\"." },
  {
    name: "alias without a field",
    source: "{ a(b: 1) c: }",
    line: 1,
    column: 14,
    message: "Expected Name, found \"}\"."
  },
  {
    name: "variable in selection position",
    source: "{ $v }",
    line: 1,
    column: 3,
    message: "Expected Name, found \"$\"."
  },
  { name: "unterminated list value", source: "{ a(b: [1, 2) }", line: 1, column: 13, message: "Unexpected \")\"." },
  {
    name: "object field without a colon",
    source: "{ a(b: {c 1}) }",
    line: 1,
    column: 11,
    message: "Expected \":\", found Int \"1\"."
  },
  {
    name: "variable in a default value",
    source: "query Q($a: Int = $b) { f }",
    line: 1,
    column: 19,
    message: "Unexpected variable \"$b\" in constant value."
  },
  {
    name: "double non-null",
    source: "query Q($a: Int!!) { f }",
    line: 1,
    column: 17,
    message: "Expected \"$\", found \"!\"."
  },
  {
    name: "operation without a selection set",
    source: "query",
    line: 1,
    column: 6,
    message: "Expected \"{\", found <EOF>."
  },
  {
    name: "fragment named on",
    source: "fragment on on T { a }",
    line: 1,
    column: 10,
    message: "Unexpected Name \"on\"."
  },
  {
    name: "fragment without a type condition",
    source: "fragment F { a }",
    line: 1,
    column: 12,
    message: "Expected \"on\", found \"{\"."
  },
  {
    name: "inline fragment without a type",
    source: "{ ... on }",
    line: 1,
    column: 10,
    message: "Expected Name, found \"}\"."
  },
  {
    name: "type-system keyword at end of input",
    source: "{ a } type",
    line: 1,
    column: 11,
    message: "Expected Name, found <EOF>."
  },
  {
    name: "error on a later line",
    source: "{ a }\n\nquery Q {\n  b(c: 1\n}",
    line: 5,
    column: 1,
    message: "Expected Name, found \"}\"."
  }
]
