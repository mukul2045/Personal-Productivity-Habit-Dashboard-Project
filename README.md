# Personal Productivity & Habit Dashboard

A web application to track daily habits, monitor goals, and visualize productivity trends over time.

Built using:
- HTML
- CSS
- JavaScript (Vanilla JS)
- [Chart.js](https://www.chartjs.org/)
- `localStorage` for data persistence

---

## Features

- Add custom habits dynamically
  - Habit name
  - Habit type (`number` or `yes/no`)
  - Optional target value
- Daily habit entry form with date selection
- Dashboard metrics
  - Total days tracked
  - Average productivity score
  - Current streak
  - Best streak
- Analytics charts
  - Line chart (numeric habit trend)
  - Bar chart (daily productivity score)
  - Pie chart (completion vs missed)
- Monthly progress insights
  - Days completed in current month
  - Habit completion counts
  - Improving/declining trend detection
- Productivity score system (0-100)
- Streak tracking system
- Dark mode toggle
- Data export as JSON
- Edit/Delete habits
- Reset all data

---

## Project Structure

```text
.
|- index.html
|- style.css
|- script.js
|- README.md
```

---

## How to Run

1. Download or clone this project.
2. Open the project folder.
3. Open `index.html` in any modern browser.

No build step or installation required.

---

## How It Works

- Habits and daily entries are saved in browser `localStorage`.
- On page load, stored data is read and rendered automatically.
- Charts update dynamically whenever habits or entries are changed.
- Productivity scores and streaks are recalculated after each save.

---

## Example Habit Types

- **Number habits**: Study Hours, Sleep Hours, Water Intake
- **Yes/No habits**: Gym, Running, Reading, Meditation

---

## Future Improvements (Optional)

- Weekly summary card
- CSV export support
- Habit categories and color tags
- Better mobile chart controls

---

## Author

**Mukul Aggarwal**

---

## License

This project is free to use for learning and personal practice.
