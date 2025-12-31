import { ModMetadata } from './parser.js';
/**
 * Result of validation
 */
export interface ValidationResult {
    success: boolean;
    errors: string[];
}
/**
 * Validates a SemVer 2.0.0 version string
 * Pattern: major.minor.patch[-prerelease][+build]
 */
export declare function isValidSemVer(version: string): boolean;
/**
 * Validates a NuGet ID (must start with letter, contain only alphanumeric, ., _, -)
 */
export declare function isValidNuGetId(id: string): boolean;
/**
 * Validates that the name field matches the DLL filename
 */
export declare function validateDllName(modFolderPath: string, name: string): Promise<ValidationResult>;
/**
 * Validates the mod metadata
 */
export declare function validateMetadata(metadata: ModMetadata, modFolderPath: string): Promise<ValidationResult>;
//# sourceMappingURL=validation.d.ts.map