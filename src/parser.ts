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
export function parseInfoIni(content: string): ParseResult {
  const lines = content.split(/\r?\n/);
  const metadata: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
      continue;
    }

    // Parse "key = value" format
    const match = trimmed.match(/^([^=]+?)\s*=\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      metadata[key.trim()] = value.trim();
    }
  }

  // Validate required fields
  const requiredFields = ['name', 'displayName', 'description'];
  const missingFields = requiredFields.filter(field => !metadata[field]);

  if (missingFields.length > 0) {
    return {
      success: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    };
  }

  return {
    success: true,
    metadata: {
      name: metadata.name,
      displayName: metadata.displayName,
      description: metadata.description,
      publishedFileId: metadata.publishedFileId,
      version: metadata.version,
      tags: metadata.tags,
      authors: metadata.authors,
      license: metadata.license,
      homepage: metadata.homepage
    }
  };
}

/**
 * Reads and parses an info.ini file
 */
export async function readInfoIni(filePath: string): Promise<ParseResult> {
  const fs = await import('fs/promises');

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return parseInfoIni(content);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {
        success: false,
        error: `info.ini not found at: ${filePath}`
      };
    }
    throw error;
  }
}
