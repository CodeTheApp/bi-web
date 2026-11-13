import { existsSync, readFileSync, readdirSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const slash = (path: string) => path.replaceAll("\\", "/");
const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs", ".cts", ".cjs"];
const legacyDirectories = ["src/components/", "src/lib/", "src/hooks/", "src/views/"];
const layerOrder = ["shared", "entities", "features", "widgets", "_pages", "app"];
const builtins = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));

function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    // Finder metadata on external volumes is not application source.
    if (entry.name.startsWith("._")) return [];
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return filesIn(path);
    return sourceExtensions.some((extension) => path.endsWith(extension)) && !path.endsWith(".d.ts") ? [slash(relative(root, path))] : [];
  });
}

type Reference = { specifier: string; typeOnly: boolean; line: number };
type Module = { references: Reference[]; client: boolean; action: boolean };

function readModule(path: string): Module {
  const source = ts.createSourceFile(path, readFileSync(resolve(root, path), "utf8"), ts.ScriptTarget.Latest, true);
  const directives: string[] = [];
  for (const statement of source.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
    directives.push(statement.expression.text);
  }
  const references: Reference[] = [];
  const add = (literal: ts.Node | undefined, typeOnly: boolean) => {
    if (literal && ts.isStringLiteralLike(literal)) references.push({ specifier: literal.text, typeOnly, line: source.getLineAndCharacterOfPosition(literal.getStart(source)).line + 1 });
  };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const named = clause?.namedBindings;
      const onlyNamedTypes = !clause?.name && named && ts.isNamedImports(named) && named.elements.length > 0 && named.elements.every((element) => element.isTypeOnly);
      add(node.moduleSpecifier, Boolean(clause?.isTypeOnly || onlyNamedTypes));
    } else if (ts.isExportDeclaration(node)) {
      const named = node.exportClause;
      const onlyNamedTypes = named && ts.isNamedExports(named) && named.elements.length > 0 && named.elements.every((element) => element.isTypeOnly);
      add(node.moduleSpecifier, Boolean(node.isTypeOnly || onlyNamedTypes));
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      add(node.argument.literal, true);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      add(node.moduleReference.expression, node.isTypeOnly);
    } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
      add(node.arguments[0], false);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { references, client: directives.includes("use client"), action: directives.includes("use server") };
}

const modules = new Map(filesIn(resolve(root, "src")).map((path) => [path, readModule(path)]));
function targetFor(from: string, specifier: string): string | undefined {
  const base = specifier.startsWith("@/") ? resolve(root, "src", specifier.slice(2)) : specifier.startsWith(".") ? resolve(root, dirname(from), specifier) : null;
  if (!base) return;
  const candidates = [base, ...sourceExtensions.map((extension) => base + extension), ...sourceExtensions.map((extension) => resolve(base, "index" + extension))];
  return candidates.map((candidate) => slash(relative(root, candidate))).find((candidate) => modules.has(candidate));
}
const layerOf = (path: string) => layerOrder.indexOf(path.split("/")[1]);

describe("Feature-Sliced architecture", () => {
  it("uses _pages for compositions and keeps the Next.js App Router in app", () => {
    expect(existsSync(resolve(root, "src/_pages"))).toBe(true);
    expect(existsSync(resolve(root, "src/app"))).toBe(true);
    expect(existsSync(resolve(root, "src/pages")), "The FSD pages layer must not activate the Next.js Pages Router").toBe(false);
  });

  it("has no application modules or imports in the retired component/lib/view directories", () => {
    const violations: string[] = [];
    for (const [path, record] of modules) {
      if (legacyDirectories.some((prefix) => path.startsWith(prefix))) violations.push(path);
      for (const reference of record.references) {
        const alias = reference.specifier.startsWith("@/") ? `src/${reference.specifier.slice(2)}` : "";
        const target = targetFor(path, reference.specifier);
        if (legacyDirectories.some((prefix) => alias.startsWith(prefix) || target?.startsWith(prefix)) || alias === "src/server/admin/types") violations.push(`${path}:${reference.line} → ${reference.specifier}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("allows layer dependencies only toward the same or a lower layer, including type imports", () => {
    const violations: string[] = [];
    for (const [path, record] of modules) {
      const ownLayer = layerOf(path);
      if (ownLayer < 0) continue; // server, emails, styles and proxy are framework infrastructure.
      for (const reference of record.references) {
        const target = targetFor(path, reference.specifier);
        if (target && layerOf(target) > ownLayer) violations.push(`${path}:${reference.line} → ${target}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps server-only modules out of the client graph, including through barrels", () => {
    const violations: string[] = [];
    function walk(path: string, chain: string[], seen: Set<string>) {
      if (seen.has(path)) return;
      seen.add(path);
      const record = modules.get(path)!;
      // Next.js transforms an imported Server Action into an RPC reference.
      if (record.action) {
        if (record.client) violations.push(`${chain.join(" → ")} has both client and server directives`);
        return;
      }
      if (path.startsWith("src/server/") || record.references.some((reference) => !reference.typeOnly && reference.specifier === "server-only")) {
        violations.push(chain.join(" → "));
        return;
      }
      for (const reference of record.references) {
        if (reference.typeOnly) continue;
        if (reference.specifier.startsWith("node:") || builtins.has(reference.specifier)) {
          violations.push([...chain, reference.specifier].join(" → "));
          continue;
        }
        const target = targetFor(path, reference.specifier);
        if (target) walk(target, [...chain, target], seen);
      }
    }
    for (const [path, record] of modules) if (record.client) walk(path, [path], new Set());
    expect([...new Set(violations)]).toEqual([]);
  });
});
