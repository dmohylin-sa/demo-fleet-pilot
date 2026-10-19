# TrafixCT pilot - clickable demo

A local demo of what the TrafixCT pilot delivers. The driver app runs inside a phone frame and the dispatcher console runs in a browser window next to it. Both share one **fully mocked backend**: nothing is sent anywhere, and all data is fictional.

## Run it

```bash
npm install
npm run dev
```

Open the address Vite prints, for example http://localhost:5173. The map tiles come from OpenStreetMap, so the maps need internet; everything else works offline.

`npm run build` produces a static `dist/` folder that opens from any web server.

## What is on the screen

| Area | What it is |
|---|---|
| Header | Phase filter (Phase 1 / + Phase 2 go-live / All phases), English or Hebrew (RTL), and Reset demo |
| Walkthrough rail | The suggested scenario. Steps tick off from the demo state. |
| Phone | The Android driver app (React Native in the pilot), simulated in the browser |
| Demo controls | Real-world events, triggered by hand: drive to the next stop, traffic delay, weak signal, harsh braking, speeding, no signal, lock the phone |
| Mock API log | Every call the apps make to the mocked backend. The switch shows the polling calls too. |
| Console | The dispatcher console. In Phase 1 only, it is the plain fleet manager web list. |

Every screen and console page carries a phase badge:
- **P1:** Phase 1, the demo.
- **P2:** Phase 2 go-live.
- **P2+:** Phase 2, delivered during the pilot.

## Suggested walkthrough

1. **Log in on the phone.** Use driver `1001` with PIN `1234`, or press "Fill in". In Phase 2, start the shift.
2. **Scan the bill of lading.**
   - Press the scan button, then the shutter.
   - The photo uploads and the document is read.
   - Turn on "Weak signal" first to see the upload retry.
3. **Confirm the fields.**
   - Tap any field to correct it, and pick the address for each drop.
   - Drop 2's pallet count is handwritten and has low confidence. Leave it uncorrected to send it to the dispatcher's review queue.
4. **Look at the route**, then **start the trip**.
5. **Drive.** Use "Drive to next stop"; the truck moves on the console map.
6. **Delay alert.** Press "Traffic delay".
   - Phase 1: the trip screen shows it within a few seconds.
   - Phase 2: it also arrives as a push on a locked phone.
   - Choose the new route or keep yours.
7. **Deliver.**
   - Press Arrived, photograph the delivery note (Phase 2), then Complete.
   - Drop 2's note says 5 pallets against 4 on the bill of lading, so it is flagged.
   - Turn on "No signal" to see actions queue on the phone and sync later.
8. **Finish the trip**, then **check the console**: deliveries, the review queue, events, notifications, exports, and the pilot tools.

"Reset demo" in the header restores the seed data. The demo state is kept in the browser's local storage until the end of the day.

## Structure

```
src/
  mock-backend/   seed data, the zustand "database", api.js (the only entry point for the UI), geo and CSV helpers
  phone/          the driver app: screens, the offline queue (phoneApi.js), the drive simulator
  console/        the dispatcher console pages
  demo/           the shell: header, walkthrough rail, phone and browser frames, demo controls, API log
  shared/         map, document drawing, polling hook, formatting
  i18n/           English and Hebrew strings
```

Stack: Vite, React 18, Ant Design 5, react-router (hash routing), zustand, Leaflet with OpenStreetMap, recharts.
