const STORAGE_KEYS = {
  habits: "pphd_habits",
  entries: "pphd_entries",
  darkMode: "pphd_dark_mode"
};

let habits = loadFromStorage(STORAGE_KEYS.habits, []);
let entries = loadFromStorage(STORAGE_KEYS.entries, []);

let lineChart;
let barChart;
let pieChart;

const habitForm = document.getElementById("habitForm");
const dailyForm = document.getElementById("dailyForm");
const habitTableBody = document.getElementById("habitTableBody");
const dailyInputs = document.getElementById("dailyInputs");
const lineHabitSelect = document.getElementById("lineHabitSelect");
const entryDateInput = document.getElementById("entryDate");
const darkModeToggle = document.getElementById("darkModeToggle");

const totalDaysTrackedEl = document.getElementById("totalDaysTracked");
const avgScoreEl = document.getElementById("avgScore");
const currentStreakEl = document.getElementById("currentStreak");
const bestStreakEl = document.getElementById("bestStreak");

const habitSummaryEl = document.getElementById("habitSummary");
const monthlyStatsEl = document.getElementById("monthlyStats");
const streakDetailsEl = document.getElementById("streakDetails");

init();

function init() {
  if (!entryDateInput.value) {
    entryDateInput.value = getTodayDate();
  }
  applyStoredTheme();
  bindEvents();
  renderAll();
}

function bindEvents() {
  habitForm.addEventListener("submit", handleHabitSubmit);
  dailyForm.addEventListener("submit", handleDailySubmit);

  document.getElementById("exportDataBtn").addEventListener("click", exportDataAsJson);
  document.getElementById("resetDataBtn").addEventListener("click", resetAllData);
  darkModeToggle.addEventListener("click", toggleDarkMode);

  lineHabitSelect.addEventListener("change", renderLineChart);
}

function handleHabitSubmit(event) {
  event.preventDefault();
  const name = document.getElementById("habitName").value.trim();
  const type = document.getElementById("habitType").value;
  const targetRaw = document.getElementById("habitTarget").value.trim();
  const target = targetRaw === "" ? null : Number(targetRaw);

  if (!name) return;
  if (target !== null && (Number.isNaN(target) || target < 0)) {
    alert("Target must be a valid positive number.");
    return;
  }

  const habit = {
    id: crypto.randomUUID(),
    name,
    type,
    target
  };

  habits.push(habit);
  saveToStorage(STORAGE_KEYS.habits, habits);
  habitForm.reset();
  renderAll();
}

function handleDailySubmit(event) {
  event.preventDefault();
  const date = entryDateInput.value;
  if (!date) return;

  const values = {};
  let hasAnyValue = false;

  habits.forEach((habit) => {
    if (habit.type === "number") {
      const input = document.getElementById(`daily-${habit.id}`);
      const raw = input.value.trim();
      const value = raw === "" ? null : Number(raw);
      if (value !== null && Number.isNaN(value)) return;
      values[habit.id] = value;
      if (value !== null) hasAnyValue = true;
    } else {
      const input = document.getElementById(`daily-${habit.id}`);
      values[habit.id] = input.checked;
      if (input.checked) hasAnyValue = true;
    }
  });

  if (!hasAnyValue) {
    alert("Enter at least one habit value before saving.");
    return;
  }

  const score = calculateProductivityScore(values);
  const existingIndex = entries.findIndex((entry) => entry.date === date);

  const entry = { date, values, score };
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));
  saveToStorage(STORAGE_KEYS.entries, entries);
  renderAll();
}

function renderAll() {
  renderHabitTable();
  renderDailyInputs();
  renderOverviewCards();
  renderLineHabitOptions();
  renderLineChart();
  renderBarChart();
  renderPieChart();
  renderHabitSummary();
  renderMonthlyProgress();
  renderStreaks();
}

