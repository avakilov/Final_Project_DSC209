// main.js

let fullData = [];
let leaguesAll = [];
let colorScale;

// current filter state
let currentLeague = "All";
let currentTeam = "All";

const tooltip = d3.select("#tooltip");

// ----------------------------------------------------
// Load data
// ----------------------------------------------------
d3.csv("Teams.csv", d3.autoType).then(data => {
  // modern era + valid stats
  fullData = data.filter(d => d.yearID >= 1960 && d.G && d.R && d.W);

  fullData.forEach(d => {
    d.runsPerGame = d.R / d.G;
  });

  // league list + color scale
  leaguesAll = Array.from(new Set(fullData.map(d => d.lgID))).sort();
  colorScale = d3.scaleOrdinal()
    .domain(leaguesAll)
    .range(d3.schemeTableau10);

  setupLeagueFilter();
  setupTeamFilter(); // uses fullData
  setupScatterSlider();
  setupLineSlider();

  updateScatter();
  updateLine();
});

// ----------------------------------------------------
// Helper: current filtered base (by league only)
// ----------------------------------------------------
function getLeagueFilteredData() {
  if (currentLeague === "All") return fullData;
  return fullData.filter(d => d.lgID === currentLeague);
}

// ----------------------------------------------------
// League & Team filters
// ----------------------------------------------------
function setupLeagueFilter() {
  const select = document.getElementById("leagueFilter");

  leaguesAll.forEach(lg => {
    const opt = document.createElement("option");
    opt.value = lg;
    opt.textContent = lg;
    select.appendChild(opt);
  });

  select.onchange = () => {
    currentLeague = select.value;
    // when league changes, rebuild team list and update charts
    setupTeamFilter();
    updateScatter();
    updateLine();
  };
}

function setupTeamFilter() {
  const select = document.getElementById("teamFilter");
  const base = getLeagueFilteredData();

  // unique team names
  const teams = Array.from(new Set(base.map(d => d.name))).sort();

  // clear existing options
  select.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "All";
  optAll.textContent = "All teams";
  select.appendChild(optAll);

  teams.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    select.appendChild(opt);
  });

  currentTeam = "All";
  select.onchange = () => {
    currentTeam = select.value;
    updateScatter();
    updateLine();
  };
}

// ----------------------------------------------------
// Sliders
// ----------------------------------------------------
function setupScatterSlider() {
  const minYear = d3.min(fullData, d => d.yearID);
  const maxYear = d3.max(fullData, d => d.yearID);

  const minInput = document.getElementById("scatterYearMin");
  const maxInput = document.getElementById("scatterYearMax");

  minInput.min = minYear;
  minInput.max = maxYear;
  maxInput.min = minYear;
  maxInput.max = maxYear;
  minInput.value = minYear;
  maxInput.value = maxYear;

  minInput.oninput = updateScatter;
  maxInput.oninput = updateScatter;
}

function setupLineSlider() {
  const minYear = d3.min(fullData, d => d.yearID);
  const maxYear = d3.max(fullData, d => d.yearID);

  const minInput = document.getElementById("lineYearMin");
  const maxInput = document.getElementById("lineYearMax");

  minInput.min = minYear;
  minInput.max = maxYear;
  maxInput.min = minYear;
  maxInput.max = maxYear;
  minInput.value = minYear;
  maxInput.value = maxYear;

  minInput.oninput = updateLine;
  maxInput.oninput = updateLine;
}

// ----------------------------------------------------
// Scatter plot
// ----------------------------------------------------
function updateScatter() {
  const minY = +document.getElementById("scatterYearMin").value;
  const maxY = +document.getElementById("scatterYearMax").value;
  document.getElementById("scatterYearLabel").textContent = `${minY} – ${maxY}`;

  const base = getLeagueFilteredData();
  const subset = base.filter(d => d.yearID >= minY && d.yearID <= maxY);

  d3.select("#scatterplot").selectAll("*").remove();
  drawScatter(subset);
}

function drawScatter(data) {
  const svg = d3.select("#scatterplot");
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  const margin = { top: 30, right: 140, bottom: 50, left: 60 };

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg.append("g")
               .attr("transform", `translate(${margin.left},${margin.top})`);

  if (!data.length) return;

  const x = d3.scaleLinear()
              .domain(d3.extent(data, d => d.runsPerGame)).nice()
              .range([0, innerWidth]);

  const y = d3.scaleLinear()
              .domain(d3.extent(data, d => d.W)).nice()
              .range([innerHeight, 0]);

  // axes
  g.append("g")
   .attr("transform", `translate(0,${innerHeight})`)
   .call(d3.axisBottom(x));

  g.append("g").call(d3.axisLeft(y));

  // axis labels
  g.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .text("Runs per Game");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Wins");

  // points
  const circles = g.selectAll("circle.point")
    .data(data, d => d.teamID + "-" + d.yearID)
    .join("circle")
    .attr("class", "point")
    .attr("cx", d => x(d.runsPerGame))
    .attr("cy", d => y(d.W))
    .attr("r", d => currentTeam !== "All" && d.name === currentTeam ? 6 : 4)
    .attr("fill", d => colorScale(d.lgID))
    .attr("stroke", d => currentTeam !== "All" && d.name === currentTeam ? "#000" : "none")
    .attr("opacity", 0);

  circles.transition()
    .duration(500)
    .attr("opacity", d => currentTeam !== "All" && d.name === currentTeam ? 1 : 0.8);

  circles
    .on("mouseover", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.name}</strong><br/>
           Year: ${d.yearID}<br/>
           League: ${d.lgID}<br/>
           Wins: ${d.W}<br/>
           Runs/Game: ${d.runsPerGame.toFixed(2)}`
        );
    })
    .on("mousemove", event => {
      tooltip
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

  // Color legend (leagues)
  const legend = g.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${innerWidth + 20}, 10)`);

  legend.append("text")
    .text("League")
    .attr("font-weight", "600")
    .attr("y", 0);

  leaguesAll.forEach((lg, i) => {
    const row = legend.append("g")
      .attr("transform", `translate(0, ${15 + i * 18})`);

    row.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", colorScale(lg));

    row.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .text(lg);
  });

  if (currentTeam !== "All") {
    legend.append("text")
      .attr("y", 15 + leaguesAll.length * 18 + 10)
      .attr("font-weight", "600")
      .text("Highlighted team:");
    legend.append("text")
      .attr("y", 15 + leaguesAll.length * 18 + 26)
      .text(currentTeam)
      .call(t => t.append("title").text(currentTeam));
  }
}

