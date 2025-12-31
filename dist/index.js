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
const core = __importStar(require("@actions/core"));
const path_1 = require("path");
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const parser_js_1 = require("./parser.js");
const validation_js_1 = require("./validation.js");
const nuspec_js_1 = require("./nuspec.js");
const nuget_js_1 = require("./nuget.js");
async function run() {
    try {
        // Get inputs
        const modFolderPathInput = core.getInput('mod_folder_path', { required: true });
        const nugetServer = core.getInput('nuget_server') || 'https://api.nuget.org/v3/index.json';
        const nugetApiKey = core.getInput('nuget_api_key'); // Optional - if empty, uses Trusted Publisher
        // Resolve mod folder path (relative to GITHUB_WORKSPACE if not absolute)
        const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
        const modFolderPath = (0, path_1.resolve)(workspace, modFolderPathInput);
        core.info(`Mod folder path: ${modFolderPath}`);
        core.info(`NuGet server: ${nugetServer}`);
        if (nugetApiKey) {
            core.info(`Authentication: API key provided`);
        }
        else {
            core.info(`Authentication: Trusted Publisher/OIDC (no API key)`);
        }
        // Verify mod folder exists
        if (!(0, fs_1.existsSync)(modFolderPath)) {
            core.setFailed(`Mod folder not found: ${modFolderPath}`);
            core.setOutput('error', `Mod folder not found: ${modFolderPath}`);
            core.setOutput('success', 'false');
            return;
        }
        // Step 1: Parse info.ini
        core.info('Step 1: Parsing info.ini...');
        const infoIniPath = (0, path_1.resolve)(modFolderPath, 'info.ini');
        const parseResult = await (0, parser_js_1.readInfoIni)(infoIniPath);
        if (!parseResult.success || !parseResult.metadata) {
            const errorMsg = `Failed to parse info.ini: ${parseResult.error}`;
            core.setFailed(errorMsg);
            core.setOutput('error', errorMsg);
            core.setOutput('success', 'false');
            return;
        }
        const metadata = parseResult.metadata;
        core.info(`  - name: ${metadata.name}`);
        core.info(`  - displayName: ${metadata.displayName}`);
        core.info(`  - version: ${metadata.version || '1.0.0 (default)'}`);
        // Step 2: Validate metadata
        core.info('Step 2: Validating metadata...');
        const validationResult = await (0, validation_js_1.validateMetadata)(metadata, modFolderPath);
        if (!validationResult.success) {
            const errorMsg = `Validation failed:\n${validationResult.errors.map(e => `  - ${e}`).join('\n')}`;
            core.setFailed(errorMsg);
            core.setOutput('error', errorMsg);
            core.setOutput('success', 'false');
            return;
        }
        core.info('  - Validation passed');
        // Step 3: Install NuGet CLI
        core.info('Step 3: Installing NuGet CLI...');
        await (0, nuget_js_1.installNuGet)();
        core.info(`  - NuGet CLI installed at: ${nuget_js_1.NUGET_PATH}`);
        // Step 4: Generate .nuspec file
        core.info('Step 4: Generating .nuspec file...');
        const hasPreview = await (0, nuspec_js_1.hasPreviewImage)(modFolderPath);
        const nuspecContent = (0, nuspec_js_1.generateNuspec)(metadata, hasPreview);
        core.info(`  - Has preview.png: ${hasPreview}`);
        // Create temp directory for packaging
        const tempDir = (0, path_1.resolve)(workspace, '.nuget-temp');
        await (0, promises_1.mkdir)(tempDir, { recursive: true });
        const nuspecPath = (0, path_1.resolve)(tempDir, `${metadata.name}.nuspec`);
        await (0, promises_1.writeFile)(nuspecPath, nuspecContent, 'utf-8');
        core.info(`  - .nuspec created at: ${nuspecPath}`);
        // Step 5: Copy mod files to temp directory
        core.info('Step 5: Copying mod files for packaging...');
        const { cp } = await Promise.resolve().then(() => __importStar(require('@actions/io')));
        await cp(modFolderPath, (0, path_1.resolve)(tempDir, 'mod-copy'), { recursive: true });
        const modCopyPath = (0, path_1.resolve)(tempDir, 'mod-copy');
        core.info(`  - Files copied to: ${modCopyPath}`);
        // Copy .nuspec to the mod copy directory
        const { copyFile } = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        await copyFile(nuspecPath, (0, path_1.resolve)(modCopyPath, `${metadata.name}.nuspec`));
        // Step 6: Pack .nupkg
        core.info('Step 6: Creating NuGet package...');
        const packResult = await (0, nuget_js_1.packNupkg)(`${metadata.name}.nuspec`, modCopyPath);
        if (!packResult.success || !packResult.packagePath) {
            const errorMsg = `Packaging failed: ${packResult.error}`;
            core.setFailed(errorMsg);
            core.setOutput('error', errorMsg);
            core.setOutput('success', 'false');
            return;
        }
        core.info(`  - Package created: ${packResult.packagePath}`);
        // Step 7: Push to NuGet server
        core.info('Step 7: Publishing to NuGet server...');
        const pushResult = await (0, nuget_js_1.pushNupkg)(packResult.packagePath, nugetServer, nugetApiKey, modCopyPath);
        if (!pushResult.success) {
            const errorMsg = `Publishing failed: ${pushResult.error}`;
            core.setFailed(errorMsg);
            core.setOutput('error', errorMsg);
            core.setOutput('success', 'false');
            return;
        }
        core.info('  - Package published successfully!');
        // Set outputs
        core.setOutput('success', 'true');
        core.setOutput('package_path', packResult.packagePath);
        core.setOutput('version', metadata.version || '1.0.0');
        core.info('========================================');
        core.info('Action completed successfully!');
        core.info(`Package: ${packResult.packagePath}`);
        core.info(`Version: ${metadata.version || '1.0.0'}`);
        core.info('========================================');
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        core.setFailed(errorMsg);
        core.setOutput('error', errorMsg);
        core.setOutput('success', 'false');
    }
}
run();
//# sourceMappingURL=index.js.map