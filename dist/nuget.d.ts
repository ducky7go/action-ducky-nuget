/**
 * Ensures nuget.exe is available
 */
export declare function ensureNugetExe(): Promise<string>;
/**
 * Runs `nuget pack` to create a .nupkg file
 */
export declare function packNupkg(nuspecFile: string, workingDirectory: string): Promise<{
    success: boolean;
    packagePath?: string;
    error?: string;
}>;
/**
 * Runs `nuget push` to publish a .nupkg file
 * @param packagePath Path to the .nupkg file
 * @param server NuGet server URL
 * @param apiKey API key from NuGet/login@v1
 */
export declare function pushNupkg(packagePath: string, server: string, apiKey: string | undefined, workingDirectory: string): Promise<{
    success: boolean;
    error?: string;
}>;
