const fs = require('fs');
const path = '/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/src/ReactNativeInference.ts';
let content = fs.readFileSync(path, 'utf-8');

// Replace the hallucinatory TemporalResolver block
const startMatch = "if (entities['PERIOD'] || entities['DATE'] || entities['TIME']) {";
const endMatch = "    if (entities['EXTRAPAYMENT']) {";
const startIndex = content.indexOf(startMatch);
const endIndex = content.indexOf(endMatch);

if (startIndex !== -1 && endIndex !== -1) {
    const newBlock = `    if (entities['PERIOD']) {
       const resolved = TemporalResolver.resolvePeriod(entities['PERIOD']);
       if (resolved) entities['PERIOD'] = JSON.stringify(resolved);
    }
    if (entities['DATE']) {
       const resolved = TemporalResolver.resolveDate(entities['DATE']);
       if (resolved) entities['DATE'] = JSON.stringify(resolved);
    }
    
`;
    content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);
    fs.writeFileSync(path, content, 'utf-8');
    console.log("Fixed ReactNativeInference.ts");
} else {
    console.log("Could not find block");
}
