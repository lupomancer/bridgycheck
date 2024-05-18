package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"github.com/bluesky-social/indigo/repo"
	"github.com/ipfs/go-cid"
)

func main() {
	// Check if a file path is provided as an argument
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run main.go <path to .car file>")
		os.Exit(1)
	}

	// Get the path to the .car file
	carPath := os.Args[1]

	// Convert .car file to JSON
	err := carToJSON(carPath)
	if err != nil {
		fmt.Printf("Error converting .car to JSON: %v\n", err)
		os.Exit(1)
	}
}

func carToJSON(carPath string) error {
	// Create a context
	ctx := context.Background()

	// Open the .car file
	fi, err := os.Open(carPath)
	if err != nil {
		return err
	}
	defer fi.Close()

	// Read repository tree into memory
	r, err := repo.ReadRepoFromCar(ctx, fi)
	if err != nil {
		return err
	}

	// Extract repository contents to a map
	repoMap := make(map[string]string)
	err = r.ForEach(ctx, "", func(k string, v cid.Cid) error {
		// Convert CID to string representation
		repoMap[k] = v.String()
		return nil
	})
	if err != nil {
		return err
	}

	// Convert map to JSON
	jsonData, err := json.MarshalIndent(repoMap, "", "  ")
	if err != nil {
		return err
	}

	// Write JSON data to stdout
	fmt.Println(string(jsonData))

	return nil
}

