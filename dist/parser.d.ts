/**
 * Represents the parsed metadata from info.ini
 */
export interface ModMetadata {
    /** Unique mod identifier (must match DLL filename) */
    name: string;
    /** Human-readable name */
    displayName: string;
    /** Short description */
    description: string;
    /** Steam Workshop Published File ID */
    publishedFileId?: string;
    /** Semantic version (SemVer 2.0) */
    version?: string;
    /** Comma-separated search tags */
    tags?: string;
    /** Mod author(s) */
    authors?: string;
    /** License identifier (SPDX) */
    license?: string;
    /** Project homepage URL */
    homepage?: string;
}
/**
 * Result of parsing info.ini
 */
export interface ParseResult {
    success: boolean;
    metadata?: ModMetadata;
    error?: string;
}
/**
 * Parses a flat INI file (without sections)
 * Format: key = value
 * Supports multiline values with \| delimiter for localization
 */
export declare function parseInfoIni(content: string): ParseResult;
/**
 * Reads and parses an info.ini file
 */
export declare function readInfoIni(filePath: string): Promise<ParseResult>;
