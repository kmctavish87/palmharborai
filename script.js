// Update the footer year automatically so the site stays current.
document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  initPinellasHousingTool();
});

const PINELLAS_YEARS = Array.from({ length: 11 }, (_, index) => 2015 + index);

const PINELLAS_FALLBACK_ZIP_CONFIG = {
  "33701": {
    area: "Downtown St. Petersburg",
    basePrice: 328000,
    priceGrowth: 0.078,
    baseSales: 186,
    salesTrend: 0.004,
    priceWave: 11000,
    salesWave: 16,
  },
  "33703": {
    area: "Northeast St. Petersburg",
    basePrice: 294000,
    priceGrowth: 0.074,
    baseSales: 352,
    salesTrend: 0.003,
    priceWave: 9500,
    salesWave: 24,
  },
  "33704": {
    area: "Old Northeast",
    basePrice: 415000,
    priceGrowth: 0.071,
    baseSales: 141,
    salesTrend: 0.002,
    priceWave: 14000,
    salesWave: 11,
  },
  "33705": {
    area: "South St. Petersburg",
    basePrice: 189000,
    priceGrowth: 0.082,
    baseSales: 304,
    salesTrend: 0.007,
    priceWave: 8700,
    salesWave: 22,
  },
  "33710": {
    area: "Jungle Terrace and Tyrone",
    basePrice: 246000,
    priceGrowth: 0.073,
    baseSales: 398,
    salesTrend: 0.001,
    priceWave: 9200,
    salesWave: 25,
  },
  "33713": {
    area: "Central St. Petersburg",
    basePrice: 205000,
    priceGrowth: 0.079,
    baseSales: 322,
    salesTrend: 0.006,
    priceWave: 9100,
    salesWave: 19,
  },
  "33755": {
    area: "Clearwater",
    basePrice: 214000,
    priceGrowth: 0.075,
    baseSales: 336,
    salesTrend: 0.004,
    priceWave: 8800,
    salesWave: 18,
  },
  "33756": {
    area: "Belleair and Clearwater South",
    basePrice: 238000,
    priceGrowth: 0.072,
    baseSales: 277,
    salesTrend: 0.002,
    priceWave: 8200,
    salesWave: 17,
  },
  "33761": {
    area: "Countryside",
    basePrice: 267000,
    priceGrowth: 0.069,
    baseSales: 285,
    salesTrend: 0.001,
    priceWave: 7900,
    salesWave: 15,
  },
  "33764": {
    area: "Mid-County Clearwater",
    basePrice: 229000,
    priceGrowth: 0.074,
    baseSales: 301,
    salesTrend: 0.003,
    priceWave: 8600,
    salesWave: 20,
  },
  "33771": {
    area: "Largo",
    basePrice: 221000,
    priceGrowth: 0.076,
    baseSales: 364,
    salesTrend: 0.003,
    priceWave: 8300,
    salesWave: 21,
  },
  "34698": {
    area: "Dunedin",
    basePrice: 256000,
    priceGrowth: 0.077,
    baseSales: 244,
    salesTrend: 0.002,
    priceWave: 9800,
    salesWave: 14,
  },
};

function buildPinellasHistory(zipCode, config) {
  return PINELLAS_YEARS.map((year, index) => {
    const priceDrift = Math.sin(index * 0.9 + zipCode.length) * config.priceWave;
    const salesDrift = Math.cos(index * 0.85 + Number(zipCode.slice(-1))) * config.salesWave;

    const averagePrice = Math.round(
      config.basePrice * Math.pow(1 + config.priceGrowth, index) + priceDrift
    );

    const homeSales = Math.max(
      48,
      Math.round(config.baseSales * (1 + config.salesTrend * index) + salesDrift)
    );

    return {
      year,
      averagePrice,
      homeSales,
    };
  });
}

const PINELLAS_FALLBACK_HOUSING_DATA = Object.fromEntries(
  Object.entries(PINELLAS_FALLBACK_ZIP_CONFIG).map(([zipCode, config]) => [
    zipCode,
    {
      area: config.area,
      history: buildPinellasHistory(zipCode, config),
    },
  ])
);

