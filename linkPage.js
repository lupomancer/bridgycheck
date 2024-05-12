const fs = require('fs');
const csv = require('csv-parser');
const createHTML = require('create-html');

// Check if the filename is provided as a command-line argument
if (process.argv.length < 3) {
  console.log("Usage: node createHtmlFromCsv.js <filename>.csv");
  process.exit(1);
}

const inputFilename = process.argv[2];
const outputFilename = 'output.html';
const urls = [];

// Read the input CSV and collect the URLs
fs.createReadStream(inputFilename)
  .pipe(csv())
  .on('data', (row) => {
    urls.push(row['Profile URL']);
  })
  .on('end', () => {
    // Generate the HTML content
    const htmlContent = urls.map(url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a><br>`).join('\n');
    
    // Create the HTML file
    const html = createHTML({
      title: 'Profile URLs',
      body: htmlContent,
      css: 'a { text-decoration: none; color: blue; } a:hover { text-decoration: underline; }'
    });

    // Write the HTML to a file
    fs.writeFile(outputFilename, html, (err) => {
      if (err) console.log(err);
      console.log(`HTML page created successfully. Open '${outputFilename}' to view the links.`);
    });
  });
