export const cases = [
  {
    "name": "colliding-paths",
    "files": {
      "src/a-b/c.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_FIRST_MODULE\")\n * export {}\n * ```\n */\nexport const value = 1\n",
      "src/a/b-c.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_SECOND_MODULE\")\n * export {}\n * ```\n */\nexport const value = 1\n"
    },
    "expected": [
      "console.log(\"R11_FIRST_MODULE\")\nexport {}",
      "console.log(\"R11_SECOND_MODULE\")\nexport {}"
    ],
    "runExamples": true
  },
  {
    "name": "renamed-path",
    "files": {
      "src/a-b/c.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_FIRST_MODULE\")\n * export {}\n * ```\n */\nexport const value = 1\n",
      "src/a/d.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_SECOND_MODULE\")\n * export {}\n * ```\n */\nexport const value = 1\n"
    },
    "expected": [
      "console.log(\"R11_FIRST_MODULE\")\nexport {}",
      "console.log(\"R11_SECOND_MODULE\")\nexport {}"
    ],
    "runExamples": true
  },
  {
    "name": "different-member",
    "files": {
      "src/a-b/c.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_FIRST_MODULE\")\n * export {}\n * ```\n */\nexport const value = 1\n",
      "src/a/b-c.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_SECOND_MODULE\")\n * export {}\n * ```\n */\nexport const other = 1\n"
    },
    "expected": [
      "console.log(\"R11_FIRST_MODULE\")\nexport {}",
      "console.log(\"R11_SECOND_MODULE\")\nexport {}"
    ],
    "runExamples": true
  },
  {
    "name": "noncolliding",
    "files": {
      "src/first.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_FIRST_MODULE\")\n * export {}\n * ```\n */\nexport const value = 1\n",
      "src/second.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_SECOND_MODULE\")\n * export {}\n * ```\n */\nexport const value = 1\n"
    },
    "expected": [
      "console.log(\"R11_FIRST_MODULE\")\nexport {}",
      "console.log(\"R11_SECOND_MODULE\")\nexport {}"
    ],
    "runExamples": true
  },
  {
    "name": "multiple-examples",
    "files": {
      "src/a-b/c.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_FIRST_MODULE\")\n * export {}\n * ```\n * @example\n * ```ts\n * console.log(\"R11_FIRST_EXTRA\")\n * export {}\n * ```\n */\nexport const value = 1\n",
      "src/a/b-c.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_SECOND_MODULE\")\n * export {}\n * ```\n * @example\n * ```ts\n * console.log(\"R11_SECOND_EXTRA\")\n * export {}\n * ```\n */\nexport const value = 1\n"
    },
    "expected": [
      "console.log(\"R11_FIRST_MODULE\")\nexport {}",
      "console.log(\"R11_FIRST_EXTRA\")\nexport {}",
      "console.log(\"R11_SECOND_MODULE\")\nexport {}",
      "console.log(\"R11_SECOND_EXTRA\")\nexport {}"
    ],
    "runExamples": true
  },
  {
    "name": "namespace-replay",
    "files": {
      "src/Space.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_NAMESPACE\")\n * export {}\n * ```\n */\nexport namespace Outer {\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_NESTED\")\n * export {}\n * ```\n */\nexport namespace Inner {\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_INTERFACE\")\n * export {}\n * ```\n */\nexport interface Item { value: string }\n}\n}\n"
    },
    "expected": [
      "console.log(\"R11_NAMESPACE\")\nexport {}",
      "console.log(\"R11_NESTED\")\nexport {}",
      "console.log(\"R11_INTERFACE\")\nexport {}"
    ],
    "runExamples": true
  },
  {
    "name": "check-only",
    "files": {
      "src/a-b/c.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_FIRST_MODULE\")\n * export {}\n * ```\n */\nexport const value = 1\n",
      "src/a/b-c.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_SECOND_MODULE\")\n * export {}\n * ```\n */\nexport const value = 1\n"
    },
    "expected": [
      "console.log(\"R11_FIRST_MODULE\")\nexport {}",
      "console.log(\"R11_SECOND_MODULE\")\nexport {}"
    ],
    "runExamples": false
  }
]
