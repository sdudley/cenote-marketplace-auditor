import path from 'path';
import Module from 'module';

// Store the original resolve filename
const originalResolveFilename = (Module as any)._resolveFilename;

// Override the resolve filename function
(Module as any)._resolveFilename = function(request: string, parent: any, isMain: boolean) {
    // Check if the request starts with @common/
    if (request.startsWith('@common/')) {
        // Get the base path from package.json _moduleAliases
        const basePath = path.resolve(process.cwd(), 'dist/express/src/common');
        if (basePath) {
            // Remove @common/ from the request and resolve relative to basePath
            const relativePath = request.slice(8); // length of '@common/'
            const fullPath = path.resolve(basePath, relativePath);

            // Try with .js extension first
            try {
                return originalResolveFilename(fullPath + '.js', parent, isMain);
            } catch (e) {
                // If that fails, try without extension
                return originalResolveFilename(fullPath, parent, isMain);
            }
        }
    }

    // Call the original resolve filename
    return originalResolveFilename(request, parent, isMain);
};