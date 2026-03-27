Build an interactive app called “Availability Checker” for small groups.

Goal:
Help a group of friends create multiple named plans, assign a date range to each plan, mark availability per person, and instantly see which dates work for everyone.

This should be a usable interactive prototype, not just a static mockup.

Important app structure:
This is a 2-screen app, not a one-screen app.

Screen 1 = Plans screen
- Used for creating, browsing, selecting, renaming, and deleting plans

Screen 2 = Plan calendar screen
- Opens after clicking a plan from Screen 1
- Shows that plan’s full availability board

Each plan must function independently and store its own:
- plan name
- start date
- end date
- generated horizontal date row
- people list
- availability states
- notes/excuses per person
- temporary filter state
- summary of dates where everyone included is available

Example plans:
- Term 2 Break
- Summer Trip
- Finals Week Catch-Up

--------------------------------------------------
SCREEN 1 — PLANS SCREEN
--------------------------------------------------

Purpose:
Create and manage plans before entering the calendar board.

Layout:
1. Header
- App title: Availability Checker
- Subtitle: Plan dates with friends and instantly find matches

2. Create Plan section
Inputs:
- Plan Name
- Start Date
- End Date
Primary button:
- Create Plan

3. Plans list
Show all created plans as cards or list items

Each plan item should display:
- Plan name
- Date range
- Number of people if available

Each plan item should support:
- Click to open plan
- Rename
- Delete

Preferred interaction:
- Clicking a plan opens Screen 2 for that specific plan

Empty state:
- If no plans exist yet, show a clean empty state with a prompt to create the first plan

Visual direction for Screen 1:
- Clean dashboard feel
- Minimal and modern
- Easy to scan
- Friendly but practical

--------------------------------------------------
SCREEN 2 — PLAN CALENDAR SCREEN
--------------------------------------------------

Purpose:
Show one selected plan’s availability board.

Top bar:
- Back button to return to Plans screen
- Plan title
- Date range
- Small actions:
  - Edit plan
  - Delete plan

Main sections on Screen 2:

A. People controls
- Add Person input
- Add button

B. Availability grid
Grid structure:
- Dates as horizontal columns from left to right
- People as rows
- Leftmost column = person names
- Middle columns = one column per date
- Far right column = Notes / Excuses

Date header requirements:
- Show month/day
- Optionally show smaller day of week
- If date range is long, allow horizontal scrolling
- Sticky top row preferred
- Sticky left name column preferred

Availability cell behavior:
- Each cell supports 3 states:
  - blank
  - ✅
  - ❌
- Clicking a cell cycles:
  - blank → ✅ → ❌ → blank
- Use very clear visual states
- Cells should be compact and easy to scan

Bulk edit behavior:
- Allow selecting multiple cells at once
- Use drag-select or multi-select
- When cells are selected, show bulk actions:
  - Mark selected as ✅
  - Mark selected as ❌
  - Clear selected
- Bulk editing should feel simple and obvious

C. Notes / Excuses per row
- Each person row must have an editable Notes / Excuses field at the far right
- This field is informational only
- Example notes:
  - Out of town on April 12
  - Available only after 6 PM
  - Waiting on family plans
- Notes stay attached to that specific person within that specific plan
- Notes do not affect the automatic summary calculation
- Keep notes inline-editable and visually lightweight

D. Temporary filter panel
- Add a side panel or section for temporarily excluding people from the availability calculation
- This does not delete them
- Use checkboxes or toggles beside each person name
- Excluded people remain in the plan but are ignored in the summary calculation
- Clearly show who is included vs excluded

E. Summary section
1. Bottom summary row
- Add a fixed bottom row labeled: Everyone Available
- For each date:
  - show ✅ only if every currently included person is marked ✅ for that date
  - otherwise show ❌
- This row updates automatically whenever:
  - a cell changes
  - a person is filtered in or out

2. Available dates panel
- Add a small summary panel listing the dates where everyone currently included is available

--------------------------------------------------
DATA / PROTOTYPE REQUIREMENTS
--------------------------------------------------

- Include realistic sample data immediately on load
- Preload 3 sample plans:
  - Term 2 Break
  - Summer Trip
  - Finals Week Catch-Up
- Each sample plan should include 4 to 6 people and mixed availability data
- Make both screens feel interactive and prototype-ready
- Plan selection on Screen 1 should clearly navigate to Screen 2
- Back button on Screen 2 should clearly return to Screen 1

--------------------------------------------------
VISUAL DIRECTION
--------------------------------------------------

- Clean
- Minimal
- Modern
- Friendly
- Spreadsheet + calendar hybrid
- Soft spacing
- Clear contrast
- Easy to scan
- Not overly colorful
- Feels like a practical real product, not a concept board

--------------------------------------------------
PRIMARY USER FLOW
--------------------------------------------------

1. Open Plans screen
2. Create a plan
3. Name it something like “Term 2 Break”
4. Set start and end dates
5. See the plan appear in the plans list
6. Click the plan
7. Open the plan’s calendar screen
8. Add people
9. Mark availability
10. Bulk edit if needed
11. Add notes/excuses per row
12. Temporarily exclude certain people
13. Instantly see which dates work for everyone included