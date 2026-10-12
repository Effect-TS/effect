// Not a test file. What the CLI would generate (or a TS plugin would check): every test
// file's default export must be a fully provided tree, i.e. `Test.Runnable` (= Node<never>).
// `tsc -p .` fails if any test file forgot to provide a fixture.
import type * as Test from "../src/Test.ts"
import accounts from "./accounts.test.ts"
import basics from "./basics.test.ts"
import contract from "./contract.test.ts"
import failures from "./failures.test.ts"
import fixturesA from "./fixtures-a.test.ts"
import fixturesB from "./fixtures-b.test.ts"
import options from "./options.test.ts"
import provide from "./provide.test.ts"

accounts satisfies Test.Runnable
basics satisfies Test.Runnable
contract satisfies Test.Runnable
failures satisfies Test.Runnable
fixturesA satisfies Test.Runnable
fixturesB satisfies Test.Runnable
options satisfies Test.Runnable
provide satisfies Test.Runnable
