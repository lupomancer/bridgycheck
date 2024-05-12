const fs = require('fs');
const csv = require('csv-parser');
const { write } = require('fast-csv');
const axios = require('axios');
const { promisify } = require('util');

const sleep = promisify(setTimeout);

// Function to convert the account address format
function convertAddressFormat(address) {
  // Replace underscores and tildes with dashes
  const formattedAddress = address.replace(/[_~]/g, '-');
  const [username, instance] = formattedAddress.split('@');
  return `${username}.${instance}.ap.brid.gy`;
}

// Function to check if the domain should be excluded
function excludeDomain(address) {
  return address.endsWith('@bsky.brid.gy') || address.endsWith('@threads.net') || address.endsWith('@bird.makeup');
}

// Queue to manage API requests
const apiRequestQueue = [];

// Timer to regulate the rate of API requests
let apiRequestTimer = null;

// Function to add an API request to the queue
function enqueueApiRequest(request) {
  apiRequestQueue.push(request);
  processApiRequestQueue();
}

// Function to process the API request queue
function processApiRequestQueue() {
  if (!apiRequestTimer && apiRequestQueue.length > 0) {
    const request = apiRequestQueue.shift();
    request().then(() => {
      // Schedule the next API request if the queue is not empty
      if (apiRequestQueue.length > 0) {
        apiRequestTimer = setTimeout(() => {
          apiRequestTimer = null;
          processApiRequestQueue();
        }, 100); // 100 milliseconds delay between requests (10 requests per second)
      }
    });
  }
}

// Function to check if a Bluesky account exists
async function checkAccountExists(accountAddress) {
  // Generate a random delay between 0 and 500 milliseconds
  const randomDelay = Math.floor(Math.random() * 501);

  // Delay execution by the random amount
  await sleep(randomDelay);

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
    if (error.code === 'ECONNRESET') {
      // If a connection reset error occurs, retry after a delay
      console.log(`Connection reset for account ${formattedAddress}, retrying after a delay...`);
      await sleep(1000); // Wait for 1 second before retrying
      return checkAccountExists(accountAddress); // Retry the check
    } else if (error.response && error.response.status === 429) {
      // If a 429 rate limit error is received, retry after a delay
      console.log(`Rate limit hit for account ${formattedAddress}, retrying after a delay...`);
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

// Read the input CSV
fs.createReadStream(inputFilename)
  .pipe(csv())
  .on('data', (row) => {
    const newAddress = convertAddressFormat(row['Account address']);
    const profileUrl = `https://bsky.app/profile/${newAddress.replace('@', '')}`;
    if (!excludeDomain(row['Account address'])) {
      if (checkFlag) {
        // If -c flag is provided, enqueue the account existence check
        enqueueApiRequest(() =>
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
    if (!checkFlag) {
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
