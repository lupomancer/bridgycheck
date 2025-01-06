# Bridgy Check

This tool intakes your followed users export from mastodon and checks to see if they have a corresponding bridged account using [Bridgy Fed](https://fed.brid.gy/)

Usage:
```node mastoToBsky.js <name of mastodon following accounts.csv>```

I also included a tool to just print out the resulting ```output.csv``` to an HTML page for ease of clicking.

It's used by running
```node linkPage.js output.csv```

I've also added bskyToMasto.js which checks mastodon for bridged BSKY accounts. Currently this functionality is super dirty and requires you download an account export using [this tool](https://github.com/rdp-studio/atproto-export/tree/main), which you then take the app.bsky.graph.follow folder and use it as a command link arg for the js file.
Example:
```node bskyToMasto.js <path>\<to>\app.bsky.graph.follow```

I think next I'm going to try to eventually integrate [rdp-studio's code](https://github.com/rdp-studio/atproto-export/tree/main) so the tool will automatically get the export for you instead of you needing to do it yourself.

I also would like to make a handler for all this so you don't need to run these from the terminal.

I know this is all very sparse, I will make it prettier in time I promise
