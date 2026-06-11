https://github.com/user-attachments/assets/2f6bfe83-3654-4fbc-b1d1-672137b70cef

personality tests ask us how we see ourselves. but how about how that contrasts with how other people see us??

comparefish lets you create plots (up to 3 dimensions), plot yourself, and invite your friends to fix your placements.

## chart input model
- Single unified gesture handler in `components/Chart/useChartPlacement.ts` using **Pointer Events** (`onPointerDown/Move/Up/Cancel/Leave`) — works for mouse, touch, and pen.
- `setPointerCapture` is called on drag start so move/up events keep firing on the chart container even when the pointer leaves it (needed for the "drag-off-edge to delete" gesture and reliable mobile dragging).
- Avatars are `pointer-events-none`; the chart container handles all input and hit-tests avatars by coordinates. This avoids iOS image long-press/drag stealing the gesture.
- Tap on empty space → place yourself; drag your fish → reposition; drag another fish → fix it.
