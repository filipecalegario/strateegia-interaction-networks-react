/**
 * Periodic Check Module
 * Handles periodic data updates
 */

import { gatherGraphData } from "../data/graphData.js";
import { updateGraphData, applyFilters, getFilters } from "../data/dataManager.js";
import { updateStatusDisplay } from "../ui/uiManager.js";

// Interval check state
let intervalCheck = "inactive";
let nodeToSummary = [];

/**
 * Start periodic check
 * @param {string} accessToken - The access token
 * @param {string} selectedProject - The selected project ID
 * @param {string} selectedMode - The selected visualization mode
 * @param {Function} onDataUpdate - Callback for data update
 */
export function startPeriodicCheck(accessToken, selectedProject, selectedMode, onDataUpdate) {
    let button = d3.select("#periodic-check-button");
    const chosenInterval = d3.select("#intervals").property("value");

    intervalCheck = setInterval(() => {
        periodicCheck(accessToken, selectedProject, selectedMode, onDataUpdate);
    }, chosenInterval);

    button.text("parar checagem periódica");
    button.classed("btn-outline-success", false);
    button.classed("btn-outline-danger", true);
}

/**
 * Stop periodic check
 */
export function stopPeriodicCheck() {
    let button = d3.select("#periodic-check-button");
    clearInterval(intervalCheck);
    intervalCheck = "inactive";

    button.text("iniciar checagem periódica");
    button.classed("btn-outline-success", true);
    button.classed("btn-outline-danger", false);
}

/**
 * Get periodic check status
 * @returns {string} The periodic check status
 */
export function getPeriodicCheckStatus() {
    return intervalCheck;
}

/**
 * Perform periodic check
 * @param {string} accessToken - The access token
 * @param {string} selectedProject - The selected project ID
 * @param {string} selectedMode - The selected visualization mode
 * @param {Function} onDataUpdate - Callback for data update
 */
async function periodicCheck(accessToken, selectedProject, selectedMode, onDataUpdate) {
    console.log(`periodicCheck(): ${selectedProject}`);

    // Gather new data
    let justGatheredData = await gatherGraphData(
        accessToken,
        selectedProject,
        selectedMode
    );

    // Update data
    updateGraphData(justGatheredData);

    // Apply filters
    const filteredData = applyFilters(getFilters());

    // Call update callback
    onDataUpdate(filteredData);

    // Update status display
    updateStatusDisplay();

    console.log("nodes to summary %o", nodeToSummary);
} 
