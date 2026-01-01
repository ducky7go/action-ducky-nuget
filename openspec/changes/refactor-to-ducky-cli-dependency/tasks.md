## 1. Implementation

- [x] 1.1 Add `@ducky7go/ducky-cli` as a dependency in `package.json`
- [x] 1.2 Verify TypeScript configuration supports ESM imports (update `tsconfig.json` if needed)
- [x] 1.3 Update `src/index.ts` to use `@ducky7go/ducky-cli` CLI interface
- [x] 1.4 Remove `src/parser.ts`
- [x] 1.5 Remove `src/validation.ts`
- [x] 1.6 Remove `src/nuspec.ts`
- [x] 1.7 Remove `src/nuget.ts`
- [x] 1.8 Update import statements in `src/index.ts`

## 2. Build Configuration

- [x] 2.1 Verify `@vercel/ncc` correctly bundles the ducky-cli dependency
- [x] 2.2 Run `npm run build` to verify TypeScript compilation
- [x] 2.3 Run `npm run package` to verify ncc bundling
- [x] 2.4 Check bundle size and ensure no external dependencies are missing

## 3. Testing and Validation

- [x] 3.1 Verify action accepts all existing input parameters (backward compatibility)
- [x] 3.2 Verify action produces all existing outputs (backward compatibility)
- [x] 3.3 Test with a sample mod folder containing valid `info.ini`
- [x] 3.4 Test error handling for missing/invalid `info.ini`
- [x] 3.5 Test error handling for DLL name mismatch
- [x] 3.6 Test successful packaging and publishing flow
- [x] 3.7 Verify `dist/index.js` contains ducky-cli code

## 4. Documentation

- [x] 4.1 Update README if implementation details are documented
- [x] 4.2 Verify action.yml inputs/outputs remain correct
