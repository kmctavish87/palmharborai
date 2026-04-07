document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  initPinellasHousingTool();
});

function initPinellasHousingTool() {
  const toolRoot = document.getElementById("pinellasHousingTool");
  const source = normalizeHousingSource(window.PINELLAS_HOUSING_DATA);

  if (!toolRoot || typeof Chart === "undefined" || !source || !source.zips) {
    return;
  }

  const zipOrder = source.zipOrder || Object.keys(source.zips).sort();
  const zips = source.zips;
  const selectedZips = new Set([zipOrder[0]]);

  const zipSummary = document.getElementById("zipSelectionSummary");
  const zipSelectButton = document.getElementById("zipSelectButton");
  const zipSelectPanel = document.getElementById("zipSelectPanel");
  const zipOptionList = document.getElementById("zipOptionList");
  const selectAllZips = document.getElementById("selectAllZips");
  const cutoffLabel = document.getElementById("cutoffLabel");
  const selectedMarketLabel = document.getElementById("selectedMarketLabel");
  const selectedMarketAreas = document.getElementById("selectedMarketAreas");
  const latestMonthLabel = document.getElementById("latestMonthLabel");
  const latestMonthRule = document.getElementById("latestMonthRule");
  const latestAveragePrice = document.getElementById("latestAveragePrice");
  const priceChangeLabel = document.getElementById("priceChangeLabel");
  const latestAveragePpsf = document.getElementById("latestAveragePpsf");
  const ppsfChangeLabel = document.getElementById("ppsfChangeLabel");
  const latestSalesCount = document.getElementById("latestSalesCount");
  const salesChangeLabel = document.getElementById("salesChangeLabel");
  const historyTableBody = document.getElementById("historyTableBody");

  const latestIncludedMonth = getLatestIncludedMonth(new Date());
  const latestAvailableMonth = getLatestAvailableMonth(zips);
  const reportingEndMonth =
    compareMonthKeys(latestIncludedMonth, latestAvailableMonth) < 0
      ? latestIncludedMonth
      : latestAvailableMonth;
  const allMonths = buildMonthRange(source.meta?.minMonth || "2015-01", reportingEndMonth);

  cutoffLabel.textContent = `${formatMonthLabel(reportingEndMonth)} is the latest month shown right now.`;
  latestMonthRule.textContent =
    "A month does not appear until the 8th of the following month has passed.";

  zipOrder.forEach((zipCode) => {
    const area = zips[zipCode].area;
    const label = document.createElement("label");
    label.className = "zip-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = zipCode;
    checkbox.checked = selectedZips.has(zipCode);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedZips.add(zipCode);
      } else if (selectedZips.size > 1) {
        selectedZips.delete(zipCode);
      } else {
        checkbox.checked = true;
      }

      updateDashboard();
    });

    const copy = document.createElement("span");
    copy.innerHTML = `<strong>${zipCode}</strong><small>${area}</small>`;

    label.append(checkbox, copy);
    zipOptionList.appendChild(label);
  });

  zipSelectButton.addEventListener("click", () => {
    const isOpen = !zipSelectPanel.hasAttribute("hidden");

    if (isOpen) {
      zipSelectPanel.setAttribute("hidden", "");
      zipSelectButton.setAttribute("aria-expanded", "false");
    } else {
      zipSelectPanel.removeAttribute("hidden");
      zipSelectButton.setAttribute("aria-expanded", "true");
    }
  });

  document.addEventListener("click", (event) => {
    if (!toolRoot.contains(event.target)) {
      zipSelectPanel.setAttribute("hidden", "");
      zipSelectButton.setAttribute("aria-expanded", "false");
    }
  });

  selectAllZips.addEventListener("click", () => {
    selectedZips.clear();
    zipOrder.forEach((zipCode) => selectedZips.add(zipCode));
    syncZipOptions();
    updateDashboard();
  });

  const priceChart = new Chart(document.getElementById("priceHistoryChart"), {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Average Price",
          data: [],
          borderColor: "#ff8a3d",
          backgroundColor: "rgba(255, 138, 61, 0.16)",
          yAxisID: "y",
          tension: 0.26,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: "Price per Sq. Ft.",
          data: [],
          borderColor: "#4878ff",
          backgroundColor: "rgba(72, 120, 255, 0.14)",
          yAxisID: "y1",
          tension: 0.26,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    },
    options: createPriceChartOptions(),
  });

  const salesChart = new Chart(document.getElementById("salesHistoryChart"), {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Home Sales",
          data: [],
          borderColor: "#19c5b6",
          backgroundColor: "rgba(25, 197, 182, 0.18)",
          fill: true,
          tension: 0.26,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    },
    options: createSalesChartOptions(),
  });

  function updateDashboard() {
    const selectedZipList = zipOrder.filter((zipCode) => selectedZips.has(zipCode));
    const monthlySeries = aggregateMonthlySeries(selectedZipList, zips, allMonths);
    const latestMonth = monthlySeries[monthlySeries.length - 1];
    const previousMonth = monthlySeries[monthlySeries.length - 2] || null;
    const priorYearMonth = monthlySeries[monthlySeries.length - 13] || null;

    selectedMarketLabel.textContent =
      selectedZipList.length === 1 ? selectedZipList[0] : `${selectedZipList.length} ZIP codes`;
    selectedMarketAreas.textContent =
      selectedZipList.length === 1
        ? zips[selectedZipList[0]].area
        : `Combined market view across ${selectedZipList.length} selected ZIP codes`;
    latestMonthLabel.textContent = formatMonthLabel(latestMonth.month);

    latestAveragePrice.textContent =
      latestMonth.averagePrice !== null ? formatCurrency(latestMonth.averagePrice) : "N/A";
    latestAveragePpsf.textContent =
      latestMonth.averagePpsf !== null ? formatCurrency(latestMonth.averagePpsf) : "N/A";
    latestSalesCount.textContent = formatNumber(latestMonth.saleCount);

    priceChangeLabel.textContent = buildMetricChangeLabel(
      latestMonth.averagePrice,
      previousMonth?.averagePrice,
      "vs prior month"
    );
    ppsfChangeLabel.textContent = buildMetricChangeLabel(
      latestMonth.averagePpsf,
      previousMonth?.averagePpsf,
      "vs prior month"
    );
    salesChangeLabel.textContent = `MoM: ${formatPercentChange(
      previousMonth?.saleCount,
      latestMonth.saleCount
    )} | Same month prior year: ${formatPercentChange(
      priorYearMonth?.saleCount,
      latestMonth.saleCount
    )}`;

    zipSummary.textContent = buildZipSummary(selectedZipList);
    zipSelectButton.querySelector(".zip-select-button-text").textContent = buildZipSummary(
      selectedZipList
    );

    const chartLabels = monthlySeries.map((entry) => entry.month);
    priceChart.data.labels = chartLabels;
    priceChart.data.datasets[0].data = monthlySeries.map((entry) => entry.averagePrice);
    priceChart.data.datasets[1].data = monthlySeries.map((entry) => entry.averagePpsf);
    priceChart.update();

    salesChart.data.labels = chartLabels;
    salesChart.data.datasets[0].data = monthlySeries.map((entry) => entry.saleCount);
    salesChart.update();

    historyTableBody.innerHTML = monthlySeries
      .slice()
      .reverse()
      .map(
        (entry, index, reversed) => `
          <tr>
            <td>${formatMonthLabel(entry.month)}</td>
            <td>${entry.averagePrice !== null ? formatCurrency(entry.averagePrice) : "N/A"}</td>
            <td>${entry.averagePpsf !== null ? formatCurrency(entry.averagePpsf) : "N/A"}</td>
            <td>${formatNumber(entry.saleCount)}</td>
            <td>${formatPercentChange(reversed[index + 1]?.saleCount, entry.saleCount)}</td>
            <td>${formatPercentChange(findPriorYearSales(entry.month, monthlySeries), entry.saleCount)}</td>
          </tr>
        `
      )
      .join("");

    syncZipOptions();
  }

  function syncZipOptions() {
    Array.from(zipOptionList.querySelectorAll("input")).forEach((input) => {
      input.checked = selectedZips.has(input.value);
    });
  }

  updateDashboard();
}

