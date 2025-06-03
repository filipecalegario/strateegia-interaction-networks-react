/**
 * UI Manager Module
 * Handles UI interactions and display
 */

import { USER_MODE, PROJECT_MODE, INDICATORS_MODE, BEESWARM_MODE, NODE_GROUPS, NODE_COLORS } from "../core/config.js";
import { filterByTime, getFilters } from "../data/dataManager.js";
import { calculateIndicators } from "../data/statisticsManager.js";
import { saveAsSVG } from "../visualization/graphRenderer.js";

/**
 * Initialize UI elements
 */
export function initializeUI() {
    // Initialize time slider
    d3.select("#time_ticks").on("input", (e) => {
        // console.log("time_ticks %", e);
        handleTimeFilter(e.target.value);
    });

    // Initialize export buttons
    initializeExportButtons();

}

/**
 * Initialize export buttons
 */
function initializeExportButtons() {
    // Save as SVG button
    d3.select("#save_svg_button").on("click", () => {
        saveAsSVG();
    });

    // Save as JSON button
    d3.select("#save_json_button").on("click", () => {
        saveJson();
    });
}

/**
 * Handle time filter change
 * @param {number} timeValue - The time value from the slider
 */
export function handleTimeFilter(timeValue) {
    const parseTime = d3.timeFormat("%d/%m/%Y - %H:%M:%S");
    const filteredData = filterByTime(timeValue);

    // Update date display
    const timeScale = d3.scaleTime()
        .domain([0, 50])
        .range([
            d3.min(filteredData.nodes, (d) => d.createdAt),
            d3.max(filteredData.nodes, (d) => d.createdAt),
        ]);

    const dateLimit = timeScale(timeValue);
    d3.select("#choose_date").text(`filtrar itens por data: ${parseTime(dateLimit)}`);
}

/**
 * Save data as JSON
 * @param {Object} data - The data to save
 */
export function saveJson(data) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const dlAnchorElem = document.getElementById("downloadAnchorElem");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "consolidated_data.json");
    dlAnchorElem.click();
}

/**
 * Display statistics in the UI
 * @param {Array} counters - The counter data
 * @param {string} mode - The visualization mode
 */
export function displayStatistics(counters, mode) {
    if (mode === USER_MODE || mode === PROJECT_MODE) {
        // Display simple statistics list
        d3.select("#indicators").style("display", "none");
        d3.select("#stat_list").style("display", "block");
        d3.select("#graph-view").style("display", "block");
        d3.select("#main_svg").style("display", "block");

        let ul_ = d3.select("#stat_list")
            .selectAll("li")
            .data(counters, (d) => d.id);

        ul_.enter()
            .append("li")
            .style("color", (d) => d.color)
            .text((d) => `${d.title} ${d.quant}`);

        ul_.style("color", (d) => d.color)
            .text((d) => `${d.title} ${d.quant}`);

        ul_.exit().remove();
    } else if (mode === BEESWARM_MODE) {
        d3.select("#indicators").style("display", "none");
        d3.select("#stat_list").style("display", "none");
        d3.select("#graph-view").style("display", "none");
        d3.select("#beeswarm-view").style("display", "block");
        d3.select("#beeswarm_svg").style("display", "block");
    } else if (mode === INDICATORS_MODE) {
        // Display detailed indicators
        d3.select("#indicators").style("display", "block");
        d3.select("#stat_list").style("display", "none");
        d3.select("#graph-view").style("display", "none");
        d3.select("#main_svg").style("display", "none");

        // Calculate indicators
        const indicators = calculateIndicators(counters);

        // Update UI with calculated values
        d3.select("#pessoas_num").text(indicators.usuarios);
        d3.select("#pessoas_inativas_num").text(indicators.usuarios_inativos);
        d3.select("#indice_atividade_num").text(indicators.indice_atividade + "%");
        d3.select("#questoes_num").text(indicators.questoes_num);
        d3.select("#respostas_num").text(indicators.respostas_num);
        d3.select("#respostas_potenciais_num").text(indicators.respostas_potenciais);
        d3.select("#engajamento_questoes_num").text(indicators.engajamento_questoes + "%");
        d3.select("#comentarios_num").text(indicators.comentarios_num);
        d3.select("#concordar_num").text(indicators.concordar_num);
        d3.select("#interacoes_num").text(indicators.interacoes_num);
        d3.select("#interacoes_potenciais_num").text(indicators.interacoes_potenciais);
        d3.select("#engajamento_interacoes_num").text(indicators.engajamento_interacoes + "%");
        d3.select("#engajamento_media_num").text(indicators.engajamento_media + "%");
    }
}

