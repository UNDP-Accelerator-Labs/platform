import { getCurrentLanguage } from '/js/config/main.js';

let chart,
  allData,    
  rendered = false;

function onLoad() {
  setupPage();
  fetchData();
}

function setupPage() {
  const metricsContainer = d3.select('#metrics');

  // Create filter container
  metricsContainer
    .append('div')
    .attr('id', 'year-filter')
    .classed('filter', true);

  // Create canvas for chart
  metricsContainer
    .append('canvas')
    .attr('id', 'user-chart')
    .attr('width', 800)
    .attr('height', 400);
}

function fetchData(year) {
  const url = `/apis/fetch/user-metrics?year=${year || null}`;

  fetch(url)
    .then((response) => response.json())
    .then((results) => {
      const { data, years } = results;

      // Convert period strings to labels
      const labels = data.map((d) => d.period.trim());
      const ssoData = data.map((d) => +d.sso_count);
      const nonSsoData = data.map((d) => +d.non_sso_count);

      renderChart(labels, ssoData, nonSsoData, year);

      allData = results;

      if (!rendered) {
        populateYears(years);
        rendered = true;
      }

      displayTotalCounts(ssoData, nonSsoData);
    });
}

function populateYears(years) {
  const filterContainer = d3.select('#year-filter');

  filterContainer.append('label').attr('for', 'year').text('Year: ');

  // Create select dropdown
  const yearSelect = filterContainer.append('select').attr('id', 'year');

  yearSelect.append('option').attr('value', '').text('All Years');
  yearSelect
    .selectAll('option.year')
    .data(years)
    .enter()
    .append('option')
    .attr('class', 'year')
    .attr('value', (d) => d.year)
    .text((d) => d.year);

  yearSelect.on('change', function () {
    const year = d3.select(this).property('value');
    fetchData(year);
  });
}

function displayTotalCounts(ssoData, nonSsoData) {
  const totalSso = d3.sum(ssoData);
  const totalNonSso = d3.sum(nonSsoData);
  const totalCounts = totalSso + totalNonSso;
  d3.select('#metrics-count').text(`${totalCounts}`)
}

async function renderChart(labels, ssoData, nonSsoData, year) {
  const ctx = document.getElementById('user-chart').getContext('2d');
  const language = await getCurrentLanguage();

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'SSO Registrations',
          data: ssoData,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: false,
          tension: 0.4,
        },
        {
          label: 'Non-SSO Registrations',
          data: nonSsoData,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: false,
          tension: 0.4,
        },
      ],
    },
    options: {
      plugins: {
        filler: {
          propagate: false,
        },
        title: {
          display: true,
          text: year
            ? `User Registrations for ${year}`
            : 'User Registrations by Year',
        },
      },
      interaction: {
        intersect: false,
      },
      scales: {
        x: {
          title: {
            display: true,
            text: year ? 'Months' : 'Years',
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Registrations',
          },
        },
      },
      onClick: (e) => {
        const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);

        if (points.length) {
          const point = points[0];
          const datasetIndex = point.datasetIndex;
          const index = point.index;
          const value = chart.data.datasets[datasetIndex].data[index];
          const month = chart.data.labels[index];
          const isSsoUser = datasetIndex === 0; // 0 for SSO Registrations, 1 for Non-SSO Registrations
          if (value !== 0) {
            const url = `/${language}/browse/contributors/invited?year=${year}&month=${month}&sso_user=${isSsoUser}`;
            window.location.href = url;
          }
        }
      },
    },
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onLoad);
} else {
  onLoad();
}
