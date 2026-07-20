# Packet Atlas

An interactive React and TypeScript app that explains a packet's journey with an Earth view, network path, building view, packet inspectors, TCP and UDP simulations, and concept diagrams.

## Run locally

Node.js 22 or newer is recommended.

```sh
npm install
npm run dev
```

Open the address printed by Vite. To create and serve a production build locally:

```sh
npm run build
npm run start
```

Use `npm run typecheck` to check the TypeScript source and `npm run format` to format it.
Use `npm run check` to run both checks without changing files.

On Windows PowerShell, use `npm.cmd` in place of `npm` if script execution is disabled.

## Run with Docker

```sh
docker compose up --build
```

Open http://localhost:8080. The Docker image builds the React app and serves its static files with Node.

## Source layout

- `src/app` contains the React page shell, UI coordination, panel renderers, and educational content.
- `src/simulation` contains packet types, network data, addressing, protocol state, and timeline replay.
- `src/visualization` contains canvas drawing, routes, device icons, and pointer input.

The simulation has no browser dependencies. The UI controller owns the simulation and passes its current state to the canvas scene and panel renderers. Each module imports from its own layer or the simulation layer, so protocol behavior can be changed without changing the drawing code.
