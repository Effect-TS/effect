# New Feature Development - Effect Library

## 🚨 MANDATORY SPEC-DRIVEN DEVELOPMENT 🚨

This command enforces a rigorous **5-phase development process** for substantial new features in the Effect library. This process ensures systematic development, comprehensive documentation, and alignment with Effect library standards.

### ⚠️ IMPORTANT SCOPE LIMITATION
This workflow is **ONLY** for substantial new features. For other types of work:
- **Bug fixes**: Use standard development workflow
- **Refactoring**: Use `/refactor` command  
- **JSDoc enhancement**: Use `/add-jsdoc` command
- **Test fixes**: Use `/fix-tests` command

### 🔒 AUTHORIZATION PROTOCOL
- **MANDATORY USER AUTHORIZATION** required between each phase
- **NEVER proceed** to next phase without explicit user approval
- **PRESENT completed work** from current phase before requesting authorization
- **WAIT for clear user confirmation** before continuing

### 📋 PHASE STRUCTURE

#### Phase 1: Instructions Phase
**Objective**: Capture initial requirements and user story

**Deliverables**:
- Create feature branch: `feature/[feature-name]`
- Create `.specs/[feature-name]/` directory
- Create `instructions.md` with:
  - Overview and User Story
  - Core Requirements
  - Technical Specifications
  - Acceptance Criteria
  - Out of Scope items
  - Success Metrics
  - Future Considerations
  - Testing Requirements

**🔒 AUTHORIZATION GATE**: Present instructions.md and request user approval to proceed to Requirements Phase

#### Phase 2: Requirements Phase
**Objective**: Structured analysis and formal specifications

**Deliverables**:
- Create `requirements.md` with hierarchical numbering:
  - **FR1.x**: Functional Requirements
  - **NFR2.x**: Non-Functional Requirements
  - **TC3.x**: Technical Constraints
  - **DR4.x**: Data Requirements
  - **IR5.x**: Integration Requirements
  - **DEP6.x**: Dependencies
  - **SC7.x**: Success Criteria

**🔒 AUTHORIZATION GATE**: Present requirements.md and request user approval to proceed to Design Phase

#### Phase 3: Design Phase
**Objective**: Technical architecture and implementation strategy

**Deliverables**:
- Create `design.md` including:
  - **Effect Library Patterns**: Generator functions, error handling, resource management
  - **Type Safety Approach**: No `any` types, no type assertions
  - **Module Architecture**: Layer composition, dependency injection
  - **Error Handling Strategy**: Data.TaggedError patterns
  - **Testing Strategy**: @effect/vitest, TestClock for time-dependent code
  - **JSDoc Documentation Plan**: @example tags, @category annotations
  - **Code Examples**: Demonstrating key implementations
  - **Integration Points**: How feature fits with existing codebase

**🔒 AUTHORIZATION GATE**: Present design.md and request user approval to proceed to Plan Phase

#### Phase 4: Plan Phase  
**Objective**: Implementation roadmap with progress tracking

**Deliverables**:
- Create `plan.md` with:
  - **5-Phase Implementation Structure** with checkboxes
  - **Task Hierarchies** with clear objectives
  - **Validation Checkpoints**: docgen, lint, typecheck, tests
  - **Risk Mitigation Strategies**
  - **Success Criteria Validation**
  - **Progress Tracking System**

**🔒 AUTHORIZATION GATE**: Present plan.md and request user approval to proceed to Implementation Phase

#### Phase 5: Implementation Phase
**Objective**: Execute development with continuous validation

**Implementation Requirements**:

##### 🚨 CRITICAL EFFECT LIBRARY REQUIREMENTS 🚨
- **FORBIDDEN**: `try-catch` blocks inside `Effect.gen` generators
- **FORBIDDEN**: Type assertions (`as any`, `as never`, `as unknown`)
- **MANDATORY**: `return yield*` pattern for errors/interrupts in Effect.gen
- **MANDATORY**: `pnpm lint --fix <file.ts>` after editing ANY TypeScript file
- **MANDATORY**: `pnpm docgen` must pass with zero errors
- **MANDATORY**: Use @effect/vitest with `it.effect` for Effect-based tests
- **MANDATORY**: Use TestClock for time-dependent testing

##### Validation Steps (MANDATORY after each implementation step):
```bash
# 1. Lint TypeScript files immediately after editing
pnpm lint --fix packages/effect/src/<modified-file>.ts

# 2. Validate JSDoc examples compile
pnpm docgen

# 3. Run type checking
pnpm check

# 4. Run relevant tests  
pnpm test <test-file>

# 5. Build project
pnpm build
```

##### Implementation Workflow:
1. **Create Implementation Files**
   - Follow existing TypeScript patterns
   - Use proper Effect constructors and combinators
   - Add comprehensive JSDoc with @example tags

2. **Create Test Files**
   - Use @effect/vitest with `it.effect` pattern
   - Use TestClock for time-dependent operations
   - Test error conditions with proper Effect error handling

3. **Continuous Validation**
   - Run validation steps after each change
   - Fix any issues immediately
   - Never accumulate technical debt

4. **Documentation Enhancement**
   - Ensure all public APIs have JSDoc @example tags
   - Use appropriate @category annotations
   - Validate examples compile with docgen

##### Completion Criteria:
- [ ] All implementation files created and tested
- [ ] All validation steps pass consistently
- [ ] JSDoc coverage at 100% for new APIs
- [ ] Test coverage adequate with proper patterns
- [ ] Feature works end-to-end as specified
- [ ] No breaking changes to existing functionality
- [ ] Documentation updated appropriately

**🔒 AUTHORIZATION GATE**: Present completed implementation with all validation passing and request user approval for completion

### 🎯 SUCCESS METRICS
- All 5 phases completed with user authorization
- Zero compilation errors (`pnpm docgen`, `pnpm check`, `pnpm build`)
- Comprehensive test coverage with proper Effect patterns
- 100% JSDoc coverage for new public APIs
- Feature delivers on all acceptance criteria
- Integration with existing codebase seamless

### 🚨 CRITICAL REMINDERS
- **NEVER skip phases** or authorization gates
- **NEVER use forbidden patterns** (try-catch in generators, type assertions)
- **ALWAYS validate immediately** after changes
- **ALWAYS use proper Effect patterns** throughout implementation
- **ALWAYS maintain existing code quality standards**

This workflow ensures systematic, high-quality feature development that maintains the Effect library's standards for type safety, functional programming patterns, and comprehensive documentation.