function renderHabitTable() {
  habitTableBody.innerHTML = "";
  if (habits.length === 0) {
    habitTableBody.innerHTML = `<tr><td colspan="4">No habits added yet.</td></tr>`;
    return;
  }

  habits.forEach((habit) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(habit.name)}</td>
      <td>${habit.type === "number" ? "Number" : "Yes/No"}</td>
      <td>${habit.target === null ? "-" : habit.target}</td>
      <td>
        <button type="button" class="btn btn-outline edit-btn" data-id="${habit.id}">Edit</button>
        <button type="button" class="btn btn-danger delete-btn" data-id="${habit.id}">Delete</button>
      </td>
    `;
    habitTableBody.appendChild(row);
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteHabit(btn.dataset.id));
  });

  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => editHabit(btn.dataset.id));
  });
}

function renderDailyInputs() {
  dailyInputs.innerHTML = "";
  if (habits.length === 0) {
    dailyInputs.innerHTML = "<p>Add habits first to start daily tracking.</p>";
    return;
  }

  const existing = entries.find((entry) => entry.date === entryDateInput.value);

  habits.forEach((habit) => {
    const row = document.createElement("div");
    row.className = "daily-row";

    const label = document.createElement("label");
    label.textContent = habit.name + (habit.target !== null ? ` (target: ${habit.target})` : "");

    const input = document.createElement("input");
    input.id = `daily-${habit.id}`;
    input.type = habit.type === "number" ? "number" : "checkbox";
    if (habit.type === "number") {
      input.step = "0.1";
      input.min = "0";
      const value = existing?.values?.[habit.id];
      input.value = value === null || value === undefined ? "" : value;
    } else {
      const value = existing?.values?.[habit.id];
      input.checked = Boolean(value);
    }

    row.appendChild(label);
    row.appendChild(input);
    dailyInputs.appendChild(row);
  });

  entryDateInput.onchange = renderDailyInputs;
}

function renderOverviewCards() {
  totalDaysTrackedEl.textContent = String(entries.length);
  const avgScore = entries.length ? average(entries.map((entry) => entry.score)) : 0;
  avgScoreEl.textContent = avgScore.toFixed(1);

  const streak = calculateStreaks();
  currentStreakEl.textContent = `${streak.current} days`;
  bestStreakEl.textContent = `${streak.best} days`;
}

function renderLineHabitOptions() {
  const numericHabits = habits.filter((habit) => habit.type === "number");
  lineHabitSelect.innerHTML = "";

  if (numericHabits.length === 0) {
    const option = document.createElement("option");
    option.textContent = "No numeric habits";
    option.value = "";
    lineHabitSelect.appendChild(option);
    return;
  }

  numericHabits.forEach((habit) => {
    const option = document.createElement("option");
    option.value = habit.id;
    option.textContent = habit.name;
    lineHabitSelect.appendChild(option);
  });
}

function renderLineChart() {
  const habitId = lineHabitSelect.value;
  const habit = habits.find((h) => h.id === habitId);
  const ctx = document.getElementById("lineChart");

  if (lineChart) lineChart.destroy();
  if (!habit) {
    lineChart = new Chart(ctx, {
      type: "line",
      data: { labels: [], datasets: [] }
    });
    return;
  }

  const labels = entries.map((entry) => entry.date);
  const values = entries.map((entry) => {
    const v = entry.values?.[habit.id];
    return v === null || v === undefined ? 0 : v;
  });

  lineChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: habit.name,
          data: values,
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79,70,229,0.2)",
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function renderBarChart() {
  const ctx = document.getElementById("barChart");
  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: entries.map((entry) => entry.date),
      datasets: [
        {
          label: "Productivity Score",
          data: entries.map((entry) => entry.score),
          backgroundColor: "rgba(5, 150, 105, 0.6)",
          borderColor: "#059669",
          borderWidth: 1
        }
      ]
    },
    options: {
      scales: {
        y: {
          min: 0,
          max: 100
        }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function renderPieChart() {
  const ctx = document.getElementById("pieChart");
  if (pieChart) pieChart.destroy();

  let done = 0;
  let notDone = 0;

  entries.forEach((entry) => {
    habits.forEach((habit) => {
      const value = entry.values?.[habit.id];
      if (habit.type === "boolean") {
        if (value) done += 1;
        else notDone += 1;
      } else if (habit.target !== null) {
        if (value !== null && value !== undefined && value >= habit.target) done += 1;
        else notDone += 1;
      }
    });
  });

  pieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Done / Target Met", "Not Done / Missed"],
      datasets: [
        {
          data: [done, notDone],
          backgroundColor: ["#10b981", "#ef4444"]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function renderHabitSummary() {
  habitSummaryEl.innerHTML = "";

  if (habits.length === 0 || entries.length === 0) {
    habitSummaryEl.innerHTML = `<div class="summary-item">Add habits and entries to see summary analytics.</div>`;
    return;
  }

  habits.forEach((habit) => {
    let detailText = "";
    let statusClass = "";

    if (habit.type === "number") {
      const values = entries
        .map((entry) => entry.values?.[habit.id])
        .filter((value) => value !== null && value !== undefined);
      const avg = values.length ? average(values) : 0;
      detailText = `Average: ${avg.toFixed(2)}`;

      if (habit.target !== null) {
        const metCount = values.filter((v) => v >= habit.target).length;
        const percent = values.length ? (metCount / values.length) * 100 : 0;
        const met = percent >= 70;
        detailText += ` | Target Met: ${percent.toFixed(1)}%`;
        statusClass = met ? "success" : "warning";
      }
    } else {
      const total = entries.length;
      const completed = entries.filter((entry) => Boolean(entry.values?.[habit.id])).length;
      const percent = total ? (completed / total) * 100 : 0;
      detailText = `Completion: ${percent.toFixed(1)}% (${completed}/${total})`;
      statusClass = percent >= 70 ? "success" : "warning";
    }

    const item = document.createElement("div");
    item.className = "summary-item";
    item.innerHTML = `<strong>${escapeHtml(habit.name)}</strong> - <span class="${statusClass}">${detailText}</span>`;
    habitSummaryEl.appendChild(item);
  });
}

function renderMonthlyProgress() {
  monthlyStatsEl.innerHTML = "";
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthlyEntries = entries.filter((entry) => {
    const dateObj = new Date(entry.date + "T00:00:00");
    return dateObj.getFullYear() === year && dateObj.getMonth() === month;
  });

  const daysCompleted = monthlyEntries.length;
  const avgMonthScore = daysCompleted ? average(monthlyEntries.map((entry) => entry.score)) : 0;

  monthlyStatsEl.appendChild(
    buildSummaryItem(`Days completed this month: ${daysCompleted}`, "summary-item")
  );
  monthlyStatsEl.appendChild(
    buildSummaryItem(`Average monthly score: ${avgMonthScore.toFixed(1)}`, "summary-item")
  );

  habits.forEach((habit) => {
    const values = monthlyEntries.map((entry) => entry.values?.[habit.id]);
    let text = "";

    if (habit.type === "boolean") {
      const done = values.filter(Boolean).length;
      text = `${habit.name}: ${done} completions`;
    } else {
      const valid = values.filter((value) => value !== null && value !== undefined);
      const firstHalf = valid.slice(0, Math.ceil(valid.length / 2));
      const secondHalf = valid.slice(Math.ceil(valid.length / 2));
      const trend = average(secondHalf) - average(firstHalf);
      const trendText = valid.length < 2 ? "Not enough data" : trend >= 0 ? "Improving" : "Declining";
      text = `${habit.name}: trend ${trendText}`;
    }

    monthlyStatsEl.appendChild(buildSummaryItem(text, "summary-item"));
  });
}

function renderStreaks() {
  const { current, best } = calculateStreaks();
  streakDetailsEl.innerHTML = "";
  streakDetailsEl.appendChild(buildSummaryItem(`Current streak: ${current} days`, "summary-item"));
  streakDetailsEl.appendChild(buildSummaryItem(`Best streak: ${best} days`, "summary-item"));
}

function calculateProductivityScore(values) {
  if (habits.length === 0) return 0;

  let earned = 0;
  const max = habits.length;

  habits.forEach((habit) => {
    const value = values[habit.id];
    if (habit.type === "boolean") {
      if (value) earned += 1;
      return;
    }

    if (value === null || value === undefined) return;
    if (habit.target === null) {
      earned += 0.7;
    } else if (value >= habit.target) {
      earned += 1;
    } else if (habit.target > 0) {
      earned += Math.max(0, Math.min(1, value / habit.target));
    }
  });

  return Math.round((earned / max) * 100);
}

function calculateStreaks() {
  if (entries.length === 0) return { current: 0, best: 0 };

  const productiveDates = entries
    .filter((entry) => entry.score >= 60)
    .map((entry) => entry.date)
    .sort();

  if (productiveDates.length === 0) return { current: 0, best: 0 };

  let best = 1;
  let running = 1;

  for (let i = 1; i < productiveDates.length; i += 1) {
    const prev = new Date(productiveDates[i - 1] + "T00:00:00");
    const curr = new Date(productiveDates[i] + "T00:00:00");
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      running += 1;
      best = Math.max(best, running);
    } else if (diffDays > 1) {
      running = 1;
    }
  }

  let current = 0;
  const today = new Date(getTodayDate() + "T00:00:00");
  let checkDate = today;

  for (let i = productiveDates.length - 1; i >= 0; i -= 1) {
    const date = new Date(productiveDates[i] + "T00:00:00");
    const diff = Math.round((checkDate - date) / (1000 * 60 * 60 * 24));

    if (diff === 0) {
      current += 1;
      checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
    } else if (diff === 1 && current === 0) {
      current += 1;
      checkDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    } else if (diff >= 1) {
      break;
    }
  }

  return { current, best };
}

function deleteHabit(habitId) {
  if (!confirm("Delete this habit? Existing entry values for this habit will also be removed.")) return;

  habits = habits.filter((habit) => habit.id !== habitId);
  entries = entries.map((entry) => {
    const copy = { ...entry, values: { ...entry.values } };
    delete copy.values[habitId];
    copy.score = calculateProductivityScore(copy.values);
    return copy;
  });

  saveToStorage(STORAGE_KEYS.habits, habits);
  saveToStorage(STORAGE_KEYS.entries, entries);
  renderAll();
}

function editHabit(habitId) {
  const habit = habits.find((h) => h.id === habitId);
  if (!habit) return;

  const nextName = prompt("Edit habit name:", habit.name);
  if (nextName === null) return;
  const trimmedName = nextName.trim();
  if (!trimmedName) {
    alert("Habit name cannot be empty.");
    return;
  }

  const targetPrompt = prompt(
    "Edit target value. Leave blank to remove target.",
    habit.target === null ? "" : String(habit.target)
  );
  if (targetPrompt === null) return;
  const newTarget = targetPrompt.trim() === "" ? null : Number(targetPrompt.trim());

  if (newTarget !== null && (Number.isNaN(newTarget) || newTarget < 0)) {
    alert("Target must be a valid positive number.");
    return;
  }

  habit.name = trimmedName;
  habit.target = newTarget;

  entries = entries.map((entry) => ({
    ...entry,
    score: calculateProductivityScore(entry.values)
  }));

  saveToStorage(STORAGE_KEYS.habits, habits);
  saveToStorage(STORAGE_KEYS.entries, entries);
  renderAll();
}

function exportDataAsJson() {
  const payload = {
    habits,
    entries,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "productivity-dashboard-data.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function resetAllData() {
  if (!confirm("This will remove all habits and entries. Continue?")) return;

  habits = [];
  entries = [];
  localStorage.removeItem(STORAGE_KEYS.habits);
  localStorage.removeItem(STORAGE_KEYS.entries);
  renderAll();
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem(STORAGE_KEYS.darkMode, document.body.classList.contains("dark") ? "1" : "0");
}

function applyStoredTheme() {
  const dark = localStorage.getItem(STORAGE_KEYS.darkMode) === "1";
  document.body.classList.toggle("dark", dark);
}

function buildSummaryItem(text, className) {
  const div = document.createElement("div");
  div.className = className;
  div.textContent = text;
  return div;
}

function average(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error("Storage parse error:", error);
    return fallback;
  }
}

function getTodayDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
