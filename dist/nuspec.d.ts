import { ModMetadata } from './parser.js';
/**
 * Generates the XML content for a .nuspec file following the NuGet Mod Packaging Specification v1.0
 */
export declare function generateNuspec(metadata: ModMetadata, hasPreviewPng: boolean): string;
/**
 * Checks if preview.png exists in the mod folder
 */
export declare function hasPreviewImage(modFolderPath: string): Promise<boolean>;
