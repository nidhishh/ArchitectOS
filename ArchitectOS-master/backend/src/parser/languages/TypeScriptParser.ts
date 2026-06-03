import * as babelParser from "@babel/parser";
import traverseModule from "@babel/traverse";
import path from "path";
import { KnowledgeGraph } from "../../graph/KnowledgeGraph";

const traverse: any = (traverseModule as any).default || traverseModule;

export class TypeScriptParser {
  static parse(filePath: string, code: string, graph: KnowledgeGraph): void {
    // Add the file node
    graph.addNode(filePath, path.basename(filePath), "file", {
      path: filePath,
      size: code.length,
    });

    try {
      const ast = babelParser.parse(code, {
        sourceType: "unambiguous",
        errorRecovery: true,
        plugins: [
          "typescript",
          "jsx",
          "classProperties",
          "decorators-legacy",
          "dynamicImport",
          "importMeta",
          "topLevelAwait",
        ],
      });

      traverse(ast, {
        ImportDeclaration(astPath: any) {
          const source = astPath.node.source?.value;
          if (!source) return;
          graph.addEdge(filePath, String(source), "imports", { filePath });
        },
        ClassDeclaration(astPath: any) {
          const className = astPath.node.id?.name;
          if (!className) return;
          const methods = astPath.node.body.body
            .filter((m: any) => m.type === "ClassMethod")
            .map((m: any) => `${m.async ? "async " : ""}${m.key?.name || "anonymous"}()`);
          const superClass =
            astPath.node.superClass && astPath.node.superClass.type === "Identifier"
              ? astPath.node.superClass.name
              : null;

          // Add class node
          graph.addNode(className, className, "class", {
            filePath,
            superClass,
            methods,
          });

          // Edge from file to the class it defines
          graph.addEdge(filePath, className, "defines", { filePath });

          if (superClass) {
            graph.addEdge(className, superClass, "extends", { filePath });
          }
        },
        FunctionDeclaration(astPath: any) {
          const fnName = astPath.node.id?.name;
          if (!fnName) return;
          const params = astPath.node.params.map((p: any) => {
            if (p.type === "Identifier") return p.name;
            return "param";
          });

          // Add function node
          graph.addNode(fnName, fnName, "function", {
            filePath,
            params,
            isAsync: Boolean(astPath.node.async),
          });

          // Edge from file to the function it defines
          graph.addEdge(filePath, fnName, "defines", { filePath });
        },
        CallExpression(astPath: any) {
          const callee = astPath.node.callee;
          let calleeName: string | null = null;
          if (callee.type === "Identifier") calleeName = callee.name;
          if (callee.type === "MemberExpression" && callee.property?.type === "Identifier") {
            calleeName = callee.property.name;
          }
          if (!calleeName) return;

          let callerName = "(top-level)";
          let ancestor = astPath.parentPath;
          while (ancestor) {
            if (ancestor.node.type === "ClassMethod") {
              callerName = (ancestor.node as any).key?.name || callerName;
              break;
            }
            if (ancestor.node.type === "FunctionDeclaration") {
              callerName = (ancestor.node as any).id?.name || callerName;
              break;
            }
            ancestor = ancestor.parentPath;
          }

          graph.addEdge(callerName, calleeName, "calls", { filePath });
        },
        ExportDefaultDeclaration(astPath: any) {
          const decl: any = astPath.node.declaration;
          const name = decl?.id?.name || "default";
          graph.addEdge(filePath, name, "exports", { filePath });
        },
        ExportNamedDeclaration(astPath: any) {
          const names = (astPath.node.specifiers || [])
            .map((s: any) => s?.exported?.name)
            .filter(Boolean);
          names.forEach((name: string) => {
            graph.addEdge(filePath, name, "exports", { filePath });
          });
        },
      });
    } catch (err: any) {
      console.error(`Babel failed to parse ${filePath}:`, err.message);
    }
  }
}
