import * as Fs from "node:fs";

const modules = Fs.readdirSync("src")
  .filter((_) => _.endsWith(".ts") && _ !== "index.ts")
  .map((_) => _.slice(0, -3))
  .map((module) => {
    const content = Fs.readFileSync(`src/${module}.ts`, "utf8");
    const topComment = content.match(/\/\*\*\n.+?\*\//s)?.[0] ?? "";
    return `${topComment}
export * as ${module} from "./${module}"`;
  })
  .join("\n\n");

console.log(
  `export {
  /**
   * @since 1.0.0
   */
  absurd,
  /**
   * @since 1.0.0
   */
  flow,
  /**
   * @since 1.0.0
   */
  hole,
  /**
   * @since 1.0.0
   */
  identity,
  /**
   * @since 1.0.0
   */
  pipe,
  /**
   * @since 1.0.0
   */
  unsafeCoerce
} from "./Function"

${modules}`,
);
