// hash-password.js
// A simple script to generate a bcrypt hash for your password.
// Run this from your terminal with: node hash-password.js <your_secret_password>
// Make sure to add the generated hash to the .env file

import bcrypt from 'bcrypt';

const password = process.argv[2];

if (!password) {
	console.error('Usage: node hash-password.js <password>');
	process.exit(1);
}

const saltRounds = 12;
const hash = bcrypt.hashSync(password, saltRounds);

console.log('Your hashed password is:\n');
console.log(hash);
console.log('\nCopy this hash and paste it into your .env file as SITE_PASSWORD_HASH.');
