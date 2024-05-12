import csv
import sys

# Function to convert the account address format
def convert_address_format(address):
    username, instance = address.strip('@').split('@')
    return f"@{username}.{instance}.ap.brid.gy"

# Function to check if the domain should be excluded
def exclude_domain(address):
    return address.endswith('@bsky.brid.gy') or address.endswith('@threads.net')

# Check if the filename is provided as a command-line argument
if len(sys.argv) < 2:
    print("Usage: masto-to-bsky.py <filename>.csv")
    sys.exit(1)

input_filename = sys.argv[1]
output_filename = 'output.csv'

# Read the input CSV and write the results to a new CSV
with open(input_filename, mode='r', newline='') as infile, open(output_filename, mode='w', newline='') as outfile:
    reader = csv.DictReader(infile)
    writer = csv.writer(outfile)
    
    # Write the header to the output file
    writer.writerow(['Account address'])
    
    # Process each row in the input file
    for row in reader:
        # Skip rows with excluded domains
        if exclude_domain(row['Account address']):
            continue
        
        # Convert the account address and write only this column to the output file
        new_address = convert_address_format(row['Account address'])
        writer.writerow([new_address])

print(f"Conversion complete. The updated addresses are saved in '{output_filename}'.")
