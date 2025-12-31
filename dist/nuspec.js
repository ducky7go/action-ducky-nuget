"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNuspec = generateNuspec;
exports.hasPreviewImage = hasPreviewImage;
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const DEFAULT_VERSION = '1.0.0';
const DEFAULT_AUTHORS = 'Unknown';
// Default tags automatically added to all mod packages
const DEFAULT_TAGS = ['duckymod', 'game-mod'];
/**
 * Generates the XML content for a .nuspec file following the NuGet Mod Packaging Specification v1.0
 */
function generateNuspec(metadata, hasPreviewPng) {
    const version = metadata.version || DEFAULT_VERSION;
    const authors = metadata.authors || DEFAULT_AUTHORS;
    // Combine default tags with user tags, convert comma-separated to space-separated
    const userTags = metadata.tags ? metadata.tags.split(',').map(t => t.trim()).filter(t => t) : [];
    const allTags = [...DEFAULT_TAGS, ...userTags];
    const tags = allTags.join(' ');
    let xml = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2013/05/nuspec.xsd">
  <metadata>
    <id>${escapeXml(metadata.name)}</id>
    <version>${escapeXml(version)}</version>
    <title>${escapeXml(metadata.displayName)}</title>
    <description>${escapeXml(metadata.description)}</description>
    <authors>${escapeXml(authors)}</authors>`;
    if (tags) {
        xml += `\n    <tags>${escapeXml(tags)}</tags>`;
    }
    if (hasPreviewPng) {
        xml += `\n    <icon>icon.png</icon>`;
    }
    if (metadata.license) {
        xml += `\n    <license type="expression">${escapeXml(metadata.license)}</license>`;
    }
    if (metadata.homepage) {
        xml += `\n    <projectUrl>${escapeXml(metadata.homepage)}</projectUrl>`;
    }
    xml += `\n  </metadata>
  <files>`;
    if (hasPreviewPng) {
        xml += `
    <file src="preview.png" target="icon.png" />`;
    }
    // Wildcard rule for all mod files
    xml += `
    <file src="**" target="content\\" exclude="preview.png" />
  </files>
</package>`;
    return xml;
}
/**
 * Escapes special XML characters
 */
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
/**
 * Checks if preview.png exists in the mod folder
 */
async function hasPreviewImage(modFolderPath) {
    try {
        await (0, promises_1.access)(`${modFolderPath}/preview.png`, fs_1.constants.R_OK);
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=nuspec.js.map