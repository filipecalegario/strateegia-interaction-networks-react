/**
 * Main Module
 * Entry point for the application
 */

import { USER_MODE, PROJECT_MODE, INDICATORS_MODE, BEESWARM_MODE, DEFAULT_MODE, NODE_GROUPS } from "./core/config.js";
import { initializeRenderer } from "./visualization/graphRenderer.js";
import { initializeUI, initializeProjectList, initializeModeSelector, initializePeriodicCheckButtonControls, initializeColorSelector } from "./ui/uiManager.js";
import { getProjects, drawProject, updateGraph } from "./core/projectManager.js";
import { applyFilters, setSelectedNodeGroups, getFilters } from "./data/dataManager.js";
import { startPeriodicCheck, stopPeriodicCheck, getPeriodicCheckStatus } from "./core/periodicCheck.js";
import { checkAuthentication } from "./core/auth.js";

// Parse URL parameters
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const selectedMode = DEFAULT_MODE;
localStorage.setItem("selectedMode", selectedMode);

/**
 * Initialize the application
 */
export async function initializeApp() {
    console.log("Initializing application...");

    // Check authentication
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        console.error("Authentication failed: No valid access token");
        window.location.href = "index.html";
        return;
    }

    // Get access token
    const accessToken = localStorage.getItem("strateegiaAccessToken");

    // Initialize renderer
    initializeRenderer("svg#main_svg", "#graph-view");

    // Initialize UI
    initializeUI();
    initializePeriodicCheckButtonControls();

    // Initialize periodic check button
    d3.select("#periodic-check-button").on("click", () => {
        if (getPeriodicCheckStatus() === "inactive") {
            const selectedProject = localStorage.getItem("selectedProject");
            const selectedMode = localStorage.getItem("selectedMode") || DEFAULT_MODE;
            startPeriodicCheck(accessToken, selectedProject, selectedMode, updateGraph);
        } else {
            stopPeriodicCheck();
        }
    });

    // Get projects
    const projects = await getProjects(accessToken);
    console.log("projects", projects);

    // Initialize project list
    initializeProjectList(projects, (selectedProject) => {
        const selectedMode = localStorage.getItem("selectedMode") || DEFAULT_MODE;
        drawProject(accessToken, selectedProject, selectedMode);
    });

    // Initialize mode selector
    const modes = [BEESWARM_MODE, PROJECT_MODE, USER_MODE, INDICATORS_MODE];
    initializeModeSelector(modes, (selectedMode) => {
        localStorage.setItem("selectedMode", selectedMode);
        const selectedProject = localStorage.getItem("selectedProject");
        drawProject(accessToken, selectedProject, selectedMode);
    });

    // Initialize color selector
    initializeColorSelector(NODE_GROUPS, (groups) => {
        setSelectedNodeGroups(groups);
        const filtered = applyFilters(getFilters());
        updateGraph(filtered);
    });

    // Draw initial project
    const defaultSelectedProject = projects[0].id;
    localStorage.setItem("selectedProject", defaultSelectedProject);
    d3.select("#project-link").attr(
        "href",
        `https://app.strateegia.digital/journey/${defaultSelectedProject}`
    );
    drawProject(accessToken, defaultSelectedProject, selectedMode);
}

// Initialize the application when the DOM is loaded





