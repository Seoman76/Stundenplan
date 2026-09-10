"use strict";

/* ==========================================
   Familien-Stundenplan
   Version 2.0
========================================== */

const plans = {
  Jojo: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR-195auLVcne0kWg1Q5tDhvXXpLeAUDtw_IHix1D_TyaJfSXHBdV6PZZ8DkHK6h_PqvWRtj7A5Vuf/pub?gid=0&single=true&output=csv",

  Jooris: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR-195auLVcne0kWg1Q5tDhvXXpLeAUDtw_IHix1D_TyaJfSXHBdV6PZZ8DkHK6h_PqvWRtj7A5Vuf/pub?gid=1017612760&single=true&output=csv",

  Jule: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR-195auLVcne0kWg1Q5tDhvXXpLeAUDtw_IHix1D_TyaJfSXHBdV6PZZ8DkHK6h_PqvWRtj7A5Vuf/pub?gid=175444478&single=true&output=csv"
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

/* ==========================================
   CSV Parser
========================================== */

function parseCSV(text) {

  const lines = text.trim().split(/\r?\n/);

  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split(",");

  return lines.slice(1).map(line => {

    const values = line.split(",");

    const row = {};

    headers.forEach((header, index) => {

      row[header.trim()] = (values[index] || "").trim();

    });

    return row;

  });

}

function escapeHtml(text) {

  return String(text ?? "").replace(/[&<>"']/g, function(char){

    return {
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;",
      "'":"&#39;"
    }[char];

  });

}

async function loadPlan(name, url){

  const response = await fetch(url,{
    cache:"no-store"
  });

  if(!response.ok){

    throw new Error(name + " konnte nicht geladen werden.");

  }

  const csv = await response.text();

  return {

    name:name,
    lessons:parseCSV(csv)

  };

}
/* ==========================================
   Darstellung
========================================== */

function subjectHtml(subject){

  const value = String(subject || "").trim();

  return `
    <span class="${value ? "subject" : "subject empty"}">
      ${escapeHtml(value || "—")}
    </span>
  `;

}

function renderLesson(lesson){

  let days = "";

  weekdays.forEach(day => {

    days += `
      <div class="day">
        <span class="day-name">${shortWeekdays[day]}</span>
        ${subjectHtml(lesson[day])}
      </div>
    `;

  });

  return `
    <article class="lesson-card">

      <div class="lesson-header">

        <span class="lesson-number">
          ${escapeHtml(lesson.Stunde)}. Stunde
        </span>

        <span class="lesson-time">
          ${escapeHtml(lesson.Zeit)}
        </span>

      </div>

      <div class="days">

        ${days}

      </div>

    </article>
  `;

}

function renderPlan(plan){

  let html = "";

  plan.lessons.forEach(lesson=>{

    html += renderLesson(lesson);

  });

  return `

    <article class="child-card">

      <h2 class="child-title">
        ${escapeHtml(plan.name)}
      </h2>

      ${html}

    </article>

  `;

}
/* ==========================================
   Aktualisierung
========================================== */

function setStatus(message, error = false){

    const status = document.getElementById("status");

    status.textContent = message;

    status.classList.toggle("error", error);

}

async function refreshPlans(){

    const container = document.getElementById("plans");

    const lastUpdate = document.getElementById("last-update");

    setStatus("Stundenpläne werden geladen ...");

    container.innerHTML = "";

    try{

        const loaded = await Promise.all(

            Object.entries(plans).map(

                ([name,url]) => loadPlan(name,url)

            )

        );

        loaded.forEach(plan=>{

            container.innerHTML += renderPlan(plan);

        });

        lastUpdate.textContent =
            "Aktualisiert um " +
            new Date().toLocaleTimeString("de-DE",{
                hour:"2-digit",
                minute:"2-digit"
            }) +
            " Uhr";

        setStatus("Alle Stundenpläne erfolgreich geladen.");

    }

    catch(error){

        console.error(error);

        setStatus(error.message,true);

        container.innerHTML = `

            <div class="empty-state">

                Fehler beim Laden der Stundenpläne.

                <br><br>

                Bitte prüfe die Google-Sheets-Freigabe.

            </div>

        `;

    }

}

/* ==========================================
   Start
========================================== */

document

    .getElementById("refresh-button")

    .addEventListener(

        "click",

        refreshPlans

    );

refreshPlans();

setInterval(

    refreshPlans,

    300000

);
