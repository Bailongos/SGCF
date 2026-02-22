const fs = require('fs');
const content = fs.readFileSync('debug_output.txt', 'utf16le');
console.log(content);
