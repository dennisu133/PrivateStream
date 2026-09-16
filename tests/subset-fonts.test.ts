import { expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectMonoCharacters, sansCharacters } from "../scripts/subset-fonts.mjs";

test("Mono discovers new components, props, conditional text and server messages", async () => {
	const root = await mkdtemp(join(tmpdir(), "font-subset-"));
	try {
		await mkdir(join(root, "src"));
		await writeFile(
			join(root, "src/New.svelte"),
			'<script>let ready = true;</script><Button label="Über" />{#if ready}ça va{:else}mañana{/if}'
		);
		await writeFile(join(root, "src/messages.ts"), "export const error = `Échec`;");
		const characters = await collectMonoCharacters(root);
		for (const character of "ÜüÇçÑñÉé0123456789") expect(characters).toContain(character);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("Sans keeps extended Latin, decomposed accents, punctuation and currencies", () => {
	for (const character of "äßŁœế\u0301—…€") expect(sansCharacters).toContain(character);
	expect(sansCharacters).not.toContain("Ж");
	expect(sansCharacters).not.toContain("猫");
});
