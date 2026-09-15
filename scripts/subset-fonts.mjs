import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { parse } from "svelte/compiler";
import ts from "typescript";
import { loadEnv } from "vite";
import subsetFont from "subset-font";

const env = loadEnv(process.argv[2] || "production", process.cwd(), "VITE_");
const text = [];

// Collect candidate text, including strings in conditional branches. Static
// analysis also retains some non-visible strings; it never executes app code.
function collectSvelte(node) {
	if (!node || typeof node !== "object") return;
	if (node.type === "Style" || node.type === "Comment") return;
	if (node.type === "Attribute" && !["placeholder", "alt", "title"].includes(node.name)) return;
	if (node.type === "Text") text.push(node.data);
	if (node.type === "Literal" && typeof node.value === "string") text.push(node.value);
	if (node.type === "TemplateElement") text.push(node.value.cooked ?? node.value.raw);
	for (const value of Object.values(node)) {
		if (Array.isArray(value)) value.forEach(collectSvelte);
		else if (value && typeof value === "object") collectSvelte(value);
	}
}

function collectScript(node) {
	if (
		ts.isStringLiteralLike(node) ||
		ts.isTemplateHead(node) ||
		ts.isTemplateMiddle(node) ||
		ts.isTemplateTail(node)
	) {
		text.push(node.text);
	}
	ts.forEachChild(node, collectScript);
}

for await (const path of new Bun.Glob("src/**/*.{svelte,ts,js}").scan()) {
	const source = await readFile(path, "utf8");
	if (path.endsWith(".svelte")) {
		const ast = parse(source, { modern: true });
		collectSvelte(ast.fragment);
		collectSvelte(ast.instance);
		collectSvelte(ast.module);
	} else {
		collectScript(ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true));
	}
}

// Reaction labels are derived from filenames rather than string literals.
for await (const path of new Bun.Glob(
	"src/lib/assets/reactions/*.{png,jpg,jpeg,gif,webp,svg}"
).scan()) {
	text.push(basename(path).replace(/\.[^.]+$/, ""));
}

text.push(env.VITE_META_TITLE_PUBLIC || "PrivateStream", env.VITE_META_TITLE_PRIVATE || "");
const candidates = text.join(" ");
// Share the discovered repertoire so moving text between fonts needs no changes.
// Include CSS case transformations, generated numbers, and password masks.
const characters = [
	...new Set(
		`${candidates} ${candidates.toUpperCase()} ${candidates.toLowerCase()} 0123456789 •●`.replace(
			/\s+/g,
			" "
		)
	)
].join("");

for await (const path of new Bun.Glob("build/client/**/*.woff2").scan()) {
	const original = await readFile(path);
	const subset = await subsetFont(original, characters, { targetFormat: "woff2" });
	await writeFile(path, subset);
	console.log(`${path}: ${original.length} → ${subset.length} bytes`);
}
