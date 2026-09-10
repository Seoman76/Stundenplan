"use strict";

/*
  Die drei veröffentlichten Google-Sheets-Tabs.
  Der jeweilige gid identifiziert den Tab.
*/
const plans = {
  Jojo:
"https://docs.google.com/spreadsheets/d/e/2PACX-1vR-195auLVcne0kWg1Q5tDhvXXpLeAUDtw_IHix1D_TyaJfSXHBdV6PZZ8DkHK6h_PqvWRtj7A5Vuf/pub?gid=0&single=true&output=csv",

  Jooris:
"https://docs.google.com/spreadsheets/d/e/2PACX-1vR-195auLVcne0kWg1Q5tDhvXXpLeAUDtw_IHix1D_TyaJfSXHBdV6PZZ8DkHK6h_PqvWRtj7A5Vuf/pub?gid=1017612760&single=true&output=csv",

  Jule:
"https://docs.google.com/spreadsheets/d/e/2PACX-1vR-195auLVcne0kWg1Q5tDhvXXpLeAUDtw_IHix1D_TyaJfSXHBdV6PZZ8DkHK6h_PqvWRtj7A5Vuf/pub?gid=175444478&single=true&output=csv"
};

const weekdays = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag"
];

const shortWeekdays = {
  Montag: "Mo",
  Dienstag: "Di",
  Mittwoch: "Mi",
  Donnerstag: "Do",
  Freitag: "Fr"
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (
      (character == "\n" || character == "\r") &&
      !insideQuotes
    ) {
      if (character === "
" && nextCharacter === "
") {
        index += 1;
      }

      row.push(cell);

      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);

    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function rowsToObjects(rows) {
  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map(normalizeHeader);

  return rows.slice(1).map((row) => {
    const result = {};

    headers.forEach((header, index) => {
      result[header] = String(row[index] ?? "").trim();
    });

    return result;
  });
}

async function loadPlan(name, url) {
  const cacheBuster = `_=${Date.now()}`;
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}${cacheBuster}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`${name}: HTTP ${response.status}`);
  }

  const csvText = await response.text();
  const rows = parseCsv(csvText);
  const lessons = rowsToObjects(rows);

  return {
    name,
    lessons
  };
}

function subjectHtml(value) {
  const subject = String(value ?? "").trim();
  const className = subject ? "subject" : "subject empty";
  const text = subject || "—";

  return `<span class="${className}">${escapeHtml(text)}</span>`;
}

function renderLesson(lesson) {
  const number = lesson.Stunde || "";
  const time = lesson.Zeit || "";

  const daysHtml = weekdays
    .map((weekday) => {
      return `
        <div class="day">
          <span class="day-name">${shortWeekdays[weekday]}</span>
          ${subjectHtml(lesson[weekday])}
        </div>
      `;
    })
    .join("");

  return `
    <article class="lesson-card">
      <div class="lesson-header">
        <span class="lesson-number">
          ${escapeHtml(number)}. Stunde
        </span>
        <span class="lesson-time">${escapeHtml(time)}</span>
      </div>
      <div class="days">${daysHtml}</div>
    </article>
  `;
}

function renderPlan(plan) {
  const lessonsHtml = plan.lessons.length
    ? plan.lessons.map(renderLesson).join("")
    : `<div class="empty-state">Keine Stundenplandaten gefunden.</div>`;

  return `
    <article class="child-card">
      <h2 class="child-title">${escapeHtml(plan.name)}</h2>
      ${lessonsHtml}
    </article>
  `;
}

function setStatus(message, isError = false) {
  const status = document.querySelector("#status");

  status.textContent = message;
  status.classList.toggle("error", isError);
}

async function refreshPlans() {
  const plansContainer = document.querySelector("#plans");
  const lastUpdate = document.querySelector("#last-update");

  setStatus("Stundenpläne werden geladen …");
  plansContainer.innerHTML = "";

  try {
    const loadedPlans = await Promise.all(
      Object.entries(plans).map(([name, url]) => loadPlan(name, url))
    );

    plansContainer.innerHTML = loadedPlans.map(renderPlan).join("");

    const currentTime = new Date().toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit"
    });

    lastUpdate.textContent = `Aktualisiert um ${currentTime} Uhr`;
    setStatus("Alle Stundenpläne sind aktuell.");
  } catch (error) {
    console.error(error);

    setStatus(
      "Die Stundenpläne konnten nicht geladen werden. Prüfe, ob alle drei Tabs öffentlich veröffentlicht sind.",
      true
    );

    plansContainer.innerHTML = `
      <div class="empty-state">
        Bitte veröffentliche jeden Google-Sheets-Tab als CSV und prüfe die Links.
      </div>
    `;
  }
}

document
  .querySelector("#refresh-button")
  .addEventListener("click", refreshPlans);

refreshPlans();

/*
  Alle fünf Minuten aktualisieren.
*/
window.setInterval(refreshPlans, 5 * 60 * 1000);