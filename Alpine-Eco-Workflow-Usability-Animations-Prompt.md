# LOVABLE PROMPT — Usability & Animation Pass, Alpine-Eco Workflow

The core app and data are working. This pass is about two things: tightening usability, and actually implementing the animations/transitions from the original spec (they're missing or inconsistent in the current build). Don't change the color system, typography, or layout structure — this is about behavior and motion.

---

## 1. USABILITY FIXES

**Feedback & confirmation**
- Every save/send/convert/mark-paid/mark-delivered action needs a toast confirmation ("Quote QT-2026-0043 sent") — right now actions happen silently with no feedback
- Destructive or hard-to-reverse actions (delete line item beyond the row, cancel invoice, delete job card) need a confirm step — a small inline confirm or modal, not a native browser `confirm()`
- Form validation errors should show inline under the field in real time, not just block submission with no explanation

**Navigation & findability**
- Add breadcrumbs on document detail/edit views (e.g. Quotations / QT-2026-0043) so staff can get back to the list without hitting browser back
- The search box in the top bar should actually filter the current list live as you type, with a short debounce — confirm this is wired up on all four list screens, not just Dashboard
- Sticky table headers on long lists (Invoices, Quotations) so column headers stay visible on scroll

**Workshop/tablet usability (Job Cards specifically)**
- Checkboxes and buttons on the Job Cards screen need a larger tap target (minimum ~44px) since this screen is meant to be used on a tablet on the factory floor
- Sidebar should collapse to icon-only below tablet breakpoint rather than compressing awkwardly

**Data entry efficiency**
- Customer Name field on the quote form should autocomplete from previous documents' customer names/emails, so staff aren't retyping repeat clients
- "Add Line Item" should focus the new row's description field automatically so staff can keep typing without reaching for the mouse
- Currency and quantity fields should format on blur (e.g. `4250` → `R 4,250.00`) rather than requiring manual formatting

**Empty & loading states**
- Every list screen needs a real empty state (not a blank table) — short message + icon in the brand style, with a "New [Quote/Invoice/etc]" call to action
- Tables and cards should show skeleton placeholders while data loads, not a blank flash or spinner-in-empty-space

---

## 2. ANIMATIONS & TRANSITIONS — IMPLEMENT PROPERLY

These were specified originally but need to actually be built and verified. Please implement each of the following concretely:

- **Route/page transitions:** navigating between Dashboard, Quotations, Invoices, Delivery, Job Cards, History should cross-fade with a small 8px vertical shift (~200–250ms ease-out) — not a hard cut
- **List/card entrances:** on first render of any list or job-card grid, items fade in + rise 8px with a ~60ms stagger between items
- **Hover states:** cards and table rows get the signature gradient underline (royal blue → eco green) animating left to right on hover (~250ms ease) — confirm this is present on Dashboard stat cards, Recent Activity rows, and Job Cards
- **Tabs:** the active-tab underline should slide between tab positions on click (~200ms ease), not just recolor instantly — check this on all four list screens
- **Sidebar:** active-item left border slides in (~150ms); hover states ease text/background color over ~150ms
- **Buttons:** press state = scale to 0.97 (~120ms); any button in a loading state should fade its label into a spinner without a layout jump
- **Line items:** adding a row slides it down + fades in (~180ms); removing a row collapses its height smoothly instead of vanishing instantly
- **Job task checkboxes:** the checkmark should draw in (~150ms) on check, and the row should get a brief eco-green background flash that fades out (~400ms) when a task is completed
- **Status badges:** changing status should cross-fade the badge color/label (~150ms) rather than snapping
- **Order Tracker timeline:** selecting a different quote should animate the timeline dots/events in top-to-bottom with a ~40ms stagger, with the connecting line drawing downward rather than appearing instantly
- **Toasts:** slide in from the top-right, auto-dismiss with a fade out
- **Modals/drawers:** scale from 0.98 → 1 while fading in (~200ms), with the backdrop fading in parallel

Please go through the app screen by screen and confirm each of these is actually wired up — if Framer Motion or CSS transitions were scaffolded but not connected to real state changes (route change, hover, status update, task check), that's the gap to close here.

Keep all motion subtle and quiet — this is a premium, editorial-feeling tool, not a playful consumer app. No bounce, no overshoot, ease-out/ease-in-out only.
