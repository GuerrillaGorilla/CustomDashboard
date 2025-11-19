# Fresh project

Your new Fresh project is ready to go. You can follow the Fresh "Getting
Started" guide here: https://fresh.deno.dev/docs/getting-started

### Usage

Make sure to install Deno:
https://docs.deno.com/runtime/getting_started/installation

Then start the project in development mode:

```
deno task dev
```

This will watch the project directory and restart as necessary.

### Tailwind CSS v4

Source styles live in `static/tailwind.css` (it imports Tailwind and holds any custom utilities). Generate the served stylesheet at `static/styles.css` with:

```
deno task tw         # one-off build
deno task tw:watch   # continuous rebuild alongside `deno task dev`
```

The global layout already links to `/styles.css`, so new classes are available after running one of the tasks above.


### Clone and deploy

Deploy your own version of this example with a couple of clicks

[![Deploy on Deno](https://deno.com/button)](https://app.deno.com/new?clone=https://github.com/denoland/examples&path=with-fresh)
