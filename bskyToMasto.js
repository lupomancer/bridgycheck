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

// Function to extract subjects from JSON files
function extractSubjects(directory) {
    const files = readDirectory(directory);
    let subjects = [];

    files.forEach(file => {
        const filePath = path.join(directory, file);
        const jsonData = readJSONFile(filePath);
        const subject = jsonData.subject;

        if (subject) {
            subjects.push({ subject });
        }
    });

    return subjects;
}

// Main function
function main() {
    const directory = process.argv[2];

    if (!directory) {
        console.error('Please provide the directory path as an argument.');
        return;
    }

    const subjects = extractSubjects(directory);
    const csvWriterInstance = csvWriter({
        path: 'accountDIDs.csv',
        header: [{ id: 'subject', title: 'Subject' }]
    });

    csvWriterInstance.writeRecords(subjects)
        .then(() => console.log('CSV file created successfully.'))
        .catch(err => console.error('Error writing CSV:', err));
}

main();
