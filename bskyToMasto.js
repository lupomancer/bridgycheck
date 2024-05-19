const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const axios = require('axios');
const readlineSync = require('readline-sync');

// Function to read all files in a directory
function readDirectory(directory) {
    return fs.readdirSync(directory);
}

// Function to read JSON file
function readJSONFile(filePath) {
    const fileContent = fs.readFileSync(filePath);
    return JSON.parse(fileContent);
}

// Function to extract handles from JSON files
async function extractHandles(directory, instance) {
    const files = readDirectory(directory);
    let handles = [];

    for (let i = 0; i < files.length; i++) {
        const filePath = path.join(directory, files[i]);
        const jsonData = readJSONFile(filePath);
        const did = jsonData.subject;

        if (did) {
            process.stdout.write(`Fetching handle ${i + 1}/${files.length}...`);
            const handle = await resolveHandleWithDelay(did, instance);
            if (handle) {
                handles.push(handle);
            }
            process.stdout.write('\r'); // Clear loading text
        }
    }

    return handles;
}

// Function to resolve handle to DID with delay between batches
async function resolveHandleWithDelay(did, instance) {
    try {
        const response = await axios.get(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${did}`);
        if (response.data && response.data.handle) {
            return response.data.handle;
        }
        return null;
    } catch (error) {
        console.error('Error resolving handle:', error.message);
        return null;
    } finally {
        // Introduce a delay of 100 milliseconds after each request
        await delay(100);
    }
}

// Function to check if Mastodon account exists
async function checkMastodonAccount(handle, instance) {
    try {
        const response = await axios.get(`https://${instance}/api/v2/search?q=${handle}@bsky.brid.gy`);
        return response.data.accounts.length > 0;
    } catch (error) {
        return false;
    }
}

// Function to introduce delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to get Mastodon instance based on index
function getMastodonInstance(index) {
    switch (index) {
        case 0: return 'mastodon.social';
        case 1: return 'mastodon.cloud';
        case 2: return 'mas.to';
        default: return 'mastodon.social'; // Default to mastodon.social
    }
}

// Main function
async function main() {
    const directory = process.argv[2];
    const mastodonInstance = readlineSync.question('Enter your Mastodon instance (e.g., example.com): ');
    let instanceIndex = 0; // Initial Mastodon instance index
    let instance = getMastodonInstance(instanceIndex);
    let handlesChecked = 0;

    if (!directory) {
        console.error('Please provide the directory path as an argument.');
        return;
    }

    const handles = await extractHandles(directory, instance);
    const mastodonHandles = [];

    for (const handle of handles) {
        process.stdout.write(`Checking Mastodon account for handle ${handle}...`);
        const mastodonExists = await checkMastodonAccount(handle, instance);
        if (mastodonExists) {
            mastodonHandles.push({
                handle: `@${handle}@bsky.brid.gy`,
                link: `https://${mastodonInstance}/@${handle}@bsky.brid.gy`
            });
        }
        process.stdout.write('\r'); // Clear loading text

        handlesChecked++;

        if (handlesChecked % 299 === 0 && handlesChecked !== handles.length) {
            instanceIndex++;
            instance = getMastodonInstance(instanceIndex);
            console.log(`Switching Mastodon instance to ${instance}...`);
        }
    }

    const csvWriterInstance = csvWriter({
        path: 'AccountHandles.csv',
        header: [
            { id: 'handle', title: 'Handle' },
            { id: 'link', title: 'Link' }
        ]
    });

    csvWriterInstance.writeRecords(mastodonHandles)
        .then(() => console.log('\nCSV file created successfully.'))
        .catch(err => console.error('Error writing CSV:', err));
}

main();
