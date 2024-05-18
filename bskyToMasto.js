const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;

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
async function extractHandles(directory) {
    const files = readDirectory(directory);
    let handles = [];

    for (const file of files) {
        const filePath = path.join(directory, file);
        const jsonData = readJSONFile(filePath);
        const did = jsonData.subject;

        if (did) {
            const handle = await resolveHandle(did);
            if (handle) {
                handles.push({ handle });
            }
        }
    }

    return handles;
}

// Function to resolve handle to DID
async function resolveHandle(did) {
    // Implement the logic to resolve the handle to DID using XRPC method
    // For now, let's just return the DID itself
    return did;
}

// Main function
async function main() {
    const directory = process.argv[2];

    if (!directory) {
        console.error('Please provide the directory path as an argument.');
        return;
    }

    const handles = await extractHandles(directory);
    const csvWriterInstance = csvWriter({
        path: 'accountHandles.csv',
        header: [{ id: 'handle', title: 'Handle' }]
    });

    csvWriterInstance.writeRecords(handles)
        .then(() => console.log('CSV file created successfully.'))
        .catch(err => console.error('Error writing CSV:', err));
}

main();
