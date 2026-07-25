import { assert, describe, it } from "@effect/vitest"
import {
  decodePackageExports,
  flattenReachableTargets,
  patternKeyCompare,
  selectPackageExport,
  substitutePatternTarget,
  validatePackageTarget,
  validatePatternCapture
} from "@effect/workspace-test/PackageExports"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const decode = (value: unknown) => {
  const result = decodePackageExports(value)
  assert.strictEqual(result._tag, "Success")
  if (result._tag === "Failure") {
    throw new Error(result.message)
  }
  return result.rules
}

const failDecode = (value: unknown) => {
  const result = decodePackageExports(value)
  assert.strictEqual(result._tag, "Failure")
}

const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

const resolved = (value: unknown, subpath: string, conditions: ReadonlySet<string> = new Set()) => {
  const result = selectPackageExport(decode(value), subpath, conditions)
  assert.strictEqual(result._tag, "Resolved")
  if (result._tag !== "Resolved") {
    throw new Error(`Expected ${subpath} to resolve, got ${result._tag}`)
  }
  return result
}

describe("package exports decoding", () => {
  it("decodes every main sugar form losslessly", () => {
    assert.deepStrictEqual(plain(decode("./index.js")), [{
      _tag: "ExactExportRule",
      subpath: ".",
      target: { _tag: "Target", value: "./index.js" }
    }])
    assert.deepStrictEqual(plain(decode(null)), [])
    assert.deepStrictEqual(plain(decode([null, "./index.js"])[0]?.target), {
      _tag: "Fallback",
      targets: [{ _tag: "Null" }, { _tag: "Target", value: "./index.js" }]
    })
    assert.deepStrictEqual(plain(decode({ custom: "./custom.js", default: "./index.js" })[0]?.target), {
      _tag: "Conditions",
      entries: [
        { condition: "custom", target: { _tag: "Target", value: "./custom.js" } },
        { condition: "default", target: { _tag: "Target", value: "./index.js" } }
      ]
    })
  })

  it("preserves subpath, condition, fallback, and nested traversal order", () => {
    const rules = decode({
      "./z": { browser: [null, ["./z-browser.js"]], default: "./z.js" },
      "./feature/*": "./feature/*.js",
      ".": "./index.js"
    })
    assert.deepStrictEqual(rules.map((rule) => [rule._tag, rule.subpath]), [
      ["ExactExportRule", "./z"],
      ["PatternExportRule", "./feature/*"],
      ["ExactExportRule", "."]
    ])
    assert.deepStrictEqual(plain(rules[0]?.target), {
      _tag: "Conditions",
      entries: [
        {
          condition: "browser",
          target: {
            _tag: "Fallback",
            targets: [
              { _tag: "Null" },
              { _tag: "Fallback", targets: [{ _tag: "Target", value: "./z-browser.js" }] }
            ]
          }
        },
        { condition: "default", target: { _tag: "Target", value: "./z.js" } }
      ]
    })
  })

  it("rejects mixed root maps, numeric condition keys, and unsupported tree values", () => {
    failDecode({ ".": "./index.js", default: "./fallback.js" })
    failDecode({ ".invalid": "./index.js" })
    failDecode({ "./valid": "./valid.js", "../invalid": "./invalid.js" })
    failDecode({ default: { "0": "./zero.js" } })
    failDecode({ ".": 1 })
    failDecode({ ".": [false, "./fallback.js"] })
    failDecode(true)
    failDecode(undefined)
  })
})