function normalizeHousingSource(source) {
  if (!source) {
    return null;
  }

  if (source.zips) {
    return source;
  }

  if (!source.z || !source.o) {
    return null;
  }

  const normalizedZips = {};

  Object.entries(source.z).forEach(([zipCode, zipData]) => {
    const [area, months] = zipData;

    normalizedZips[zipCode] = {
      area,
      months: (months || []).map(([month, saleCount, averagePrice, averagePpsf]) => ({
        month,
        saleCount,
        averagePrice,
        averagePpsf,
      })),
    };
  });

  return {
    meta: source.m || {},
    zipOrder: source.o,
    zips: normalizedZips,
  };
}

function aggregateMonthlySeries(selectedZipList, zips, allMonths) {
  const monthMap = new Map(
    allMonths.map((month) => [
      month,
      {
        month,
        saleCount: 0,
        totalPrice: 0,
        pricedSales: 0,
        totalPpsf: 0,
        ppsfSales: 0,
      },
    ])
  );

  selectedZipList.forEach((zipCode) => {
    (zips[zipCode]?.months || []).forEach((entry) => {
      if (!monthMap.has(entry.month)) {
        return;
      }

      const bucket = monthMap.get(entry.month);
      bucket.saleCount += entry.saleCount || 0;

      if (entry.averagePrice !== null && entry.saleCount) {
        bucket.totalPrice += entry.averagePrice * entry.saleCount;
        bucket.pricedSales += entry.saleCount;
      }

      if (entry.averagePpsf !== null && entry.saleCount) {
        bucket.totalPpsf += entry.averagePpsf * entry.saleCount;
        bucket.ppsfSales += entry.saleCount;
      }
    });
  });

  return allMonths.map((month) => {
    const bucket = monthMap.get(month);

    return {
      month,
      saleCount: bucket.saleCount,
      averagePrice: bucket.pricedSales ? Math.round(bucket.totalPrice / bucket.pricedSales) : null,
      averagePpsf: bucket.ppsfSales ? Math.round(bucket.totalPpsf / bucket.ppsfSales) : null,
    };
  });
}

