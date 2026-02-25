const navBar = {
  getLinks: function () {
    // Get current path depth
    const path = window.location.pathname;
    // If in a subfolder (e.g., /golf/pages/results.html), use ../ for root links
    const isInPages = path.includes("/pages/");
    const indexLink = isInPages ? "../index.html" : "index.html";
    const eventsLink = isInPages
      ? "2026-events.html"
      : "pages/2026-events.html";
    return { indexLink, eventsLink };
  },
  insertNav: function () {
    document.addEventListener("DOMContentLoaded", () => {
      const { indexLink, eventsLink } = this.getLinks();
      const navContainer = document.getElementById("nav-container");
      if (navContainer) {
        navContainer.innerHTML = `
          <ul>
            <li>
              <a href="${indexLink}">Summer Signature Series</a>
            </li>
            <li>
              <a href="${eventsLink}">2026 Events</a>
            </li>
          </ul>
        `;
      }
    });
  },
};

navBar.insertNav();

const ScorecardManager = {
  fetchAndRenderScorecard: function () {
    fetch("../data/results.json")
      .then((response) => response.json())
      .then((data) => this.renderScorecard(data))
      .catch((error) => console.error("Error fetching scorecard data:", error));
  },

  renderScorecard: function (data) {
    const tables = {
      island: document.getElementById("scorecard-island"),
      ireland: document.getElementById("scorecard-ireland"),
      falcon: document.getElementById("scorecard-falcon"),
    };

    for (const [course, players] of Object.entries(data)) {
      const tbody = tables[course].querySelector("tbody");
      const parRow = tbody.querySelector("#par");
      const parValues = Array.from(parRow.querySelectorAll("td")).map((td) =>
        parseInt(td.textContent, 10),
      );
      const indexRow = tbody.querySelector("#hc");
      const indexValues = Array.from(indexRow.querySelectorAll("td")).map(
        (td) => parseInt(td.textContent, 10),
      );

      NetScoreManager.calculateNetScores(players, parValues, indexValues);
      StablefordManager.calculateStablefordPoints(players, parValues);

      players.forEach((player) => {
        const outTotal = player.outScores.reduce((a, b) => a + b, 0);
        const inTotal = player.inScores.reduce((a, b) => a + b, 0);
        const total = outTotal + inTotal;

        const row = document.createElement("tr");
        row.classList.add("player");

        const outScoresHtml = player.outScores
          .map((score, index) => {
            const par = parValues[index];
            const scoreClass = this.getScoreClass(score, par);
            return `<td class="${scoreClass}"><span>${score}</span></td>`;
          })
          .join("");

        const inScoresHtml = player.inScores
          .map((score, index) => {
            const par = parValues[index + 10]; // Offset by 10 for the "in" scores
            const scoreClass = this.getScoreClass(score, par);
            return `<td class="${scoreClass}"><span>${score}</span></td>`;
          })
          .join("");

        row.innerHTML = `
          <th>${player.name}</th>
          ${outScoresHtml}
          <td class="bold">${outTotal}</td>
          ${inScoresHtml}
          <td class="bold">${inTotal}</td>
          <td class="bold">${total}</td>
          <td class="bold">${player.netScores.reduce((a, b) => a + b, 0)}</td>
          <td class="bold">${player.stablefordPoints}</td>
        `;
        tbody.appendChild(row);
      });
    }
  },

  getScoreClass: function (score, par) {
    if (score === par - 1) {
      return "birdie";
    } else if (score <= par - 2) {
      return "eagle";
    } else if (score === par + 1) {
      return "bogey";
    } else if (score >= par + 2) {
      return "other";
    }
    return "";
  },
};

// To use the ScorecardManager
ScorecardManager.fetchAndRenderScorecard();

// Net Score Manager
const NetScoreManager = {
  calculateNetScores: function (players, parValues, indexValues) {
    players.forEach((player) => {
      player.netScores = player.outScores
        .concat(player.inScores)
        .map((score, i) => {
          const index = indexValues[i];
          // Calculate strokes based on handicap
          let strokes = Math.floor(player.handicap / 18);
          if (player.handicap % 18 >= index) {
            strokes += 1;
          }
          return score - strokes;
        });
    });
  },
};

// Stableford Manager
const StablefordManager = {
  calculateStablefordPoints: function (players, parValues) {
    players.forEach((player) => {
      player.stablefordPoints = player.netScores.reduce(
        (totalPoints, netScore, i) => {
          const par = parValues[i];
          let points = 0;
          if (netScore <= par - 3) {
            points = 5; // Albatross or better
          } else if (netScore === par - 2) {
            points = 4; // Eagle
          } else if (netScore === par - 1) {
            points = 3; // Birdie
          } else if (netScore === par) {
            points = 2; // Par
          } else if (netScore === par + 1) {
            points = 1; // Bogey
          }
          return totalPoints + points;
        },
        0,
      );
    });
  },
};

// Leaderboard Manager
const leaderBoardManager = {
  updateLeaderboard: function () {
    const table = document.getElementById("leaderboard-table");
    const rows = Array.from(table.querySelectorAll("tbody tr"));

    // Extract player data
    const players = rows.map((row) => {
      const cells = row.querySelectorAll("td");
      const points = Array.from(cells)
        .slice(2)
        .map((cell) => parseInt(cell.textContent) || 0);
      const totalPoints = points.reduce((acc, curr) => acc + curr, 0);
      return {
        row,
        name: cells[0].textContent,
        totalPoints,
      };
    });

    // Sort players by total points
    players.sort((a, b) => b.totalPoints - a.totalPoints);

    // Update position and total columns
    let currentPosition = 1;
    players.forEach((player, index) => {
      const previousPlayer = players[index - 1];
      if (index > 0 && player.totalPoints === previousPlayer.totalPoints) {
        player.position = `T${currentPosition}`;
      } else {
        currentPosition = index + 1;
        player.position = currentPosition;
      }
      player.row.querySelector("th").textContent = player.position;
      player.row.querySelector("td:nth-child(3)").textContent =
        player.totalPoints;
    });

    // Reorder rows in the table
    const tbody = table.querySelector("tbody");
    players.forEach((player) => tbody.appendChild(player.row));
  },
};

// Call this function whenever you update the points in the HTML
leaderBoardManager.updateLeaderboard();
