import { existsSync, lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const sourceRoot = path.join(projectRoot, 'src');

function resolveTypeScriptPath(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && lstatSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('node:')) {
      return nextResolve(specifier, context);
    }

    if (specifier.startsWith('@/')) {
      const resolvedPath = resolveTypeScriptPath(
        path.join(sourceRoot, specifier.slice(2)),
      );

      if (resolvedPath) {
        return {
          shortCircuit: true,
          url: pathToFileURL(resolvedPath).href,
        };
      }
    }

    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      context.parentURL !== undefined
    ) {
      const parentPath = fileURLToPath(context.parentURL);
      const resolvedPath = resolveTypeScriptPath(
        path.resolve(path.dirname(parentPath), specifier),
      );

      if (resolvedPath) {
        return {
          shortCircuit: true,
          url: pathToFileURL(resolvedPath).href,
        };
      }
    }

    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts')) {
      const source = readFileSync(fileURLToPath(url), 'utf8');

      return {
        format: 'module',
        shortCircuit: true,
        source: ts.transpileModule(source, {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
          },
          fileName: fileURLToPath(url),
        }).outputText,
      };
    }

    return nextLoad(url, context);
  },
});

await import(pathToFileURL(path.join(sourceRoot, 'tests', 'run-engine-tests.ts')).href);