function buildMonthRange(startMonth, endMonth) {
  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
  const months = [];
  let year = startYear;
  let month = startMonthNumber;

  while (year < endYear || (year === endYear && month <= endMonthNumber)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;

    if (month === 13) {
      year += 1;
      month = 1;
    }
  }

  return months;
}

function getLatestIncludedMonth(currentDate) {
  const latest = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthOffset = currentDate.getDate() > 8 ? -1 : -2;

  latest.setMonth(latest.getMonth() + monthOffset);

  return `${latest.getFullYear()}-${String(latest.getMonth() + 1).padStart(2, "0")}`;
}

function getLatestAvailableMonth(zips) {
  return Object.values(zips).reduce((latest, zipData) => {
    const zipLatest = zipData.months[zipData.months.length - 1]?.month;

    if (!zipLatest) {
      return latest;
    }

    return compareMonthKeys(zipLatest, latest) > 0 ? zipLatest : latest;
  }, "1900-01");
}

function compareMonthKeys(a, b) {
  return a.localeCompare(b);
}

function buildZipSummary(selectedZipList) {
  if (selectedZipList.length === 1) {
    return selectedZipList[0];
  }

  if (selectedZipList.length <= 3) {
    return selectedZipList.join(", ");
  }

  return `${selectedZipList.length} ZIP codes selected`;
}

function createPriceChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        callbacks: {
          title(items) {
            return formatMonthLabel(items[0].label);
          },
          label(context) {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
          },
        },
      },
    },
    scales: {
      x: createMonthAxis(),
      y: {
        ticks: {
          color: "#5f6175",
          callback(value) {
            return formatCompactCurrency(value);
          },
        },
        grid: {
          color: "rgba(29, 33, 68, 0.08)",
        },
      },
      y1: {
        position: "right",
        ticks: {
          color: "#5f6175",
          callback(value) {
            return formatCurrency(value);
          },
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };
}

function createSalesChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title(items) {
            return formatMonthLabel(items[0].label);
          },
          label(context) {
            return `Sales: ${formatNumber(context.raw)}`;
          },
        },
      },
    },
    scales: {
      x: createMonthAxis(),
      y: {
        beginAtZero: true,
        ticks: {
          color: "#5f6175",
          callback(value) {
            return formatNumber(value);
          },
        },
        grid: {
          color: "rgba(29, 33, 68, 0.08)",
        },
      },
    },
  };
}

function createMonthAxis() {
  return {
    ticks: {
      color: "#5f6175",
      maxRotation: 0,
      autoSkip: false,
      callback(value, index, ticks) {
        const label = this.getLabelForValue(value);

        if (index === 0 || index === ticks.length - 1 || label.endsWith("-01")) {
          return formatShortMonthLabel(label);
        }

        return "";
      },
    },
    grid: {
      display: false,
    },
  };
}

function findPriorYearSales(month, monthlySeries) {
  const date = parseMonthKey(month);
  const prior = new Date(date.getFullYear() - 1, date.getMonth(), 1);
  const priorKey = `${prior.getFullYear()}-${String(prior.getMonth() + 1).padStart(2, "0")}`;
  const match = monthlySeries.find((entry) => entry.month === priorKey);

  return match ? match.saleCount : null;
}

function buildMetricChangeLabel(currentValue, previousValue, suffix) {
  if (currentValue === null) {
    return "Not enough data";
  }

  return `${formatPercentChange(previousValue, currentValue)} ${suffix}`;
}

function parseMonthKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);

  return new Date(year, month - 1, 1);
}

function formatMonthLabel(monthKey) {
  return parseMonthKey(monthKey).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatShortMonthLabel(monthKey) {
  return parseMonthKey(monthKey).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
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

function formatPercentChange(previousValue, currentValue) {
  if (previousValue === null || previousValue === undefined || previousValue === 0) {
    return "N/A";
  }

  const change = ((currentValue - previousValue) / previousValue) * 100;
  const rounded = Math.round(change);

  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}
