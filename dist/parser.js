"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseInfoIni = parseInfoIni;
exports.readInfoIni = readInfoIni;
/**
 * Parses a flat INI file (without sections)
 * Format: key = value
 * Supports multiline values with \| delimiter for localization
 */
function parseInfoIni(content) {
    const lines = content.split(/\r?\n/);
    const metadata = {};
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
async function readInfoIni(filePath) {
    const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return parseInfoIni(content);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return {
                success: false,
                error: `info.ini not found at: ${filePath}`
            };
        }
        throw error;
    }
}
//# sourceMappingURL=parser.js.map