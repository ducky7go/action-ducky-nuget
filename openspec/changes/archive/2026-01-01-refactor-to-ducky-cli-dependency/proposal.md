# Change: Refactor to use @ducky7go/ducky-cli dependency

## Why

The action-ducky-nuget GitHub Action currently maintains its own TypeScript implementation of NuGet package parsing, validation, packaging, and publishing logic. The @ducky7go/ducky-cli npm package has been published as a standalone CLI tool that provides equivalent functionality through a command-line interface. This creates code duplication between the two projects and increases maintenance burden.

## What Changes

- **BREAKING**: Remove internal implementation modules (`parser.ts`, `validation.ts`, `nuspec.ts`, `nuget.ts`)
- **MODIFIED**: Refactor `src/index.ts` to use `@ducky7go/ducky-cli` as a dependency instead of internal modules
- **MODIFIED**: Update `package.json` to add `@ducky7go/ducky-cli` as a production dependency
- **MODIFIED**: Ensure `@vercel/ncc` correctly bundles the ducky-cli dependency
- **PRESERVED**: All existing GitHub Actions input/output interfaces remain backward compatible

## Impact

- **Affected specs**: `mod-packaging` (implementation detail changes, external behavior preserved)
- **Affected code**:
  - `src/parser.ts` (removed)
  - `src/validation.ts` (removed)
  - `src/nuspec.ts` (removed)
  - `src/nuget.ts` (removed)
  - `src/index.ts` (refactored to thin wrapper)
  - `package.json` (dependency added)
  - `tsconfig.json` (may need module configuration updates)
- **Backward compatibility**: Maintained - existing GitHub Actions workflows require no changes
- **Benefits**:
  - Reduced codebase size and maintenance burden
  - Single source of truth for NuGet packaging logic
  - Automatic feature synchronization with ducky-cli updates
  - Smaller Action bundle size
