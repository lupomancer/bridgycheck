const fs = require('fs');
const csv = require('csv-parser');
const { write } = require('fast-csv');

// Function to convert the account address format
function convertAddressFormat(address) {
  const [username, instance] = address.split('@');
  return `@${username}.${instance}.ap.brid.gy`;
}

// Function to check if the domain should be excluded
function excludeDomain(address) {
  return address.endsWith('@bsky.brid.gy') || address.endsWith('@threads.net');
}

// Check if the filename is provided as a command-line argument
if (process.argv.length < 3) {
  console.log("Usage: node masto-to-bsky.js <filename>.csv");
  process.exit(1);
}

const inputFilename = process.argv[2];
const outputFilename = 'output.csv';
const results = [];

// Read the input CSV
fs.createReadStream(inputFilename)
  .pipe(csv())
  .on('data', (row) => {
    if (!excludeDomain(row['Account address'])) {
      const newAddress = convertAddressFormat(row['Account address']);
      results.push({ 'Account address': newAddress });
    }
  })
  .on('end', () => {
    // Write the results to a new CSV
    const ws = fs.createWriteStream(outputFilename);
    write(results, { headers: true })
      .pipe(ws)
      .on('finish', () => console.log(`Conversion complete. The updated addresses are saved in '${outputFilename}'.`));
  });
