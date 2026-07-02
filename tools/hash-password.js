import bcrypt from "bcrypt";

async function readHidden(prompt) {
	if (!process.stdin.isTTY) {
		let value = "";
		for await (const chunk of process.stdin) value += chunk;
		return value.replace(/\r?\n$/, "");
	}

	return new Promise((resolve, reject) => {
		let value = "";

		const cleanup = () => {
			process.stdin.removeListener("data", onData);
			process.stdin.setRawMode(false);
			process.stdin.pause();
		};

		const onData = (chunk) => {
			for (const character of chunk.toString()) {
				if (character === "\u0003") {
					cleanup();
					reject(new Error("Cancelled"));
					return;
				}

				if (character === "\r" || character === "\n") {
					cleanup();
					process.stdout.write("\n");
					resolve(value);
					return;
				}

				if (character === "\u007f" || character === "\b") {
					value = value.slice(0, -1);
				} else if (character >= " ") {
					value += character;
				}
			}
		};

		process.stdout.write(prompt);
		process.stdin.setEncoding("utf8");
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.on("data", onData);
	});
}

if (process.argv.length > 2) {
	console.error(
		"Refusing to read a password from command-line arguments because they leak into shell history and process listings."
	);
	console.error("Run `bun tools/hash-password.js` and enter it at the hidden prompt instead.");
	process.exit(1);
}

let password;
try {
	password = await readHidden("Password: ");
	if (process.stdin.isTTY) {
		const confirmation = await readHidden("Confirm password: ");
		if (password !== confirmation) {
			console.error("Passwords do not match.");
			process.exit(1);
		}
	}
} catch {
	console.error("\nCancelled.");
	process.exit(1);
}

if (!password) {
	console.error("Password must not be empty.");
	process.exit(1);
}

const saltRounds = 12;
const hash = bcrypt.hashSync(password, saltRounds);
const base64Hash = Buffer.from(hash).toString("base64");

console.log("\nYour hashed password (base64 encoded) is:\n");
console.log(base64Hash);
console.log("\nCopy this hash and paste it into your .env file as SITE_PASSWORD_HASH.");
