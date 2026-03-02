const { generateSVG } = require('./dist/index.js');
console.log(generateSVG({ lineNumber: 1, wrapper: false }));
console.log(generateSVG(2));
