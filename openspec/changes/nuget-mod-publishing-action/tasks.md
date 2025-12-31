# Implementation Tasks

## 1. Project Setup
- [x] 1.1 Initialize Node.js project with TypeScript configuration
- [x] 1.2 Set up GitHub Actions action.yml metadata file
- [x] 1.3 Configure build script (tsc for TypeScript compilation)
- [x] 1.4 Add required dependencies (@actions/core, @actions/exec, ini for parsing)

## 2. info.ini Parser
- [x] 2.1 Implement INI file reader (supports flat structure without sections)
- [x] 2.2 Parse required fields: name, displayName, description
- [x] 2.3 Parse optional fields: version, tags, authors, license, homepage, publishedFileId
- [x] 2.4 Add validation for missing required fields

## 3. Validation Module
- [x] 3.1 Implement DLL filename validation (name field must match DLL filename)
- [x] 3.2 Implement SemVer 2.0 version validation
- [x] 3.3 Add NuGet ID format validation
- [x] 3.4 Return clear error messages for validation failures

## 4. .nuspec Generator
- [x] 4.1 Generate XML .nuspec file with metadata mapping
- [x] 4.2 Map info.ini fields to .nuspec elements (name→id, displayName→title, etc.)
- [x] 4.3 Generate `<files>` section with wildcard rules
- [x] 4.4 Handle preview.png → icon.png transformation
- [x] 4.5 Handle comma-separated tags conversion (comma to space)

## 5. Packaging Module
- [x] 5.1 Integrate NuGet CLI tool installation in action
- [x] 5.2 Execute `nuget pack` with generated .nuspec file
- [x] 5.3 Verify .nupkg file is created successfully
- [x] 5.4 Handle packaging errors gracefully

## 6. Publishing Module
- [x] 6.1 Implement NuGet server configuration (default: nuget.org)
- [x] 6.2 Execute `nuget push` with API key authentication
- [x] 6.3 Handle publishing errors (conflict, auth failure, server error)
- [x] 6.4 Add retry logic for transient failures

## 7. Action Entry Point
- [x] 7.1 Create main TypeScript entry point (index.ts)
- [x] 7.2 Wire up input parameter parsing
- [x] 7.3 Implement end-to-end workflow: parse → validate → generate → pack → publish
- [x] 7.4 Add detailed logging and error reporting
- [x] 7.5 Set GitHub Action outputs (package_path, version, success status)

## 8. Testing
- [ ] 8.1 Create unit tests for info.ini parser
- [ ] 8.2 Create unit tests for validation module
- [ ] 8.3 Create unit tests for .nuspec generator
- [ ] 8.4 Create integration test with sample mod folder
- [ ] 8.5 Add test for NuGet publishing (using test server)

## 9. Documentation
- [x] 9.1 Write README.md with usage examples
- [x] 9.2 Document action.yml with all inputs and outputs
- [x] 9.3 Add example workflow.yml for users
- [x] 9.4 Document error codes and troubleshooting
