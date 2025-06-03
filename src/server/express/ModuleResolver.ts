import path from 'path';

// console.log('[ModuleResolver] Module loaded');

/**
 * Resolves #common alias to the absolute path in the project.
 * @param importPath The import path string (e.g. '#common/entities/Reseller')
 * @returns The resolved absolute path
 */
export function resolveModulePath(importPath: string): string {
  if (importPath.startsWith('#common')) {
    const resolved = importPath.replace(
      '#common',
      path.join(__dirname, '../../../src/common')
    );
    // console.log('[ModuleResolver] Resolving:', importPath, '->', resolved);
    return resolved;
  }
  return importPath;
}

// Patch require to use the resolver for #common
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (importPath: any) {
//   console.log('[ModuleResolver] Require called with:', importPath);
  if (typeof importPath === 'string' && importPath.startsWith('#common')) {
    const resolved = resolveModulePath(importPath);
    // console.log('[ModuleResolver] Resolving #common import:', importPath, '->', resolved);
    return originalRequire.call(this, resolved);
  }
  return originalRequire.call(this, importPath);
};