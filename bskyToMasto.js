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
                handles.push({ handle });
            }
            process.stdout.write('\r'); // Clear loading text
        }
    }

    return handles;
}

// Function to resolve handle to DID with delay between batches
async function resolveHandleWithDelay(did, instance) {
    try {
        const response = await axios.get(`https://${instance}/api/v2/search?q=${did}@bsky.brid.gy`);
        if (response.status === 200) {
            return did;
        }
        return null;
    } catch (error) {
        console.error('Error fetching handle:', error.message);
        return null;
    } finally {
        // Introduce a delay of 100 milliseconds after each request
        await delay(100);
    }
}

// Function to introduce delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function
async function main() {
    const directory = process.argv[2];
    const instance = readlineSync.question('Enter your Mastodon instance (e.g., example.com): ');

    if (!directory) {
        console.error('Please provide the directory path as an argument.');
        return;
    }

    const handles = await extractHandles(directory, instance);
    const csvWriterInstance = csvWriter({
        path: 'AccountHandles.csv',
        header: [{ id: 'handle', title: 'Handle' }]
    });

    csvWriterInstance.writeRecords(handles)
        .then(() => console.log('\nCSV file created successfully.'))
        .catch(err => console.error('Error writing CSV:', err));
}

main();
