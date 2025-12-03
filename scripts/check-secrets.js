#!/usr/bin/env node
const { execSync } = require('child_process');

// Define regex patterns for common API keys and secrets
const patterns = [
    /AIza[0-9A-Za-z-_]{35}/, // Google API key
    /sk_(live|test)_[0-9a-zA-Z]{24}/, // Stripe secret key
    /aws_secret_access_key\s*=\s*['\"][A-Z0-9\/+=]{40}['\"]/i,
    /api[_-]?key\s*=\s*['\"][A-Za-z0-9_-]{20,}['\"]/i,
];

function scan() {
    // List all tracked source files that could contain secrets
    const files = execSync('git ls-files "*.ts" "*.tsx" "*.js" "*.jsx"', { encoding: 'utf8' })
        .trim()
        .split('\n');
    let found = false;
    files.forEach((file) => {
        const content = execSync(`cat ${file}`, { encoding: 'utf8' });
        patterns.forEach((regex) => {
            if (regex.test(content)) {
                console.error(`Potential secret found in ${file}: ${regex}`);
                found = true;
            }
        });
    });
    if (found) process.exit(1);
    console.log('No hard‑coded secrets detected.');
}

scan();