describe("forward rule and target selection", () => {
  it("uses exact precedence without falling back to patterns", () => {
    const exports = { "./*": "./broad/*.js", "./exact": null }
    assert.strictEqual(selectPackageExport(decode(exports), "./exact", new Set())._tag, "Blocked")
    assert.strictEqual(resolved(exports, "./other").target, "./broad/other.js")

    const noMatch = { "./*": "./broad/*.js", "./exact": { custom: "./custom.js" } }
    assert.strictEqual(selectPackageExport(decode(noMatch), "./exact", new Set())._tag, "NotFound")
    assert.strictEqual(resolved({ "./a/../b": "./target.js" }, "./a/../b").target, "./target.js")
  })

  it("uses Node pattern specificity independent of declaration order", () => {
    const exports = {
      "./feature/*": "./broad/*.js",
      "./feature/*.js": "./extension/*.js",
      "./feature/private/*": null,
      "./feature/special/*": "./special/*.js"
    }
    assert.strictEqual(resolved(exports, "./feature/a.js").target, "./extension/a.js")
    assert.strictEqual(resolved(exports, "./feature/special/a").target, "./special/a.js")
    assert.strictEqual(selectPackageExport(decode(exports), "./feature/private/a", new Set())._tag, "Blocked")
    assert.ok(patternKeyCompare("./feature/*", "./feature/special/*") > 0)

    const noMatch = { "./*": "./broad/*.js", "./feature/*": { custom: "./custom/*.js" } }
    assert.strictEqual(selectPackageExport(decode(noMatch), "./feature/a", new Set())._tag, "NotFound")

    const invalid = { "./*": "./broad/*.js", "./feature/*": "invalid/*" }
    assert.strictEqual(selectPackageExport(decode(invalid), "./feature/a", new Set())._tag, "Invalid")
  })

  it("requires one key star and a nonempty capture, supports nested captures, and replaces every target star", () => {
    const rules = decode({
      "./features/*": "./src/*/copy-*.js",
      "./bad/*/*": "./bad/*.js"
    })
    assert.strictEqual(selectPackageExport(rules, "./features/", new Set())._tag, "NotFound")
    assert.strictEqual(
      resolved({ "./features/*": "./src/*/copy-*.js" }, "./features/a/b").target,
      "./src/a/b/copy-a/b.js"
    )
    assert.strictEqual(selectPackageExport(rules, "./bad/a/b", new Set())._tag, "NotFound")
    assert.deepStrictEqual(substitutePatternTarget("./src/*/copy-*", "a/b"), {
      _tag: "Valid",
      target: "./src/a/b/copy-a/b"
    })
  })

  it("honors condition declaration order, default, nesting, and custom active sets", () => {
    const exports = {
      ".": {
        browser: "./browser.js",
        custom: { missing: "./missing.js", default: "./custom.js" },
        default: "./default.js",
        node: "./unreachable.js"
      }
    }
    assert.strictEqual(resolved(exports, ".", new Set(["browser", "custom"])).target, "./browser.js")
    assert.strictEqual(resolved(exports, ".", new Set(["custom"])).target, "./custom.js")
    assert.strictEqual(resolved(exports, ".", new Set(["node"])).target, "./default.js")

    const nestedNoMatch = { ".": { custom: { missing: "./missing.js" }, default: "./default.js" } }
    assert.strictEqual(resolved(nestedNoMatch, ".", new Set(["custom"])).target, "./default.js")

    const unusual = { ".": { outer: { "": "./empty.js", ".custom": "./dot.js", "custom,other": "./comma.js" } } }
    assert.strictEqual(resolved(unusual, ".", new Set(["outer", ".custom"])).target, "./dot.js")
    assert.strictEqual(resolved(unusual, ".", new Set(["outer", "custom,other"])).target, "./comma.js")
  })

  it("implements Node array fallback without filesystem fallback", () => {
    assert.strictEqual(resolved(["not-relative", "./valid.js"], ".").target, "./valid.js")
    assert.strictEqual(resolved([null, "./valid.js"], ".").target, "./valid.js")
    assert.strictEqual(resolved([[null, "./nested.js"], "./later.js"], ".").target, "./nested.js")
    assert.strictEqual(resolved([{ custom: "./custom.js" }, "./fallback.js"], ".").target, "./fallback.js")
    assert.strictEqual(selectPackageExport(decode([]), ".", new Set())._tag, "Blocked")
    assert.strictEqual(selectPackageExport(decode(["./missing.js", "./later.js"]), ".", new Set())._tag, "Resolved")
    assert.strictEqual(resolved(["./missing.js", "./later.js"], ".").target, "./missing.js")
    assert.strictEqual(selectPackageExport(decode(["bad", null]), ".", new Set())._tag, "Blocked")
    assert.strictEqual(selectPackageExport(decode([null, "bad"]), ".", new Set())._tag, "Invalid")

    const selected = resolved({ custom: [null, ["./custom.js"]] }, ".", new Set(["custom"]))
    assert.deepStrictEqual(selected.conditionPath, ["custom"])
    assert.deepStrictEqual(selected.fallbackPositions, [1, 0])
  })
})

