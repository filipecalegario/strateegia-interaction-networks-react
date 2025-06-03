/**
 * Project Manager Module
 * Handles project operations and data loading
 */

import { getAllProjects } from "https://unpkg.com/strateegia-api/strateegia-api.js";
import { gatherGraphData } from "../data/graphData.js";
import { setGraphData, applyFilters, initializeFilters, getFilters } from "../data/dataManager.js";
import { countStatistics } from "../data/statisticsManager.js";
import { initializeSimulation, buildGraph, updateAll } from "../visualization/graphRenderer.js";
import { displayStatistics, updateAppTitle } from "../ui/uiManager.js";
import { INDICATORS_MODE, USER_MODE, BEESWARM_MODE, PROJECT_MODE } from "./config.js";
import { initBeeswarm } from "../visualization/beeswarm.js";

/**
 * Get all projects from Strateegia API
 * @param {string} accessToken - The access token
 * @returns {Array} The list of projects
 */
export async function getProjects(accessToken) {
    const labs = await getAllProjects(accessToken);
    console.log("getAllProjects()");
    console.log(labs);

    // Process projects
    let listProjects = [];
    for (let i = 0; i < labs.length; i++) {
        let currentLab = labs[i];
        if (currentLab.lab.name == null) {
            currentLab.lab.name = "Personal";
        }
        for (let j = 0; j < currentLab.projects.length; j++) {
            const project = currentLab.projects[j];
            listProjects.push({
                id: project.id,
                title: project.title,
                lab_id: currentLab.lab.id,
                lab_title: currentLab.lab.name,
            });
        }
    }

    return listProjects;
}

/**
 * Draw project visualization
 * @param {string} accessToken - The access token
 * @param {string} projectId - The project ID
 * @param {string} mode - The visualization mode
 */
export async function drawProject(accessToken, projectId, mode) {
    // Show loading spinner
    d3.select("#loading-spinner").style("display", "block");
    d3.select("#graph-view").style("display", "none");
    d3.select("#statistics").style("display", "none");
    console.log("start loading... %o", new Date());

    // Update app title
    updateAppTitle(mode);

    // Initialize filters based on mode
    initializeFilters(mode);

    // Gather graph data
    const graphData = await gatherGraphData(accessToken, projectId, mode);
    setGraphData(graphData);

    // Apply filters with the current filters
    const currentFilters = getFilters();
    const filteredData = applyFilters(currentFilters);

    // Count statistics
    const counters = countStatistics(filteredData, mode);
    displayStatistics(counters, mode);

    // Initialize graph if not in indicators mode
    if (mode == USER_MODE || mode == PROJECT_MODE) {
        try {
            // Reinitialize the renderer to ensure a clean state
            initializeGraph(filteredData, mode);
        } catch (error) {
            console.error("Error initializing graph:", error);
            // Hide loading spinner in case of error
            d3.select("#loading-spinner").style("display", "none");
            d3.select("#graph-view").style("display", "block");
            d3.select("#statistics").style("display", "block");
        }
    } else if (mode === INDICATORS_MODE) {
        // For indicators mode, we need to hide the spinner manually
        d3.select("#loading-spinner").style("display", "none");
        d3.select("#graph-view").style("display", "block");
        d3.select("#statistics").style("display", "block");
    } else if (mode === BEESWARM_MODE) {
        // For beeswarm mode, we need to hide the spinner manually
        initBeeswarm(filteredData);
        d3.select("#loading-spinner").style("display", "none");
        d3.select("#graph-view").style("display", "none");
        d3.select("#statistics").style("display", "none");
    }

    console.log("stop loading... %o", new Date());

    return filteredData;
}

/**
 * Initialize graph visualization
 * @param {Object} filteredData - The filtered data
 * @param {string} mode - The visualization mode
 */
function initializeGraph(filteredData, mode) {
    // Validate input data
    if (!filteredData || !filteredData.nodes || !filteredData.links) {
        console.error("Invalid filtered data provided to initializeGraph", filteredData);
        filteredData = { nodes: [], links: [] };
    }

    // Show statistics immediately
    d3.select("#statistics").style("display", "block");
    console.log(`initializeGraph for mode ${mode} with filteredData:`, filteredData);

    // Initialize simulation (this will handle the loading spinner)
    initializeSimulation(filteredData.nodes, filteredData.links);

    // Build graph with the current mode
    buildGraph(filteredData.nodes, filteredData.links, mode);

    // Update forces
    updateAll(filteredData.links);
}

/**
 * Update graph visualization
 * @param {Object} filteredData - The filtered data
 */
export function updateGraph(filteredData) {
    // Validate input data
    if (!filteredData || !filteredData.nodes || !filteredData.links) {
        console.error("Invalid filtered data provided to updateGraph", filteredData);
        filteredData = { nodes: [], links: [] };
    }

    // Get current mode
    const mode = localStorage.getItem("selectedMode") || "projeto";

    // Count statistics
    const counters = countStatistics(filteredData, mode);
    displayStatistics(counters, mode);
    console.log("updateGraph filteredData %o", filteredData);

    // Update graph with current mode
    buildGraph(filteredData.nodes, filteredData.links, mode);
    updateAll(filteredData.links);
} 
