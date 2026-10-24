import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
test('page renders useful HTML with an accessible main heading', () => {
 const source = readFileSync('app/page.tsx', 'utf8');
 const output = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
 const module = { exports: {} };
 new Function('require', 'module', 'exports', output)(createRequire(import.meta.url), module, module.exports);
 const html = renderToStaticMarkup(React.createElement(module.exports.default));
 assert.match(html, /<main[ >]/);
 assert.match(html, /<h1[ >][\s\S]+?<\/h1>/);
 assert.ok(html.length > 60 && html.length < 100000);
});
