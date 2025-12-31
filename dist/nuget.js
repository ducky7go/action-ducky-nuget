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
exports.NUGET_PATH = void 0;
exports.installNuGet = installNuGet;
exports.execNuGet = execNuGet;
exports.packNupkg = packNupkg;
exports.pushNupkg = pushNupkg;
const exec_1 = require("@actions/exec");
const os_1 = require("os");
const path_1 = require("path");
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const NUGET_URL = 'https://dist.nuget.org/win-x86-commandline/latest/nuget.exe';
exports.NUGET_PATH = (0, path_1.join)((0, os_1.homedir)(), 'nuget.exe');
/**
 * Downloads and installs the NuGet CLI tool
 */
async function installNuGet() {
    if ((0, fs_1.existsSync)(exports.NUGET_PATH)) {
        return exports.NUGET_PATH;
    }
    // Download nuget.exe
    const core = await Promise.resolve().then(() => __importStar(require('@actions/core')));
    core.info(`Downloading NuGet CLI from ${NUGET_URL}`);
    const https = await Promise.resolve().then(() => __importStar(require('https')));
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(exports.NUGET_PATH);
        https.get(NUGET_URL, (response) => {
            response.pipe(file);
            file.on('finish', async () => {
                file.close();
                // Make executable on Unix-like systems
                try {
                    await (0, promises_1.chmod)(exports.NUGET_PATH, 0o755);
                }
                catch {
                    // Ignore permission errors on Windows
                }
                resolve(exports.NUGET_PATH);
            });
        }).on('error', (err) => {
            fs.unlink(exports.NUGET_PATH, () => { });
            reject(err);
        });
    });
}
/**
 * Executes a NuGet command
 */
async function execNuGet(args, workingDirectory) {
    let stdout = '';
    let stderr = '';
    const exitCode = await (0, exec_1.exec)(`"${exports.NUGET_PATH}"`, args, {
        cwd: workingDirectory,
        listeners: {
            stdout: (data) => {
                stdout += data.toString();
            },
            stderr: (data) => {
                stderr += data.toString();
            }
        },
        silent: false // Allow output to go to action logs
    });
    return { exitCode, stdout, stderr };
}
/**
 * Runs `nuget pack` to create a .nupkg file
 */
async function packNupkg(nuspecFile, workingDirectory) {
    const core = await Promise.resolve().then(() => __importStar(require('@actions/core')));
    try {
        const nuspecName = nuspecFile.split('/').pop() || nuspecFile;
        core.info(`Running: nuget pack ${nuspecName}`);
        const result = await execNuGet(['pack', nuspecFile], workingDirectory);
        if (result.exitCode !== 0) {
            return {
                success: false,
                error: `NuGet pack failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`
            };
        }
        // Extract package path from output
        const match = result.stdout.match(/Successfully created package '(.+?)'/);
        if (match && match[1]) {
            return { success: true, packagePath: match[1] };
        }
        // Fallback: try to find .nupkg file in working directory
        const { readdir } = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const files = await readdir(workingDirectory);
        const nupkgFile = files.find(f => f.endsWith('.nupkg'));
        if (nupkgFile) {
            return { success: true, packagePath: (0, path_1.join)(workingDirectory, nupkgFile) };
        }
        return {
            success: false,
            error: 'Package was created but could not be located'
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
/**
 * Runs `nuget push` to publish a .nupkg file
 * @param packagePath Path to the .nupkg file
 * @param server NuGet server URL
 * @param apiKey Optional API key (if not provided, uses Trusted Publisher/OIDC)
 */
async function pushNupkg(packagePath, server, apiKey, workingDirectory) {
    const core = await Promise.resolve().then(() => __importStar(require('@actions/core')));
    try {
        const packageName = packagePath.split('/').pop() || packagePath;
        // Build command args
        const args = [
            'push',
            packagePath,
            '-Source', server
        ];
        // If API key is provided, use it; otherwise use Trusted Publisher (no -ApiKey)
        if (apiKey && apiKey.trim() !== '') {
            core.info(`Running: nuget push ${packageName} -Source ${server} (with API key)`);
            args.push('-ApiKey', apiKey);
            core.setSecret(apiKey); // Mask API key in logs
        }
        else {
            core.info(`Running: nuget push ${packageName} -Source ${server} (using Trusted Publisher/OIDC)`);
            // No API key - relies on NuGet Trusted Publisher configuration
        }
        const result = await execNuGet(args, workingDirectory);
        if (result.exitCode !== 0) {
            return {
                success: false,
                error: `NuGet push failed with exit code ${result.exitCode}: ${result.stderr || result.stdout}`
            };
        }
        return { success: true };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
//# sourceMappingURL=nuget.js.map