// ----------------------------------------------------
// Line chart
// ----------------------------------------------------
function updateLine() {
  const minY = +document.getElementById("lineYearMin").value;
  const maxY = +document.getElementById("lineYearMax").value;
  document.getElementById("lineYearLabel").textContent = `${minY} – ${maxY}`;

  const base = getLeagueFilteredData();
  const subset = base.filter(d => d.yearID >= minY && d.yearID <= maxY);

  d3.select("#linechart").selectAll("*").remove();
  drawLine(subset);
}

function drawLine(data) {
  const svg = d3.select("#linechart");
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  const margin = { top: 30, right: 40, bottom: 50, left: 60 };

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg.append("g")
               .attr("transform", `translate(${margin.left},${margin.top})`);

  if (!data.length) return;

  // League-average per year
  const byYear = d3.rollup(
    data,
    v => d3.mean(v, d => d.runsPerGame),
    d => d.yearID
  );

  const leagueSeries = Array.from(byYear, ([year, rpg]) => ({
    year: +year,
    rpg
  })).sort((a, b) => a.year - b.year);

  const allYears = leagueSeries.map(d => d.year);
  const allRpg = leagueSeries.map(d => d.rpg);

  let teamSeries = [];
  if (currentTeam !== "All") {
    const teamData = data.filter(d => d.name === currentTeam);
    const teamByYear = d3.rollup(
      teamData,
      v => d3.mean(v, d => d.runsPerGame),
      d => d.yearID
    );
    teamSeries = Array.from(teamByYear, ([year, rpg]) => ({
      year: +year,
      rpg
    })).sort((a, b) => a.year - b.year);

    teamSeries.forEach(d => {
      allYears.push(d.year);
      allRpg.push(d.rpg);
    });
  }

  const x = d3.scaleLinear()
              .domain(d3.extent(allYears))
              .range([0, innerWidth]);

  const y = d3.scaleLinear()
              .domain(d3.extent(allRpg)).nice()
              .range([innerHeight, 0]);

  g.append("g")
   .attr("transform", `translate(0,${innerHeight})`)
   .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  g.append("g").call(d3.axisLeft(y));

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .text("Year");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Avg Runs per Game");

  const lineGen = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.rpg));

  // League line
  const leaguePath = g.append("path")
    .datum(leagueSeries)
    .attr("fill", "none")
    .attr("stroke", "#1f77b4")
    .attr("stroke-width", 2)
    .attr("d", lineGen);

  // animate league line draw
  const totalLength = leaguePath.node().getTotalLength();
  leaguePath
    .attr("stroke-dasharray", totalLength + " " + totalLength)
    .attr("stroke-dashoffset", totalLength)
    .transition()
    .duration(800)
    .attr("stroke-dashoffset", 0);

  // League points
  g.selectAll("circle.league-point")
    .data(leagueSeries)
    .join("circle")
    .attr("class", "league-point")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.rpg))
    .attr("r", 3)
    .attr("fill", "#1f77b4")
    .on("mouseover", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(`Year: ${d.year}<br/>League avg runs/game: ${d.rpg.toFixed(2)}`);
    })
    .on("mousemove", event => {
      tooltip
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

  // Team line, if selected
  if (teamSeries.length) {
    const teamPath = g.append("path")
      .datum(teamSeries)
      .attr("fill", "none")
      .attr("stroke", "#e53935")
      .attr("stroke-width", 2)
      .attr("d", lineGen);

    const lenTeam = teamPath.node().getTotalLength();
    teamPath
      .attr("stroke-dasharray", lenTeam + " " + lenTeam)
      .attr("stroke-dashoffset", lenTeam)
      .transition()
      .duration(800)
      .attr("stroke-dashoffset", 0);

    g.selectAll("circle.team-point")
      .data(teamSeries)
      .join("circle")
      .attr("class", "team-point")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.rpg))
      .attr("r", 3.5)
      .attr("fill", "#e53935")
      .on("mouseover", (event, d) => {
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${currentTeam}</strong><br/>
             Year: ${d.year}<br/>
             Runs/game: ${d.rpg.toFixed(2)}`
          );
      })
      .on("mousemove", event => {
        tooltip
          .style("left", event.pageX + 12 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0));
  }
}
