const API_URL = "https://api.worldbank.org/v2/country/KAZ/indicator/";

const indicators = [
    {
        code: "SP.POP.TOTL",
        name: "Численность населения",
        unit: "человек"
    },
    {
        code: "NY.GDP.MKTP.CD",
        name: "ВВП страны",
        unit: "доллары США"
    },
    {
        code: "SP.DYN.LE00.IN",
        name: "Ожидаемая продолжительность жизни",
        unit: "лет"
    },
    {
        code: "IT.NET.USER.ZS",
        name: "Пользователи интернета",
        unit: "% населения"
    }
];

let allData = [];
let filteredData = [];

const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const sortSelect = document.getElementById("sortSelect");
const dataTable = document.getElementById("dataTable");
const statusBox = document.getElementById("status");
const recordCount = document.getElementById("recordCount");
const indicatorCount = document.getElementById("indicatorCount");
const timeCount = document.getElementById("timeCount");
const downloadBtn = document.getElementById("downloadBtn");

async function loadData() {
    statusBox.className = "status";
    statusBox.textContent = "Загружаем данные из API Всемирного банка...";

    try {
        const results = await Promise.all(
            indicators.map(async (indicator) => {
                const url =
                    API_URL +
                    indicator.code +
                    "?format=json&per_page=30";

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(
                        "Ошибка сервера: " + response.status
                    );
                }

                const result = await response.json();

                if (!Array.isArray(result) || !Array.isArray(result[1])) {
                    throw new Error("Неверный формат данных API");
                }

                return result[1]
                    .filter(item => item.value !== null)
                    .map(item => ({
                        name: indicator.name,
                        category: indicator.code,
                        year: Number(item.date),
                        value: Number(item.value),
                        unit: indicator.unit
                    }));
            })
        );

        allData = results.flat();

        if (allData.length === 0) {
            throw new Error("API не вернуло доступных записей.");
        }

        fillCategories();
        renderData();

        statusBox.textContent =
            "Данные успешно загружены. Источник: Всемирный банк.";
    } catch (error) {
        console.error("Ошибка загрузки:", error);

        statusBox.className = "status error";
        statusBox.textContent =
            "Не удалось загрузить данные. Проверь подключение к интернету " +
            "и доступность API. Подробности смотри в консоли браузера.";

        dataTable.innerHTML = `
            <tr>
                <td colspan="4">
                    Данные недоступны. Попробуй обновить страницу позже.
                </td>
            </tr>
        `;

        recordCount.textContent = "0";
        indicatorCount.textContent = "0";
        timeCount.textContent = "—";
    }
}

function fillCategories() {
    categorySelect.innerHTML =
        '<option value="all">Все показатели</option>';

    indicators.forEach(indicator => {
        const option = document.createElement("option");
        option.value = indicator.code;
        option.textContent = indicator.name;
        categorySelect.appendChild(option);
    });
}

// Линейный поиск: проверяем каждую запись.
function linearSearch(data, query, category) {
    const result = [];
    const text = query.toLowerCase().trim();

    for (let i = 0; i < data.length; i++) {
        const item = data[i];

        const matchesText =
            item.name.toLowerCase().includes(text) ||
            String(item.year).includes(text) ||
            item.category.toLowerCase().includes(text);

        const matchesCategory =
            category === "all" || item.category === category;

        if (matchesText && matchesCategory) {
            result.push(item);
        }
    }

    return result;
}

// Пузырьковая сортировка.
function bubbleSort(data, compare) {
    const result = [...data];

    for (let i = 0; i < result.length - 1; i++) {
        let swapped = false;

        for (let j = 0; j < result.length - i - 1; j++) {
            if (compare(result[j], result[j + 1]) > 0) {
                const temp = result[j];
                result[j] = result[j + 1];
                result[j + 1] = temp;
                swapped = true;
            }
        }

        if (!swapped) {
            break;
        }
    }

    return result;
}

function getComparator(mode) {
    switch (mode) {
        case "year-asc":
            return (a, b) => a.year - b.year;

        case "name-asc":
            return (a, b) => a.name.localeCompare(b.name, "ru");

        case "value-desc":
            return (a, b) => b.value - a.value;

        case "value-asc":
            return (a, b) => a.value - b.value;

        case "year-desc":
        default:
            return (a, b) => b.year - a.year;
    }
}

function renderData() {
    const start = performance.now();

    const query = searchInput.value;
    const category = categorySelect.value;

    const searchResults = linearSearch(
        allData,
        query,
        category
    );

    const sortedResults = bubbleSort(
        searchResults,
        getComparator(sortSelect.value)
    );

    const end = performance.now();

    filteredData = sortedResults;

    recordCount.textContent = filteredData.length;
    indicatorCount.textContent = new Set(
        filteredData.map(item => item.category)
    ).size;

    timeCount.textContent = (end - start).toFixed(3) + " мс";

    if (filteredData.length === 0) {
        dataTable.innerHTML = `
            <tr>
                <td colspan="4">Ничего не найдено.</td>
            </tr>
        `;
        return;
    }

    dataTable.innerHTML = "";

    filteredData.forEach(item => {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = item.name;

        const yearCell = document.createElement("td");
        yearCell.textContent = item.year;

        const valueCell = document.createElement("td");
        valueCell.textContent = item.value.toLocaleString("ru-RU", {
            maximumFractionDigits: 2
        });

        const unitCell = document.createElement("td");
        unitCell.textContent = item.unit;

        row.append(nameCell, yearCell, valueCell, unitCell);
        dataTable.appendChild(row);
    });
}

function downloadCSV() {
    if (filteredData.length === 0) {
        alert("Нет данных для скачивания.");
        return;
    }

    const header = ["Показатель", "Код", "Год", "Значение", "Единица"];

    const rows = filteredData.map(item => [
        item.name,
        item.category,
        item.year,
        item.value,
        item.unit
    ]);

    function escapeCSV(value) {
        let text = String(value);

        if (/[;"\r\n]/.test(text)) {
            text = '"' + text.replace(/"/g, '""') + '"';
        }

        return text;
    }

    const csv = [header, ...rows]
        .map(row => row.map(escapeCSV).join(";"))
        .join("\r\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "opendata-kz.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

searchInput.addEventListener("input", renderData);
categorySelect.addEventListener("change", renderData);
sortSelect.addEventListener("change", renderData);
downloadBtn.addEventListener("click", downloadCSV);

loadData();