/**
 * Initialize periodic check button controls
 */
export function initializePeriodicCheckButtonControls() {
    let button = d3.select("#periodic-check-button");
    button.text("iniciar checagem periódica");
    button.classed("btn-outline-success", true);

    let intervals = d3.select("#intervals");
    const intervalsOptions = [
        { value: "1000", text: "1 segundo" },
        { value: "5000", text: "5 segundos" },
        { value: "10000", text: "10 segundos" },
        { value: "15000", text: "15 segundos" },
        { value: "30000", text: "30 segundos" },
        { value: "60000", text: "1 minuto" },
        { value: "120000", text: "2 minutos" },
        { value: "300000", text: "5 minutos" },
        { value: "600000", text: "10 minutos" },
        { value: "1800000", text: "30 minutos" },
        { value: "3600000", text: "1 hora" },
    ];

    intervalsOptions.forEach(function (interval) {
        intervals
            .append("option")
            .attr("value", interval.value)
            .text(interval.text)
            .classed("dropdown-item", true);
    });
}

/**
 * Update status display for periodic check
 */
export function updateStatusDisplay() {
    let statusOutput = d3.select("#periodic-check-status");
    statusOutput.classed("alert alert-secondary", true);
    let currentTime = new Date();
    let currentTimeFormatted = d3.timeFormat("%d/%m/%Y %H:%M:%S")(currentTime);
    statusOutput.text("última checagem: " + currentTimeFormatted);
}

/**
 * Initialize project list dropdown
 * @param {Array} projects - The list of projects
 * @param {Function} onProjectChange - Callback for project change
 */
export function initializeProjectList(projects, onProjectChange) {
    let options = d3.select("#projects-list")
        .on("change", () => {
            const selectedProject = d3.select("#projects-list").property("value");
            localStorage.setItem("selectedProject", selectedProject);

            d3.select("#project-link").attr(
                "href",
                `https://app.strateegia.digital/journey/${selectedProject}`
            );

            onProjectChange(selectedProject);
            d3.select("#choose_date").text("filtrar itens por data: ");
            d3.select("#time_ticks").property("value", 50);
        })
        .selectAll("option")
        .data(projects, (d) => d.id);

    options.enter()
        .append("option")
        .attr("value", (d) => d.id)
        .text((d) => `${d.lab_title} -> ${d.title}`);

    return options;
}

/**
 * Initialize mode selector
 * @param {Array} modes - The list of modes
 * @param {Function} onModeChange - Callback for mode change
 */
export function initializeModeSelector(modes, onModeChange) {
    return d3.select("#modes-list")
        .on("change", () => {
            const selectedMode = d3.select("#modes-list").property("value");
            onModeChange(selectedMode);
        })
        .selectAll("option")
        .data(modes)
        .enter()
        .append("option")
        .attr("value", (d) => d)
        .text((d) => d);
}

/**
 * Initialize node color selector
 * @param {Array} groups - node group names
 * @param {Function} onChange - callback when selection changes
 */
export function initializeColorSelector(groups, onChange) {
    const container = d3.select("#color-options");
    const items = container.selectAll("div.color-option")
        .data(groups)
        .enter()
        .append("div")
        .attr("class", "form-check form-check-inline me-2 color-option");

    items.append("input")
        .attr("class", "form-check-input")
        .attr("type", "checkbox")
        .attr("id", d => `color-${d}`)
        .property("checked", true)
        .on("change", () => {
            const selected = [];
            container.selectAll("input").each(function (d) {
                if (d3.select(this).property("checked")) {
                    selected.push(d);
                }
            });
            onChange(selected);
        });

    items.append("label")
        .attr("class", "form-check-label")
        .attr("for", d => `color-${d}`)
        .style("color", (d, i) => NODE_COLORS[i])
        .text(d => d);
}

/**
 * Update app title based on mode
 * @param {string} mode - The visualization mode
 */
export function updateAppTitle(mode) {
    if (mode === USER_MODE) {
        d3.select("#applet-title").text("redes de pessoas");
    } else if (mode === PROJECT_MODE) {
        d3.select("#applet-title").text("redes de interações");
    } else if (mode === INDICATORS_MODE) {
        d3.select("#applet-title").text("indicadores da jornada");
    } else if (mode === BEESWARM_MODE) {
        d3.select("#applet-title").text("beeswarm");
    }
} 
