const navBar = {
  getLinks: function () {
    // Get current path depth
    const path = window.location.pathname;
    // If in a subfolder (e.g., /golf/pages/results.html), use ../ for root links
    const isInPages = path.includes("/pages/");
    const indexLink = isInPages ? "../index.html" : "index.html";
    const resultsLink = isInPages ? "results.html" : "pages/results.html";
    return { indexLink, resultsLink };
  },
  insertNav: function () {
    document.addEventListener("DOMContentLoaded", () => {
      const { indexLink, resultsLink } = this.getLinks();
      const navContainer = document.getElementById("nav-container");
      if (navContainer) {
        navContainer.innerHTML = `
          <ul>
            <li>
              <a href="${indexLink}">🌞</a>
            </li>
            <li>
              <a href="${resultsLink}">2025 Results</a>
            </li>
          </ul>
        `;
      }
    });
  },
};

navBar.insertNav();

let playerCount = 0;

const registration = {
  init: function () {
    const form = document.getElementById("handicapForm");
    if (form) {
      form.addEventListener("submit", this.addPlayer.bind(this));
    }
  },
  addPlayer: function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const handicap = document.getElementById("handicap").value;

    const playerList = document.getElementById("playerList");
    if (playerList) {
      const listItem = document.createElement("li");
      listItem.textContent = `${name}, ${handicap} handicap `;

      const removeButton = document.createElement("button");
      removeButton.textContent = "❌";
      removeButton.style.marginLeft = "10px";
      removeButton.addEventListener("click", () => {
        if (
          confirm(
            "Are you sure you want to remove this player from the SGE tournament?"
          )
        ) {
          playerList.removeChild(listItem);
          playerCount--;
          this.updatePrizeMoney();
        }
      });

      listItem.appendChild(removeButton);
      playerList.appendChild(listItem);

      playerCount++;
      this.updatePrizeMoney();

      // Clear the form fields
      const form = document.getElementById("handicapForm");
      if (form) {
        form.reset();
      }

      // Change the submit button text
      const submitButton = document.querySelector("button[type='submit']");
      if (submitButton) {
        submitButton.textContent = "Play well.";
        submitButton.disabled = true; // Disable the button after submission
        submitButton.style.backgroundColor = "#006747"; // Change color to green
        submitButton.style.color = "white"; // Change text color to white
        submitButton.style.fontWeight = "bold"; // Make text bold
        submitButton.style.cursor = "not-allowed"; // Change cursor to indicate it's disabled
        submitButton.style.border = "none"; // Remove border for a cleaner look
        submitButton.style.padding = "10px 20px"; // Add padding for better appearance
        submitButton.style.borderRadius = "4px"; // Add rounded corners
      }
    }
  },
  updatePrizeMoney: function () {
    const prizeElement = document.getElementById("prizeMoney");
    if (prizeElement) {
      prizeElement.textContent = "Total Purse: $" + playerCount * 50;
    }
  },
};

const prizeMoney = {
  // This object can be expanded with additional prize-related methods if needed
};

registration.init();

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
    };

    for (const [course, players] of Object.entries(data)) {
      const tbody = tables[course].querySelector("tbody");
      const parRow = tbody.querySelector("#par");
      const parValues = Array.from(parRow.querySelectorAll("td")).map((td) =>
        parseInt(td.textContent, 10)
      );

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
