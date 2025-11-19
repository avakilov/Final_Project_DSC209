// main.js
// Uses Teams.csv in the same folder

// Tooltip (shared by both charts)
const tooltip = d3.select("#tooltip");

// Load data and then draw charts
d3.csv("Teams.csv", d3.autoType).then(data => {
  // Filter to modern era (you can change this)
  const filtered = data.filter(d => d.yearID >= 1960 && d.G && d.R && d.W);

  // Add derived field: runs per game
  filtered.forEach(d => {
    d.runsPerGame = d.R / d.G;
  });

  drawScatter(filtered);
  drawLine(filtered);
});

function drawScatter(data) {
  const svg = d3.select("#scatterplot");
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  const margin = { top: 30, right: 30, bottom: 50, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.runsPerGame))
    .nice()
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain(d3.extent(data, d => d.W))
    .nice()
    .range([innerHeight, 0]);

  const leagues = Array.from(new Set(data.map(d => d.lgID)));
  const color = d3.scaleOrdinal()
    .domain(leagues)
    .range(d3.schemeTableau10);

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .call(d3.axisLeft(y));

  // Axis labels
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

  // Points
  g.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => x(d.runsPerGame))
    .attr("cy", d => y(d.W))
    .attr("r", 4)
    .attr("fill", d => color(d.lgID))
    .attr("opacity", 0.8)
    .on("mouseover", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.name}</strong><br/>
           Year: ${d.yearID}<br/>
           League: ${d.lgID}<br/>
           Wins: ${d.W}<br/>
           Runs per game: ${d.runsPerGame.toFixed(2)}`
        );
    })
    .on("mousemove", event => {
      tooltip
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });
}

function drawLine(data) {
  const svg = d3.select("#linechart");
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  const margin = { top: 30, right: 30, bottom: 50, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Aggregate: average runs per game by year
  const byYearMap = d3.rollup(
    data,
    v => d3.mean(v, d => d.runsPerGame),
    d => d.yearID
  );

  const lineData = Array.from(byYearMap, ([year, rpg]) => ({
    year: +year,
    runsPerGame: rpg
  })).sort((a, b) => a.year - b.year);

  // Scales
  const x = d3.scaleLinear()
    .domain(d3.extent(lineData, d => d.year))
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain(d3.extent(lineData, d => d.runsPerGame))
    .nice()
    .range([innerHeight, 0]);

  // Axes
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  g.append("g")
    .call(d3.axisLeft(y));

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
    .text("Average Runs per Game");

  // Line
  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.runsPerGame));

  g.append("path")
    .datum(lineData)
    .attr("fill", "none")
    .attr("stroke", "#1f77b4")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Points on the line for tooltip
  g.selectAll("circle")
    .data(lineData)
    .join("circle")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.runsPerGame))
    .attr("r", 3)
    .attr("fill", "#1f77b4")
    .on("mouseover", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `Year: ${d.year}<br/>
           Avg runs per game: ${d.runsPerGame.toFixed(2)}`
        );
    })
    .on("mousemove", event => {
      tooltip
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });
}
