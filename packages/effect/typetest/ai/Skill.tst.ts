import { hole } from "effect"
import * as Skill from "effect/ai/Skill"
import type * as Effect from "effect/Effect"
import { describe, expect, it } from "tstyche"

const frontmatter = { name: "refunds", description: "Process refunds" }
const authored = Skill.make({
  frontmatter,
  instructions: "Read the policy.",
  files: { "references/policy.md": "Approval required", "assets/logo.bin": new Uint8Array([1]) }
})
const skill = hole<Effect.Success<typeof authored>>()

describe("Skill", () => {
  it("should retain literal file paths when constructing a known bundle", () => {
    expect<Effect.Success<typeof authored>>().type.toBe<
      Skill.Skill<"SKILL.md" | "references/policy.md" | "assets/logo.bin">
    >()
    const entryOnly = Skill.make({ frontmatter, instructions: "" })
    expect<Effect.Success<typeof entryOnly>>().type.toBe<Skill.Skill<"SKILL.md">>()
    const imported = Skill.fromFiles({ "SKILL.md": "document", "policy.md": "policy" })
    expect<Effect.Success<typeof imported>>().type.toBe<Skill.Skill<"SKILL.md" | "policy.md">>()
  })

  it("should constrain paths to the bundle when reading directly", () => {
    expect(Skill.readText(skill, "references/policy.md")).type.toBe<Effect.Effect<string, Skill.SkillReadError>>()
    expect(Skill.readBytes(skill, "assets/logo.bin")).type.toBe<Effect.Effect<Uint8Array, Skill.SkillReadError>>()
    // @ts-expect-error is not assignable
    Skill.readText(skill, "references/polciy.md")
    // @ts-expect-error is not assignable
    Skill.readBytes(skill, "assets/missing.bin")
    // @ts-expect-error is not assignable
    Skill.readText(skill, hole<string>())
  })

  it("should constrain paths to the bundle when piping a read", () => {
    expect(skill.pipe(Skill.readText("references/policy.md"))).type.toBe<Effect.Effect<string, Skill.SkillReadError>>()
    expect(skill.pipe(Skill.readBytes("assets/logo.bin"))).type.toBe<Effect.Effect<Uint8Array, Skill.SkillReadError>>()
    // @ts-expect-error is not assignable
    skill.pipe(Skill.readText("references/polciy.md"))
    // @ts-expect-error is not assignable
    skill.pipe(Skill.readBytes("assets/missing.bin"))
    // @ts-expect-error is not assignable
    skill.pipe(Skill.readText(hole<"SKILL.md" | "missing.md">()))
  })

  it("should accept string paths when bundle keys are dynamic or explicitly widened", () => {
    const files = hole<Record<string, Skill.FileInput>>()
    const dynamic = Skill.make({ frontmatter, instructions: "", files })
    const imported = Skill.fromFiles(hole<{ readonly "SKILL.md": Skill.FileInput } & Record<string, Skill.FileInput>>())
    expect<Effect.Success<typeof dynamic>>().type.toBe<Skill.Skill<string>>()
    expect<Effect.Success<typeof imported>>().type.toBe<Skill.Skill<string>>()
    const bundle: Skill.Skill = skill
    const path = hole<string>()
    expect(Skill.readText(bundle, path)).type.toBe<Effect.Effect<string, Skill.SkillReadError>>()
    expect(Skill.readBytes(bundle, path)).type.toBe<Effect.Effect<Uint8Array, Skill.SkillReadError>>()
    expect(bundle.pipe(Skill.readText(path))).type.toBe<Effect.Effect<string, Skill.SkillReadError>>()
    expect(bundle.pipe(Skill.readBytes(path))).type.toBe<Effect.Effect<Uint8Array, Skill.SkillReadError>>()
  })
})
