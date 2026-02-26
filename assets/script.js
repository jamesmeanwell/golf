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

// Leaderboard Manager
const leaderBoardManager = {
  updateLeaderboard: function () {
    const table = document.getElementById("leaderboard-table");

    // Check if the table exists
    if (!table) {
      return; // Exit the function if the table is not found
    }

    const rows = Array.from(table.querySelectorAll("tbody tr"));

    // Extract player data
    const players = rows.map((row) => {
      const cells = row.querySelectorAll("td");
      const points = Array.from(cells)
        .slice(2)
        .map((cell) => parseInt(cell.textContent) || 0);

      // Sort points in descending order and take the top 4
      const sortedPoints = [...points].sort((a, b) => b - a);
      const topFourPoints = sortedPoints.slice(0, 4);
      const totalPoints = topFourPoints.reduce((acc, curr) => acc + curr, 0);

      // Apply strikethrough to the two lowest scores if there are six scores
      if (points.length === 6) {
        const lowestTwo = sortedPoints.slice(-2);
        let strikeCount = 0;
        cells.forEach((cell, index) => {
          const cellValue = parseInt(cell.textContent);
          if (lowestTwo.includes(cellValue) && strikeCount < 2) {
            cell.style.textDecoration = "line-through";
            strikeCount++;
          } else {
            cell.style.textDecoration = "none";
          }
        });
      }

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
    let lastScore = null;
    let lastPosition = 1;
    const positionCount = {};

    players.forEach((player, index) => {
      if (index > 0 && player.totalPoints === lastScore) {
        player.position = lastPosition;
      } else {
        currentPosition = index + 1;
        player.position = currentPosition;
        lastPosition = currentPosition;
      }
      lastScore = player.totalPoints;
      // Count occurrences of each position
      positionCount[player.position] =
        (positionCount[player.position] || 0) + 1;
    });

    players.forEach((player) => {
      // Add "T" if the position occurs more than once
      const positionText =
        positionCount[player.position] > 1
          ? `T${player.position}`
          : player.position;
      player.row.querySelector("th").textContent = positionText;
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

// Constants for score classes
const SCORE_CLASSES = {
  BIRDIE: "birdie",
  EAGLE: "eagle",
  BOGEY: "bogey",
  DOUBLE_BOGEY: "double-bogey",
  ONE_STROKE: "one-stroke",
  TWO_STROKES: "two-strokes",
};

// Constants for Stableford points
const STABLEFORD_POINTS = {
  ALBATROSS: 5,
  EAGLE: 4,
  BIRDIE: 3,
  PAR: 2,
  BOGEY: 1,
};

// Constants for course data
const COURSE_OFFSETS = {
  IN_SCORES: 9,
};

// Ensure the table is present before fetching/rendering
document.addEventListener("DOMContentLoaded", () => {
  ScorecardManager.fetchAndRenderScorecard();
});

// Scorecard Manager
const ScorecardManager = {
  fetchAndRenderScorecard: function () {
    fetch("../data/results.json")
      .then((response) => response.json())
      .then((data) => this.renderScorecard(data.courses))
      .catch((error) => console.error("Error fetching scorecard data:", error));
  },

  renderScorecard: function (courses) {
    const tables = {
      falcon2026: document.getElementById("scorecard-falcon-2026"),
      lachute1T2026: document.getElementById("scorecard-lachute-t-2026"),
      lachute2W2026: document.getElementById("scorecard-lachute-w-2026"),
      gm2026: document.getElementById("scorecard-gm-2026"),
      cgimIsl2026: document.getElementById("scorecard-cgim-isl-2026"),
      cgimIre2026: document.getElementById("scorecard-cgim-ire-2026"),
      // Add other courses as needed
    };

    for (const [courseName, courseData] of Object.entries(courses)) {
      const tbody = tables[courseName].querySelector("tbody");

      // Compute nets (and stableford) for every player
      NetScoreManager.calculateNetScores(
        courseData.players,
        courseData.parValues,
        courseData.indexValues,
      );
      StablefordManager.calculateStablefordPoints(
        courseData.players,
        courseData.parValues,
      );

      courseData.players.forEach((player) => {
        const outTotal = player.outScores.reduce((a, b) => a + b, 0);
        const inTotal = player.inScores.reduce((a, b) => a + b, 0);
        const total = outTotal + inTotal;

        const row = document.createElement("tr");
        row.classList.add("player");

        const outScoresHtml = this.generateScoresHtml(
          player.outScores,
          courseData.parValues,
          0,
          player.strokeClasses,
        );
        const inScoresHtml = this.generateScoresHtml(
          player.inScores,
          courseData.parValues,
          COURSE_OFFSETS.IN_SCORES,
          player.strokeClasses,
        );

        row.innerHTML = `
          <th>${player.name}</th>
          ${outScoresHtml}
          <td class="bold">${outTotal}</td>
          ${inScoresHtml}
          <td class="bold">${inTotal}</td>
          <td class="bold">${total}</td>
          <td class="net">${player.netScores.reduce((a, b) => a + b, 0)}</td>
          <td class="bold stableford">${player.stablefordPoints}</td>
        `;
        tbody.appendChild(row);
      });
    }
  },

  generateScoresHtml: function (
    scores,
    parValues,
    offset = 0,
    strokeClasses = [],
  ) {
    return scores
      .map((score, index) => {
        const par = parValues[index + offset];
        const scoreClass = this.getScoreClass(score, par);
        const strokeClass = strokeClasses[index + offset] || "";
        return `<td class="${scoreClass} ${strokeClass}"><span>${score}</span></td>`;
      })
      .join("");
  },

  getScoreClass: function (score, par) {
    if (score === par - 1) {
      return SCORE_CLASSES.BIRDIE;
    } else if (score <= par - 2) {
      return SCORE_CLASSES.EAGLE;
    } else if (score === par + 1) {
      return SCORE_CLASSES.BOGEY;
    } else if (score >= par + 2) {
      return SCORE_CLASSES.DOUBLE_BOGEY;
    }
    return "";
  },
};

const NetScoreManager = {
  calculateNetScores: function (players, parValues, indexValues) {
    players.forEach((player) => {
      player.netScores = player.outScores
        .concat(player.inScores)
        .map((score, i) => {
          const index = indexValues[i];
          let strokes = Math.floor(player.handicap / 18);
          if (player.handicap % 18 >= index) {
            strokes += 1;
          }
          player.strokeClasses = player.strokeClasses || [];
          player.strokeClasses[i] = this.getStrokeClass(strokes);
          return score - strokes;
        });
    });
  },

  getStrokeClass: function (strokes) {
    if (strokes === 1) {
      return SCORE_CLASSES.ONE_STROKE;
    } else if (strokes === 2) {
      return SCORE_CLASSES.TWO_STROKES;
    }
    return "";
  },
};

const StablefordManager = {
  calculateStablefordPoints: function (players, parValues) {
    players.forEach((player) => {
      player.stablefordPoints = player.netScores.reduce(
        (totalPoints, netScore, i) => {
          const par = parValues[i];
          let points = 0;
          if (netScore <= par - 3) {
            points = STABLEFORD_POINTS.ALBATROSS;
          } else if (netScore === par - 2) {
            points = STABLEFORD_POINTS.EAGLE;
          } else if (netScore === par - 1) {
            points = STABLEFORD_POINTS.BIRDIE;
          } else if (netScore === par) {
            points = STABLEFORD_POINTS.PAR;
          } else if (netScore === par + 1) {
            points = STABLEFORD_POINTS.BOGEY;
          }
          return totalPoints + points;
        },
        0,
      );
    });
  },
};

// Select event results
document.addEventListener("DOMContentLoaded", function () {
  const sections = {
    "event-1": document.getElementById("event-1"),
    "event-2": document.getElementById("event-2"),
    "event-3": document.getElementById("event-3"),
    "event-4": document.getElementById("event-4"),
  };

  const selector = document.getElementById("sectionSelector");

  // Function to show the selected section
  function showSection(selectedId) {
    for (let id in sections) {
      sections[id].style.display = id === selectedId ? "block" : "none";
    }
  }

  // Set default visible section
  showSection("event-1");
  sectionSelector.value = "event-1";

  // Event listener for dropdown change
  selector.addEventListener("change", function () {
    showSection(this.value);
  });
});
