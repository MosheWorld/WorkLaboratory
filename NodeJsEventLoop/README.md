# Node.js Event Loop Lab

An interactive guide to the Node.js event loop, timers, microtasks, queues, and I/O.

## Run locally

```powershell
npm ci
npm run dev
```

Check the project with `npm run verify`.

## Project structure

```text
src/
  domain/simulation/       Pure session transitions and readonly domain types
  lessons/                 Lesson definitions and the ordered catalog
    shared/                Trace builder shared by lessons
    libuv/                 Individual stages of the complete runtime trace
  presentation/
    App.tsx                Page composition
    components/            Presentation components with typed props
      runtime/             Runtime zones, cycle overview, and visibility rules
    hooks/                 Session state, keyboard events, and token animation
    styles/                Shared visual design
  main.tsx                 React root and StrictMode
```

Domain functions are independent of React. Lessons depend on domain types, and
presentation code consumes both layers. Keep session updates in
`simulationSession.ts`, React state and actions in `useSimulationSession`, and
browser event subscriptions in hooks with matching cleanup.

Use PascalCase for components and their `Props` interfaces, camelCase for hooks
and function modules, and descriptive domain names for lesson and runtime data.
Derive progress and navigation availability from the session instead of storing
duplicate state. Runtime token IDs remain stable across transitions; the runtime
component is keyed by lesson ID to reset animation history between lessons.

To add a lesson, create its `LessonDefinition` and register it in
`eventLoopLessons.ts`. Include at least one snapshot, valid source line numbers,
unique snapshot IDs, and unique token and console IDs within each snapshot.

## Validation

```powershell
npm run lint
npm run test
npm run build
```

`npm run verify` runs all three. Tests live alongside the code they verify and
cover session boundaries, catalog integrity, keyboard interactions, StrictMode
cleanup, and lesson switching. DOM tests use reduced motion; they do not verify
visual layout or animation timing in a real browser.

Dependencies are pinned to explicit versions with the lockfile committed. Use
`npm ci` for reproducible installs and run verification after dependency updates.

## Docker

```powershell
docker compose up --build -d
```

Open [http://localhost:8080](http://localhost:8080).

```powershell
docker compose down
```
