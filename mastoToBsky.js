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
  return address.endsWith('@bsky.brid.gy') || address.endsWith('@threads.net') || address.endsWith('@bird.makeup');
}

// Function to handle rate limiting
async function handleRateLimit(retryAfter, accountAddress) {
  if (isNaN(retryAfter)) {
    console.log('Invalid retryAfter value. Exiting and writing results to output.csv.');
    writeResultsToFile();
    process.exit(0); // Exit the process
  } else {
    console.log(`Being rate limited. Waiting for ${retryAfter} seconds before retrying.`);
    await sleep(retryAfter * 1000); // Convert seconds to milliseconds
    return checkAccountExists(accountAddress); // Retry the check
  }
}

// Function to introduce a delay
async function delay(duration) {
  return new Promise(resolve => setTimeout(resolve, duration));
}

// Function to check if a Bluesky account exists
async function checkAccountExists(accountAddress) {
  const formattedAddress = accountAddress.replace('@', ''); // Remove the @ sign
  const profileUrl = `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${formattedAddress}`;
  console.log(`Checking: ${profileUrl}`);
  try {
    const response = await axios.get(profileUrl);
    // If the response status is 200, the account exists
    const accountExists = response.status === 200;
    console.log(`Account ${formattedAddress} exists: ${accountExists}`);
    return accountExists;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      // If a 429 rate limit error is received, log it and retry after 100ms
      console.log(`Rate limit hit for account ${formattedAddress}, retrying after 100ms...`);
      await sleep(100); // Wait for 100ms before retrying
      return checkAccountExists(accountAddress); // Retry the check
    } else if (error.response && error.response.status === 400) {
      // If the response status is 400, the account does not exist
      console.log(`Account ${formattedAddress} does not exist.`);
      return false;
    }
    // For other errors, log them and consider the account as non-existent for safety
    console.log(`Error checking account ${formattedAddress}: ${error.message}`);
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
  const ws = fs.createWriteStream(outputFilename);
  write(results, { headers: true })
    .pipe(ws)
    .on('finish', () => {
      console.log(`Conversion complete. The updated addresses are saved in '${outputFilename}'.`);
    });
}