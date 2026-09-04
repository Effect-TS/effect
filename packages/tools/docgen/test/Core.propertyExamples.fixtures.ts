export const cases = [
  {
    "name": "property-and-method",
    "files": {
      "src/Box.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n */\nexport class Box {\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_PROPERTY\")\n * export {}\n * ```\n */\nreadonly value = 1\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_METHOD\")\n * export {}\n * ```\n */\nread() { return this.value }\n/**\n * Fixture.\n * @since 1.0.0\n */\nstatic make() { return 1 }\n}\n"
    },
    "expected": [
      "console.log(\"R11_PROPERTY\")\nexport {}",
      "console.log(\"R11_METHOD\")\nexport {}"
    ],
    "runExamples": true
  },
  {
    "name": "property-only",
    "files": {
      "src/Box.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n */\nexport class Box {\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_PROPERTY_ONLY\")\n * export {}\n * ```\n */\nreadonly value = 1\n/**\n * Fixture.\n * @since 1.0.0\n */\nread() { return this.value }\n/**\n * Fixture.\n * @since 1.0.0\n */\nstatic make() { return 1 }\n}\n"
    },
    "expected": [
      "console.log(\"R11_PROPERTY_ONLY\")\nexport {}"
    ],
    "runExamples": true
  },
  {
    "name": "ordinary-controls",
    "files": {
      "src/Box.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_CLASS\")\n * export {}\n * ```\n */\nexport class Box {\n/**\n * Fixture.\n * @since 1.0.0\n */\nreadonly value = 1\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_METHOD\")\n * export {}\n * ```\n */\nread() { return this.value }\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_STATIC\")\n * export {}\n * ```\n */\nstatic make() { return 1 }\n}\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_NAMESPACE\")\n * export {}\n * ```\n */\nexport namespace Outer {\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_NESTED\")\n * export {}\n * ```\n */\nexport namespace Inner {\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_INTERFACE\")\n * export {}\n * ```\n */\nexport interface Item { value: string }\n}\n}\n"
    },
    "expected": [
      "console.log(\"R11_METHOD\")\nexport {}",
      "console.log(\"R11_CLASS\")\nexport {}",
      "console.log(\"R11_STATIC\")\nexport {}",
      "console.log(\"R11_NAMESPACE\")\nexport {}",
      "console.log(\"R11_NESTED\")\nexport {}",
      "console.log(\"R11_INTERFACE\")\nexport {}"
    ],
    "runExamples": true
  },
  {
    "name": "property-description-multiple-and-skip",
    "files": {
      "src/Box.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n */\nexport class Box {\n/**\n * ```ts\n * console.log(\"R11_DESCRIPTION\")\n * export {}\n * ```\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_TAG_ONE\")\n * export {}\n * ```\n * @example\n * ```ts\n * console.log(\"R11_TAG_TWO\")\n * export {}\n * ```\n * @example\n * ```ts skip-type-checking\n * const skipped: string = 1\n * ```\n */\nreadonly value = 1\n/**\n * Fixture.\n * @since 1.0.0\n */\nread() { return this.value }\n/**\n * Fixture.\n * @since 1.0.0\n */\nstatic make() { return 1 }\n}\n"
    },
    "expected": [
      "console.log(\"R11_DESCRIPTION\")\nexport {}",
      "console.log(\"R11_TAG_ONE\")\nexport {}",
      "console.log(\"R11_TAG_TWO\")\nexport {}"
    ],
    "runExamples": true
  },
  {
    "name": "empty",
    "files": {
      "src/Box.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n */\nexport class Box {\n/**\n * Fixture.\n * @since 1.0.0\n */\nreadonly value = 1\n/**\n * Fixture.\n * @since 1.0.0\n */\nread() { return this.value }\n/**\n * Fixture.\n * @since 1.0.0\n */\nstatic make() { return 1 }\n}\n"
    },
    "expected": [],
    "runExamples": true
  },
  {
    "name": "skip-only",
    "files": {
      "src/Box.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n */\nexport class Box {\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts skip-type-checking\n * const skipped: string = 1\n * ```\n */\nreadonly value = 1\n/**\n * Fixture.\n * @since 1.0.0\n */\nread() { return this.value }\n/**\n * Fixture.\n * @since 1.0.0\n */\nstatic make() { return 1 }\n}\n"
    },
    "expected": [],
    "runExamples": true
  },
  {
    "name": "check-only",
    "files": {
      "src/Box.ts":
        "/**\n * Module.\n * @since 1.0.0\n */\nexport {}\n/**\n * Fixture.\n * @since 1.0.0\n */\nexport class Box {\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_PROPERTY\")\n * export {}\n * ```\n */\nreadonly value = 1\n/**\n * Fixture.\n * @since 1.0.0\n * @example\n * ```ts\n * console.log(\"R11_METHOD\")\n * export {}\n * ```\n */\nread() { return this.value }\n/**\n * Fixture.\n * @since 1.0.0\n */\nstatic make() { return 1 }\n}\n"
    },
    "expected": [
      "console.log(\"R11_PROPERTY\")\nexport {}",
      "console.log(\"R11_METHOD\")\nexport {}"
    ],
    "runExamples": false
  }
]
