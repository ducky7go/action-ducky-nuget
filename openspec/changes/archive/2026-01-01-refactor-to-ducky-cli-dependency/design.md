## Context

The action-ducky-nuget GitHub Action currently implements NuGet package parsing, validation, `.nuspec` generation, and publishing logic internally across four TypeScript modules (`parser.ts`, `validation.ts`, `nuspec.ts`, `nuget.ts`). These modules duplicate functionality that now exists in the standalone `@ducky7go/ducky-cli` npm package.

### Stakeholders

- GitHub Action users who expect consistent packaging behavior
- ducky-cli maintainers who want to reduce code duplication
- Action maintainers who want to reduce maintenance burden

### Constraints

- Must maintain backward compatibility with existing GitHub Actions workflows
- Must continue to support Windows, Linux, and macOS GitHub Actions runners
- Must use `@vercel/ncc` for bundling into a single `dist/index.js` file
- Must continue to support `node20` runtime

## Goals / Non-Goals

### Goals

- Eliminate code duplication between action-ducky-nuget and @ducky7go/ducky-cli
- Reduce action-ducky-nuget codebase to a thin wrapper around ducky-cli
- Maintain all existing GitHub Actions interfaces (inputs, outputs, error messages)
- Ensure proper bundling of ducky-cli dependency via ncc
- Simplify maintenance by delegating NuGet logic to ducky-cli

### Non-Goals

- Changing the CLI interface or command structure of the action
- Modifying the GitHub Actions metadata (`action.yml`)
- Adding new features or capabilities beyond delegating to ducky-cli
- Performance optimization (expected to be neutral or improved)

## Decisions

### Decision 1: Use CLI interface rather than programmatic API

**What**: The refactored action will invoke ducky-cli via `exec('npx', ['ducky-cli', 'nuget', 'push', ...])` rather than importing TypeScript modules directly.

**Why**:
- ducky-cli is published as a CLI tool with no stable programmatic API
- Using `npx` ensures the correct version is used based on `package.json`
- Simpler integration with no dependency on internal ducky-cli structure changes
- Clear separation of concerns between action orchestration and packaging logic

**Alternatives considered**:
- Import ducky-cli TypeScript modules directly: Rejected due to lack of stable API and potential bundling issues
- Fork ducky-cli code into action: Rejected as it defeats the purpose of using a shared package

### Decision 2: Preserve all existing input/output interfaces

**What**: All existing GitHub Action inputs (`mod_folder_path`, `nuget_server`, `nuget_api_key`) and outputs (`success`, `package_path`, `version`, `error`) will remain unchanged.

**Why**:
- Zero breaking changes for users
- Existing workflows continue to work without modification
- Migration path is transparent

**Alternatives considered**:
- Update to match ducky-cli CLI arguments exactly: Rejected due to potential breaking changes

### Decision 3: Convert action inputs to CLI arguments

**What**: The action will translate GitHub Action inputs to ducky-cli command-line arguments.

**Mapping**:
- `mod_folder_path` → positional argument to `ducky-cli nuget push`
- `nuget_server` → `--server` flag
- `nuget_api_key` → `--api-key` flag (or environment variable)

**Why**:
- ducky-cli expects a specific command structure
- Maintains separation between action interface and CLI interface

### Decision 4: Single dependency version in package.json

**What**: Add `@ducky7go/ducky-cli` to `dependencies` (not `devDependencies`) with a specific version (e.g., `^1.0.0`).

**Why**:
- Ensures consistent behavior across runs
- Allows controlled updates via dependency version bumps
- ncc will bundle the dependency into the action's `dist/index.js`

**Alternatives considered**:
- Use latest via `npx ducky-cli@latest`: Rejected due to unpredictability
- Install at runtime via `npx`: Rejected as it adds network dependency during action execution

## Risks / Trade-offs

### Risk 1: ducky-cli version drift

**Risk**: ducky-cli updates may introduce breaking changes that affect action behavior.

**Mitigation**:
- Use specific version range (`^1.0.0`) in `package.json`
- Test action against new ducky-cli versions before dependency updates
- Consider pinning to exact version if stability is critical

### Risk 2: ncc bundling issues

**Risk**: ncc may not correctly bundle ducky-cli or its dependencies.

**Mitigation**:
- Verify bundling with `npm run package` and inspect `dist/index.js`
- Test the bundled action in a real GitHub Actions workflow
- Configure ncc externals if needed (though ducky-cli should be bundled)

### Risk 3: CLI argument mismatch

**Risk**: ducky-cli CLI arguments may not match the action's input requirements exactly.

**Mitigation**:
- Review ducky-cli documentation before implementation
- Create adapter code in `src/index.ts` to handle any translation needs
- Add error handling for CLI invocation failures

### Trade-off: Increased bundle size vs. reduced code

**Trade-off**: The action will now bundle ducky-cli code, potentially increasing `dist/index.js` size compared to the current minimal implementation.

**Analysis**:
- Current implementation: ~500 lines of custom code
- ducky-cli: ~800-1200 lines including dependencies
- Net increase is acceptable given the maintenance benefits

## Migration Plan

### Phase 1: Dependency Setup
1. Add `@ducky7go/ducky-cli` to `package.json`
2. Run `npm install` to fetch dependency
3. Verify TypeScript configuration

### Phase 2: Code Refactoring
1. Rewrite `src/index.ts` to use `exec()` with ducky-cli
2. Remove four internal modules
3. Verify all imports are updated

### Phase 3: Build Verification
1. Run `npm run build` (TypeScript compilation)
2. Run `npm run package` (ncc bundling)
3. Inspect `dist/index.js` for ducky-cli code

### Phase 4: Testing
1. Test with valid mod folder
2. Test error cases (missing info.ini, validation failures)
3. Test in actual GitHub Actions workflow (if possible)

### Rollback

If issues arise:
- Revert to previous commit
- Keep the proposal open for future retry
- Investigate specific failure mode and update design

## Open Questions

1. **Exact ducky-cli version**: Which version of ducky-cli should we target initially? (Assumed: latest stable at time of implementation)

2. **ncc configuration**: Will any special ncc configuration be needed for proper bundling? (To be determined during implementation)

3. **Error message format**: Will ducky-cli error messages match the current action's error format? If not, should we translate them or let them through as-is? (Assumed: pass through, add context if needed)
