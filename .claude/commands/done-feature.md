# Feature Completion - Effect Library

## 🎯 OBJECTIVE
Complete feature development with comprehensive validation, documentation updates, and proper git workflow for the Effect library.

## 📋 COMPLETION WORKFLOW

### Phase 1: Final Validation (MANDATORY)
Run all quality gates to ensure implementation meets Effect library standards:

```bash
# 1. Lint all modified TypeScript files
pnpm lint --fix packages/effect/src/<modified-files>.ts

# 2. CRITICAL: Validate JSDoc examples compile
pnpm docgen

# 3. Run complete type checking
pnpm check

# 4. Run all relevant tests
pnpm test <test-files>

# 5. Build entire project
pnpm build

# 6. Verify JSDoc coverage improvements (if applicable)
node scripts/analyze-jsdoc.mjs --file=<modified-files>
```

**🚨 CRITICAL**: All checks must pass with ZERO errors before proceeding.

### Phase 2: Documentation Updates
Update project documentation to reflect completed work:

#### Update Specifications
- [ ] Mark completed tasks in `.specs/[feature-name]/plan.md` with ✅
- [ ] Add implementation summary to plan.md
- [ ] Document any architectural decisions made
- [ ] Note any deviations from original design with rationale

#### Update Progress Tracking
```bash
# Update overall specs progress if applicable
# Update any related documentation files
# Ensure all examples in documentation compile
```

### Phase 3: Git Workflow
Execute proper git workflow with comprehensive commit messages:

#### Stage Changes
```bash
# Add all implementation files
git add packages/effect/src/<new-files>
git add packages/effect/test/<test-files>

# Add documentation updates
git add .specs/<feature-name>/
git add .claude/commands/ # if commands were added/modified

# Add any other related files
git add <other-modified-files>
```

#### Commit with Structured Message
```bash
git commit -m "$(cat <<'EOF'
feat: implement [feature-name]

[Brief description of what the feature does and why it was needed]

Implementation highlights:
- [Key architectural decisions]
- [Important patterns used]
- [Testing approach]
- [Documentation coverage]

Validation:
- ✅ All TypeScript files linted with zero errors
- ✅ pnpm docgen passes with all examples compiling
- ✅ pnpm check passes with zero type errors  
- ✅ All tests pass with proper Effect patterns
- ✅ pnpm build completes successfully
- ✅ JSDoc coverage at 100% for new APIs

Closes: [issue-number if applicable]

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Phase 4: Pull Request Creation (if on feature branch)
Create pull request with comprehensive description:

```bash
# Ensure branch is up to date and pushed
git push -u origin <feature-branch-name>

# Create pull request with structured description
gh pr create --title "feat: [feature-name]" --body "$(cat <<'EOF'
## Summary
[Brief description of the feature and its purpose]

## Implementation Details
- **Architecture**: [Key architectural patterns used]
- **Type Safety**: [How type safety is maintained]
- **Error Handling**: [Error handling approach]
- **Testing**: [Testing strategy and coverage]
- **Documentation**: [JSDoc coverage and examples]

## Effect Library Compliance
- ✅ No `try-catch` blocks in Effect.gen generators
- ✅ No type assertions (`as any`, `as never`, `as unknown`)
- ✅ Proper `return yield*` pattern for errors/interrupts
- ✅ All TypeScript files linted immediately after editing
- ✅ All JSDoc examples compile via `pnpm docgen`
- ✅ Tests use @effect/vitest with `it.effect` patterns
- ✅ Time-dependent tests use TestClock appropriately

## Validation Results
- ✅ `pnpm lint` - All linting passes
- ✅ `pnpm docgen` - All examples compile
- ✅ `pnpm check` - Zero type errors
- ✅ `pnpm test` - All tests pass
- ✅ `pnpm build` - Build completes successfully

## Test Plan
- [ ] Verify feature works as documented
- [ ] Test error conditions and edge cases
- [ ] Validate integration with existing APIs
- [ ] Confirm documentation examples work
- [ ] Check performance characteristics if applicable

## Breaking Changes
[None / List any breaking changes with migration notes]

## Related Issues
[List any related issues or dependencies]

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF
)"
```

### Phase 5: Final Verification
Ensure all completion criteria are met:

#### Quality Metrics
- [ ] All automated checks pass (`lint`, `docgen`, `check`, `test`, `build`)
- [ ] Feature works end-to-end as specified
- [ ] Test coverage adequate with proper Effect patterns
- [ ] JSDoc coverage at 100% for new public APIs
- [ ] No breaking changes to existing functionality
- [ ] Documentation updated appropriately

#### Effect Library Standards
- [ ] No forbidden patterns used (`try-catch` in generators, type assertions)
- [ ] Proper Effect patterns throughout (generator functions, error handling)
- [ ] Resource management follows Effect conventions
- [ ] Testing uses @effect/vitest and TestClock appropriately
- [ ] All examples compile and demonstrate practical usage

#### Documentation Quality
- [ ] All new APIs have comprehensive @example tags
- [ ] Examples demonstrate real-world usage patterns
- [ ] Appropriate @category annotations applied
- [ ] Integration with existing documentation seamless

## 🎯 SUCCESS CRITERIA
- ✅ All validation steps pass completely
- ✅ Documentation updated and accurate
- ✅ Git workflow completed with structured commits
- ✅ Pull request created (if applicable) with comprehensive description
- ✅ Feature ready for review and integration
- ✅ Zero technical debt introduced

## 🚨 CRITICAL REMINDERS
- **NEVER skip validation steps** - all checks must pass
- **NEVER commit with failing tests or compilation errors**
- **ALWAYS update documentation** to reflect implementation
- **ALWAYS use structured commit messages** for traceability
- **ALWAYS maintain Effect library quality standards** throughout

This completion workflow ensures that features are delivered with the highest quality standards and proper integration into the Effect library ecosystem.