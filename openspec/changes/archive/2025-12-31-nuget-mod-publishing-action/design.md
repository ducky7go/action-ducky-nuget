# Design: NuGet Mod Publishing Action

## Context

This GitHub Action automates the packaging and publishing of game mods to NuGet servers. The implementation must follow the **NuGet Mod Packaging Specification v1.0**, which defines the mapping between game mod folders and NuGet package format.

**Stakeholders:**
- Mod authors who want to distribute mods via NuGet
- GitHub users integrating this action into CI/CD workflows

**Constraints:**
- Must run in GitHub Actions environment (Ubuntu/Windows/macOS runners)
- Must follow NuGet Mod Packaging Specification v1.0 exactly
- Must handle external dependency: NuGet CLI tool

**External Reference:**
- Specification: `/home/newbe36524/repos/newbe36524/dukcy-package-spec/specs/nuget-mod-packaging/v1.0/00-specification.md`

## Goals / Non-Goals

**Goals:**
- Parse `info.ini` metadata and generate valid `.nuspec` files
- Package mod files into `.nupkg` following the specification
- Publish packages to any NuGet server (default: nuget.org)
- Validate mod structure (name matches DLL, version is SemVer)
- Provide clear error messages for common failure modes

**Non-Goals:**
- Mod installation (only packaging/publishing)
- Dependency resolution between mods
- Steam Workshop integration
- Custom .nuspec templates (use spec-compliant defaults)

## Decisions

### Decision 1: TypeScript Implementation

**What:** Implement the action using TypeScript with `@actions/core` and `@actions/exec`.

**Why:**
- GitHub Actions official libraries provide TypeScript support
- Type safety for complex parsing logic
- Easy integration with `@actions/exec` for NuGet CLI commands
- Compiled JS can be committed to repository for zero-dependency execution

**Alternatives Considered:**
1. **Bash script** - Rejected due to complex XML generation and INI parsing
2. **Python** - Viable but TypeScript has better GitHub Actions integration
3. **Composite action** - Rejected due to complexity requiring custom logic

### Decision 2: INI Parsing Strategy

**What:** Use a simple INI parser that supports flat structure (no sections).

**Why:**
- The specification defines `info.ini` as a flat structure without sections
- Standard INI parsers may expect section headers (e.g., `[mod]`)
- Custom parser ensures exact compliance with the spec format

**Implementation Approach:**
```typescript
// Parse "key = value" lines, ignore empty lines and comments
// Support multiline values with \| delimiter for localization
```

**Alternatives Considered:**
1. **Standard INI library** - May impose section-based structure
2. **Regex-only parsing** - More fragile for edge cases

### Decision 3: NuGet CLI Integration

**What:** Use the official NuGet CLI (`nuget.exe`) for pack and push operations.

**Why:**
- Official tool ensures 100% compliance with NuGet package format
- Handles complex packaging logic (OPC format, ZIP compression, etc.)
- Widely tested and maintained by Microsoft

**Installation:**
- Linux/macOS: Use `nuget.exe` via Mono or download standalone binary
- Windows: Pre-installed or download via script
- URL: `https://dist.nuget.org/win-x86-commandline/latest/nuget.exe`

**Alternatives Considered:**
1. **DotNet tool** - Requires .NET SDK installation (heavier)
2. **Node.js NuGet libraries** - Less mature, may have compatibility issues

### Decision 4: Wildcard Packaging Approach

**What:** Use `<file src="**" target="content\" exclude="preview.png" />` for including all files.

**Why:**
- Specification explicitly recommends this approach
- Automatically includes all files without maintaining explicit lists
- No need to update `.nuspec` when mod structure changes
- Works with any mod folder structure

**Implementation:**
```xml
<files>
  <file src="preview.png" target="icon.png" />
  <file src="**" target="content\" exclude="preview.png" />
</files>
```

### Decision 5: Validation Error Handling

**What:** Fail fast with clear error messages for common validation failures.

**Validations:**
1. `name` field matches DLL filename
2. `version` is valid SemVer 2.0.0
3. Required fields exist in `info.ini`
4. At least one `.dll` file exists in mod folder

**Error Format:**
```
Error: Validation failed
- The 'name' field (DisplayItemValue) does not match any DLL filename.
  Expected: DisplayItemValue.dll
  Found: OtherMod.dll
```

### Decision 6: Input/Output Interface

**Inputs (action.yml):**
```yaml
inputs:
  mod_folder_path:
    description: 'Path to the mod folder to package'
    required: true
  nuget_server:
    description: 'NuGet server URL (default: nuget.org)'
    required: false
    default: 'https://api.nuget.org/v3/index.json'
  nuget_api_key:
    description: 'API key for NuGet server authentication'
    required: true
```

**Outputs:**
```yaml
outputs:
  success:
    description: 'true if packaging and publishing succeeded'
  package_path:
    description: 'path to the generated .nupkg file'
  version:
    description: 'package version that was published'
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Action Entry Point                │
│                       (index.ts)                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ info.ini      │   │ Validation    │   │ NuGet CLI     │
│ Parser        │   │ Module        │   │ Executor      │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Metadata      │   │ DLL Name      │   │ Pack Command  │
│ Object        │   │ SemVer Check  │   │ Push Command  │
└───────────────┘   └───────────────┘   └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                  ┌─────────────────┐
                  │ .nuspec         │
                  │ Generator       │
                  └─────────────────┘
```

## Module Breakdown

### 1. info.ini Parser Module
- **Input:** File path to `info.ini`
- **Output:** Parsed metadata object
- **Dependencies:** None (custom implementation)

### 2. Validation Module
- **Input:** Metadata object, mod folder path
- **Output:** Validation result with errors if any
- **Dependencies:** info.ini Parser

### 3. .nuspec Generator Module
- **Input:** Metadata object, preview.png existence
- **Output:** .nuspec file content (XML string)
- **Dependencies:** None

### 4. NuGet Executor Module
- **Input:** Command arguments
- **Output:** Command result (stdout, stderr, exit code)
- **Dependencies:** NuGet CLI installation

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| NuGet CLI version changes | Medium | Pin to specific version in installation script |
| Cross-platform compatibility | Medium | Test on Ubuntu, Windows, macOS runners |
| Malformed info.ini files | Low | Clear error messages, validation before processing |
| API key exposure in logs | High | Use `setSecret` for API key, filter logs |
| Concurrent publish conflicts | Low | Document idempotency, version conflict errors |

## Migration Plan

Not applicable - new feature.

## Open Questions

None - design is complete based on specification.