describe("symbolic reachable leaves", () => {
  it("uses arbitrary condition sets while preserving provenance paths", () => {
    const target = decode({
      ".": {
        browser: [null, "./browser.js", "./after-browser.js"],
        custom: { nested: "./nested.js" },
        default: ["bad", null, ["./default.js", "./after-default-array.js"]],
        afterDefault: "./unreachable.js"
      }
    })[0]!.target

    assert.deepStrictEqual(flattenReachableTargets(target), [
      { target: "./browser.js", conditionPath: ["browser"], fallbackPositions: [1] },
      { target: "./nested.js", conditionPath: ["custom", "nested"], fallbackPositions: [] },
      { target: "bad", conditionPath: ["default"], fallbackPositions: [0] },
      { target: "./default.js", conditionPath: ["default"], fallbackPositions: [2, 0] }
    ])
  })

  it("continues after a default branch that can return no match", () => {
    const target = decode({
      ".": {
        default: { custom: "./custom.js" },
        node: "./node.js"
      }
    })[0]!.target

    assert.deepStrictEqual(flattenReachableTargets(target), [
      { target: "./custom.js", conditionPath: ["default", "custom"], fallbackPositions: [] },
      { target: "./node.js", conditionPath: ["node"], fallbackPositions: [] }
    ])
  })
})

describe("package target validation", () => {
  it("distinguishes invalid targets from package escapes", () => {
    assert.deepStrictEqual(validatePackageTarget("./dist/index.js"), { _tag: "Valid" })
    assert.deepStrictEqual(validatePackageTarget("./dist/index.js?value=a%2fb#fragment"), { _tag: "Valid" })
    assert.strictEqual(validatePackageTarget("dist/index.js")._tag, "Invalid")
    assert.strictEqual(validatePackageTarget("./dist/../../outside.js")._tag, "Escape")
    for (
      const target of [
        "./dist/../index.js",
        "./dist/./index.js",
        "./node_modules/pkg/index.js",
        "./%6eode_modules/pkg/index.js",
        "./dist\\..\\index.js",
        "./dist/%2e%2e/index.js"
      ]
    ) {
      assert.notStrictEqual(validatePackageTarget(target)._tag, "Valid", target)
    }
  })

  it("rejects unsafe wildcard captures and substitutions", () => {
    assert.deepStrictEqual(validatePatternCapture("nested/path"), { _tag: "Valid" })
    for (const capture of ["", "../path", "node_modules/pkg", "%2e%2e/path", "a\\b", "a%2fb"]) {
      assert.strictEqual(validatePatternCapture(capture)._tag, "Invalid", capture)
    }
    assert.strictEqual(substitutePatternTarget("./dist/*.js", "../escape")._tag, "Invalid")
  })
})

describe("Node subprocess oracle", () => {
  const fixture = fileURLToPath(new URL("./fixtures/package-exports-oracle/run.mjs", import.meta.url))
  const runOracle = (mode: "Import" | "Require", conditions: ReadonlyArray<string>) =>
    JSON.parse(execFileSync(process.execPath, [
      ...conditions.map((condition) => `--conditions=${condition}`),
      fixture,
      mode
    ], { encoding: "utf8" })) as Record<string, string>

  it("agrees for default conditions and exact/pattern precedence", () => {
    const oracle = runOracle("Import", [])
    const exports = {
      ".": { custom: "./custom.js", default: "./default.js" },
      "./exact": "./exact.js",
      "./feature/*": "./broad/*.js",
      "./feature/private/*": null,
      "./feature/special/*": "./special/*.js"
    }
    assert.strictEqual(resolved(exports, ".").target, oracle["oracle-package"])
    assert.strictEqual(resolved(exports, "./exact").target, oracle["oracle-package/exact"])
    assert.strictEqual(resolved(exports, "./feature/a").target, oracle["oracle-package/feature/a"])
    assert.strictEqual(resolved(exports, "./feature/special/a").target, oracle["oracle-package/feature/special/a"])
    assert.strictEqual(selectPackageExport(decode(exports), "./feature/private/a", new Set())._tag, "Blocked")
    assert.strictEqual(oracle["oracle-package/feature/private/a"], "ERR_PACKAGE_PATH_NOT_EXPORTED")
  })

  it("agrees for a custom condition", () => {
    const imported = runOracle("Import", ["custom"])
    const required = runOracle("Require", ["custom"])
    assert.strictEqual(
      resolved({ custom: "./custom.js", default: "./default.js" }, ".", new Set(["custom"])).target,
      imported["oracle-package"]
    )
    assert.strictEqual(required["oracle-package"], "./custom.js")
  })

  it("agrees for Import and Require built-in condition profiles", () => {
    const imported = runOracle("Import", [])
    const required = runOracle("Require", [])
    assert.strictEqual(imported["oracle-package/import-default"], "./import.js")
    assert.strictEqual(required["oracle-package/import-default"], "./require.cjs")
    assert.strictEqual(imported["oracle-package/node-default"], "./node.js")
    assert.strictEqual(required["oracle-package/node-default"], "./node.js")
    assert.strictEqual(imported["oracle-package/node-before-import"], "./node.js")
  })
})
