#!/bin/bash

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "Node.js could not be found. Please install Node.js to continue."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "npm could not be found. Please install npm to continue."
    exit 1
fi

# Install dependencies from package.json
npm install

# Run the masto-to-bsky.js script with the provided CSV filename
node masto-to-bsky.js "$1"
