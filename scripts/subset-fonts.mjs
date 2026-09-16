import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { parse } from "svelte/compiler";
import ts from "typescript";
import { loadEnv } from "vite";
// @ts-expect-error subset-font does not publish TypeScript declarations.
import subsetFont from "subset-font";

export async function collectMonoCharacters(root = process.cwd()) {
	const text = [];

	// Collect candidate text, including strings in conditional branches. Static
	// analysis also retains some non-visible strings; it never executes app code.
	/** @param {any} node Svelte/ESTree nodes share no single recursive shape. */
	function collectSvelte(node) {
		if (!node || typeof node !== "object") return;
		if (node.type === "Style" || node.type === "Comment") return;
		if (node.type === "Attribute" && ["class", "style"].includes(node.name)) return;
		if (node.type === "Text") text.push(node.data);
		if (node.type === "Literal" && typeof node.value === "string") text.push(node.value);
		if (node.type === "TemplateElement") text.push(node.value.cooked ?? node.value.raw);
		for (const value of Object.values(node)) {
			if (Array.isArray(value)) value.forEach(collectSvelte);
			else if (value && typeof value === "object") collectSvelte(value);
		}
	}

	/** @param {import("typescript").Node} node */
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

	const paths = await readdir(join(root, "src"), { recursive: true });
	for (const path of paths.filter((path) => /\.(svelte|ts|js)$/.test(path))) {
		const source = await readFile(join(root, "src", path), "utf8");
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
	for (const path of paths.filter((path) =>
		/^lib[/\\]assets[/\\]reactions[/\\].*\.(png|jpg|jpeg|gif|webp|svg)$/.test(path)
	)) {
		text.push(basename(path).replace(/\.[^.]+$/, ""));
	}

	const candidates = text.join(" ");
	// Keep Mono independent of component names and CSS inheritance.
	// Include CSS case transformations, generated numbers, and password masks.
	return [
		...new Set(
			`${candidates} ${candidates.toUpperCase()} ${candidates.toLowerCase()} 0123456789 •●`.replace(
				/\s+/g,
				" "
			)
		)
	].join("");
}

// Broad Latin coverage for user text, including decomposed accents and currency.
export const sansCharacters = [
	[0x20, 0x24f],
	[0x300, 0x36f],
	[0x1e00, 0x1eff],
	[0x2000, 0x206f],
	[0x20a0, 0x20cf]
]
	.flatMap(([start, end]) =>
		Array.from({ length: end - start + 1 }, (_, i) => String.fromCodePoint(start + i))
	)
	.join("");

// Vite imports these generated files before hashing or compressing assets.
/** @param {string} mode */
export async function subsetFonts(mode, root = process.cwd()) {
	const env = loadEnv(mode, root, "VITE_");
	const output = resolve(root, "node_modules/.cache/font-subsets", mode);
	const repertoires = {
		"bebas-neue-400.woff2": env.VITE_META_TITLE_PUBLIC || "PrivateStream",
		"geist-mono-300-500.woff2": await collectMonoCharacters(root),
		"geist-sans-600.woff2": sansCharacters
	};
	await mkdir(output, { recursive: true });
	for (const [name, characters] of Object.entries(repertoires)) {
		const original = await readFile(join(root, "src/lib/assets/fonts", name));
		const subset = await subsetFont(original, characters, { targetFormat: "woff2" });
		await writeFile(join(output, name), subset);
		console.log(`${name}: ${original.length} → ${subset.length} bytes`);
	}
	return output;
}
