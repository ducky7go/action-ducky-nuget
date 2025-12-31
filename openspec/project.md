# Project Context

## Purpose

GitHub Action for automated packaging and publishing of game mods to NuGet servers. This action follows the NuGet Mod Packaging Specification v1.0 to streamline the mod distribution workflow for game mod authors.

**Primary Goals:**
- Automate conversion of `info.ini` metadata to NuGet `.nuspec` format
- Package mod files into `.nupkg` files with proper structure
- Publish to NuGet.org or custom NuGet servers
- Support both API key and Trusted Publisher (OIDC) authentication

## Tech Stack

- **TypeScript 5.3+** - Primary implementation language
- **Node.js 20** - Runtime environment (GitHub Actions)
- **GitHub Actions Toolkit** (`@actions/core`, `@actions/exec`, `@actions/io`)
- **NuGet CLI** - External tool for packaging and publishing
- **Vercel ncc** - Bundle TypeScript into single JavaScript file for distribution

## Project Conventions

### Code Style

- **TypeScript strict mode** enabled (see [tsconfig.json](tsconfig.json))
- **ESM imports** - Use `.js` extensions in import statements (TypeScript outputs ESM)
- **Async/await** - Preferred over promises for async operations
- **Error handling** - All async operations wrapped in try-catch with proper error output
- **GitHub Actions logging** - Use `core.info()`, `core.setFailed()`, `core.setOutput()` for user feedback

### Architecture Patterns

**Module Structure:**
- [`parser.ts`](src/parser.ts) - `info.ini` parsing logic
- [`validation.ts`](src/validation.ts) - Metadata validation (DLL name, SemVer version)
- [`nuspec.ts`](src/nuspec.ts) - `.nuspec` XML generation
- [`nuget.ts`](src/nuget.ts) - NuGet CLI installation and execution
- [`index.ts`](src/index.ts) - Main workflow orchestration

**Workflow Steps:**
1. Parse `info.ini` for mod metadata
2. Validate metadata (DLL name match, SemVer compliance)
3. Install NuGet CLI
4. Generate `.nuspec` file
5. Copy mod files to temp directory
6. Pack into `.nupkg`
7. Push to NuGet server

**Result Pattern:**
All functions return `{ success: boolean, ...fields }` objects for consistent error handling.

### Testing Strategy

- Manual testing via GitHub Actions workflows
- Test workflow: [`.github/workflows/publish-mod.yml`](.github/workflows/publish-mod.yml)
- Validation covers: missing required fields, DLL name mismatches, invalid SemVer versions

### Git Workflow

- **Main branch**: `main`
- **Feature branches**: Create from `main` for changes
- **OpenSpec integration**: Use `/openspec:proposal` for planned changes
- **Commit style**: Conventional commits preferred

## Domain Context

**Mod Metadata Structure (`info.ini`):**
- Flat INI format (no sections)
- Required: `name`, `displayName`, `description`
- Optional: `version`, `tags`, `authors`, `license`, `homepage`, `publishedFileId`

**NuGet Package Structure:**
- All mod files placed under `content/` directory in `.nupkg`
- `preview.png` → `icon.png` (if present)
- `name` must match DLL filename (without `.dll` extension)
- `version` defaults to `1.0.0` if not specified

**SemVer 2.0.0 Requirements:**
- Valid: `1.0.0`, `2.3.4-beta`, `1.0.0-rc.1+build.123`
- Invalid: `1.0`, `v1.0.0`, `1.0.0.0`

## Important Constraints

- **Node.js 20 runtime** - Action runs in GitHub Actions `node20` environment
- **Cross-platform** - Must work on Windows, Linux, and macOS runners
- **NuGet CLI dependency** - Automatically downloaded during action execution
- **Path handling** - Support both absolute and relative (to `GITHUB_WORKSPACE`) paths
- **Security** - API keys never logged in output; use GitHub Secrets for credentials

## External Dependencies

- **NuGet CLI** - Downloaded from `https://dist.nuget.org/win-x86-commandline/latest/nuget.exe`
- **NuGet.org API** - Default server at `https://api.nuget.org/v3/index.json`
- **NuGet Mod Packaging Specification v1.0** - External specification defining package format requirements

## OpenSpec Integration

This project uses OpenSpec for change management. See:
- [`openspec/AGENTS.md`](openspec/AGENTS.md) - Agent instructions for proposal workflow
- [`openspec/project.md`](openspec/project.md) - This file
- Current change: [`openspec/changes/nuget-mod-publishing-action/`](openspec/changes/nuget-mod-publishing-action/)

When implementing changes, use the `/openspec:proposal` skill to scaffold proposals and `/openspec:apply` to implement approved changes.
