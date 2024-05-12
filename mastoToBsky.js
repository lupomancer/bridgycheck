const fs = require('fs');
const csv = require('csv-parser');
const { write } = require('fast-csv');
const axios = require('axios');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

// Function to convert the account address format
function convertAddressFormat(address) {
  const [username, instance] = address.split('@');
  return `${username}.${instance}.ap.brid.gy`;
}

// Function to check if the domain should be excluded
function excludeDomain(address) {
  return address.endsWith('@bsky.brid.gy') || address.endsWith('@threads.net');
}

// Function to handle rate limiting
async function handleRateLimit(retryAfter, accountAddress) {
  console.log(`Being rate limited. Waiting for ${retryAfter} seconds before retrying.`);
  await sleep(retryAfter * 1000); // Convert seconds to milliseconds
  return checkAccountExists(accountAddress); // Retry the check
}

// Function to check if a Bluesky account exists
async function checkAccountExists(accountAddress) {
  const formattedAddress = accountAddress.replace('@', ''); // Remove the @ sign
  const profileUrl = `https://bsky.app/profile/${formattedAddress}`;
  console.log(`Checking: ${profileUrl}`);
  try {
    const response = await axios.get(profileUrl);
    console.log(`Account ${formattedAddress} exists: ${response.status === 200}`);
    return response.status === 200;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after']);
      return handleRateLimit(retryAfter, accountAddress);
    }
    console.log(`Account ${formattedAddress} does not exist or could not be checked.`);
    return false;
  }
}

// Check if the filename and optional -c flag are provided as command-line arguments
const inputFilename = process.argv[2];
const checkFlag = process.argv.includes('-c');
const outputFilename = 'output.csv';
const results = [];
const checkPromises = [];

// Read the input CSV
fs.createReadStream(inputFilename)
  .pipe(csv())
  .on('data', (row) => {
    const newAddress = convertAddressFormat(row['Account address']);
    const profileUrl = `https://bsky.app/profile/${newAddress.replace('@', '')}`;
    if (!excludeDomain(row['Account address'])) {
      if (checkFlag) {
        // If -c flag is provided, check if the account exists
        checkPromises.push(
          checkAccountExists(newAddress).then(exists => {
            if (exists) {
              results.push({ 'Account address': newAddress, 'Profile URL': profileUrl });
            }
          })
        );
      } else {
        // If -c flag is not provided, just print the profile URL
        results.push({ 'Account address': newAddress, 'Profile URL': profileUrl });
      }
    }
  })
  .on('end', () => {
    if (checkFlag) {
      // Wait for all the account checks to complete if -c flag is provided
      Promise.all(checkPromises).then(() => {
        writeResultsToFile();
      });
    } else {
      // Immediately write the results to a file if -c flag is not provided
      writeResultsToFile();
    }
  });

function writeResultsToFile() {
  // Write the results to a new CSV
  const ws = fs.createWriteStream(outputFilename);
  write(results, { headers: true })
    .pipe(ws)
    .on('finish', () => console.log(`Conversion complete. The updated addresses are saved in '${outputFilename}'.`));
}