function initPinellasHousingTool() {
  const toolRoot = document.getElementById("pinellasHousingTool");

  if (!toolRoot || typeof Chart === "undefined") {
    return;
  }

  const housingData = window.PINELLAS_HOUSING_DATA || PINELLAS_FALLBACK_HOUSING_DATA;

  const zipToggleGroup = document.getElementById("zipToggleGroup");
  const selectedZipLabel = document.getElementById("selectedZipLabel");
  const selectedZipArea = document.getElementById("selectedZipArea");
  const latestAveragePrice = document.getElementById("latestAveragePrice");
  const priceGrowthLabel = document.getElementById("priceGrowthLabel");
  const latestSalesCount = document.getElementById("latestSalesCount");
  const salesChangeLabel = document.getElementById("salesChangeLabel");
  const historyTableBody = document.getElementById("historyTableBody");

  const availableZips = Object.keys(housingData);
  let activeZip = availableZips[0];

  availableZips.forEach((zipCode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "zip-toggle";
    button.textContent = zipCode;
    button.setAttribute("role", "tab");
    button.addEventListener("click", () => {
      activeZip = zipCode;
      updateDashboard();
    });
    zipToggleGroup.appendChild(button);
  });

  const priceChart = new Chart(document.getElementById("priceHistoryChart"), {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          borderColor: "#ff8a3d",
          backgroundColor: "rgba(255, 138, 61, 0.18)",
          fill: true,
          tension: 0.34,
          borderWidth: 3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    },
    options: createChartOptions("Currency"),
  });

  const salesChart = new Chart(document.getElementById("salesHistoryChart"), {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          borderColor: "#4878ff",
          backgroundColor: "rgba(72, 120, 255, 0.18)",
          fill: true,
          tension: 0.34,
          borderWidth: 3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    },
    options: createChartOptions("Count"),
  });

  function updateDashboard() {
    const currentData = housingData[activeZip];
    const firstYear = currentData.history[0];
    const latestYear = currentData.history[currentData.history.length - 1];

    selectedZipLabel.textContent = activeZip;
    selectedZipArea.textContent = currentData.area;
    latestAveragePrice.textContent = formatCurrency(latestYear.averagePrice);
    latestSalesCount.textContent = formatNumber(latestYear.homeSales);
    priceGrowthLabel.textContent = `Since 2015: ${formatPercentChange(
      firstYear.averagePrice,
      latestYear.averagePrice
    )}`;
    salesChangeLabel.textContent = `Since 2015: ${formatPercentChange(
      firstYear.homeSales,
      latestYear.homeSales
    )}`;

    Array.from(zipToggleGroup.children).forEach((button) => {
      const isActive = button.textContent === activeZip;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    const labels = currentData.history.map((entry) => String(entry.year));

    priceChart.data.labels = labels;
    priceChart.data.datasets[0].data = currentData.history.map((entry) => entry.averagePrice);
    priceChart.update();

    salesChart.data.labels = labels;
    salesChart.data.datasets[0].data = currentData.history.map((entry) => entry.homeSales);
    salesChart.update();

    historyTableBody.innerHTML = currentData.history
      .map(
        (entry) => `
          <tr>
            <td>${entry.year}</td>
            <td>${formatCurrency(entry.averagePrice)}</td>
            <td>${formatNumber(entry.homeSales)}</td>
          </tr>
        `
      )
      .join("");
  }

  updateDashboard();
}

function createChartOptions(valueType) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        displayColors: false,
        callbacks: {
          label(context) {
            return valueType === "Currency"
              ? formatCurrency(context.raw)
              : `${formatNumber(context.raw)} sales`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#5f6175",
        },
      },
      y: {
        beginAtZero: false,
        ticks: {
          color: "#5f6175",
          callback(value) {
            return valueType === "Currency"
              ? formatCompactCurrency(value)
              : formatNumber(value);
          },
        },
        grid: {
          color: "rgba(29, 33, 68, 0.08)",
        },
      },
    },
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercentChange(start, end) {
  const change = ((end - start) / start) * 100;
  const rounded = Math.round(change);

  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}
