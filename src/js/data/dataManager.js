/**
 * Data Manager Module
 * Handles data operations, filtering, and processing
 */

import { getFiltersByMode, NODE_GROUPS, DEFAULT_MODE } from "../core/config.js";

// Main data storage
let graphData = {
    nodes: [],
    links: []
};

let filteredData = {
    nodes: [],
    links: []
};

// Groups currently selected for filtering
let selectedGroups = NODE_GROUPS.slice();

/**
 * Set the graph data
 * @param {Object} data - The graph data with nodes and links
 */
export function setGraphData(data) {
    graphData = data;
    return graphData;
}

/**
 * Get the current graph data
 * @returns {Object} The current graph data
 */
export function getGraphData() {
    return graphData;
}

/**
 * Get the filtered data
 * @returns {Object} The filtered data
 */
export function getFilteredData() {
    return filteredData;
}

/**
 * Update group filter combining mode filter and selected groups
 */
function updateGroupFilter() {
    const mode = localStorage.getItem("selectedMode") || DEFAULT_MODE;
    const modeFilterObj = getFiltersByMode(mode);
    const modeFilter = modeFilterObj.group;
    currentFilters.group = (group) => {
        const modeOk = modeFilter ? modeFilter(group) : true;
        return modeOk && selectedGroups.includes(group);
    };
}

/**
 * Set groups selected by user
 * @param {Array} groups
 */
export function setSelectedNodeGroups(groups) {
    selectedGroups = groups.slice();
    updateGroupFilter();
}

/**
 * Filter an array of objects using custom predicates
 * @param {Array} array - The array to filter
 * @param {Object} filters - An object with the filter criteria
 * @returns {Array} The filtered array
 */
export function filterArray(array, filters) {
    // Protection for null or undefined array
    if (!array || !Array.isArray(array)) {
        return [];
    }

    // Protection for null or undefined filters
    if (!filters || typeof filters !== 'object') {
        return array;
    }

    const filterKeys = Object.keys(filters);

    // If no filter keys, return the original array
    if (filterKeys.length === 0) {
        return array;
    }

    return array.filter((item) => {
        // Protection for null or undefined item
        if (!item) {
            return false;
        }

        // validates all filter criteria
        return filterKeys.every((key) => {
            // Protection for non-function predicates
            if (typeof filters[key] !== "function") {
                return true;
            }

            // Protection for undefined or null property
            if (item[key] === undefined || item[key] === null) {
                return false;
            }

            return filters[key](item[key]);
        });
    });
}

/**
 * Apply filters to the graph data
 * @param {Object} filters - The filters to apply
 * @returns {Object} The filtered data
 */
export function applyFilters(filters) {
    console.log("applyFilters list of filters %o", filters);
    console.log("applyFilters inputData %o", graphData);

    // Filter nodes
    const filteredNodes = filterArray(graphData.nodes, filters);

    // Get node IDs for link filtering
    const nodeIDs = filteredNodes.map(node => node.id);

    // Filter links
    const filteredLinks = graphData.links.filter((d) => {
        const isDSource = nodeIDs.includes(d.source);
        const isDTarget = nodeIDs.includes(d.target);
        const isDSourceID = nodeIDs.includes(d.source?.id);
        const isDTargetID = nodeIDs.includes(d.target?.id);
        return (isDSource && isDTarget) || (isDSourceID && isDTargetID);
    });

    // Update filtered data
    filteredData = {
        nodes: filteredNodes,
        links: filteredLinks
    };
    console.log("applyFilters outputData %o", filteredData);
    return filteredData;
}

/**
 * Apply time-based filter to the data
 * @param {number} timeValue - The time value to filter by
 * @returns {Object} The filtered data
 */
export function filterByTime(timeValue) {
    let timeScale = d3.scaleTime()
        .domain([0, 50])
        .range([
            d3.min(graphData.nodes, (d) => d.createdAt),
            d3.max(graphData.nodes, (d) => d.createdAt),
        ]);

    let dateLimit = timeScale(timeValue);

    const timeFilter = {
        createdAt: (createdAt) => createdAt <= dateLimit
    };

    // Combine with existing filters
    const combinedFilters = { ...getFilters(), ...timeFilter };

    return applyFilters(combinedFilters);
}

// Current filters
let currentFilters = {};

/**
 * Set filters for data filtering
 * @param {Object} filters - The filters to set
 */
export function setFilters(filters) {
    currentFilters = filters;
}

/**
 * Get current filters
 * @returns {Object} The current filters
 */
export function getFilters() {
    return currentFilters;
}

/**
 * Initialize filters based on mode
 * @param {string} mode - The visualization mode
 */
export function initializeFilters(mode) {
    console.log("initializeFilters mode %o", mode);
    setFilters(getFiltersByMode(mode));
    updateGroupFilter();
}

/**
 * Merge the properties of the old data into the new data based on the `id`
 * @param {Array} oldData - The old data array
 * @param {Array} newData - The new data array
 * @returns {Array} - The merged data array
 */
export function mergeData(oldData, newData) {
    // Create a map from the old data for fast lookup based on id
    const oldDataMap = new Map(oldData.map((d) => [d.id, d]));

    // For each entry in the new data, merge properties from the old data
    newData.forEach((newEntry) => {
        const oldEntry = oldDataMap.get(newEntry.id);
        if (oldEntry) {
            // List of properties you want to merge from old data
            const propertiesToMerge = ["x", "y", "vx", "vy", "index"];

            propertiesToMerge.forEach((prop) => {
                if (oldEntry[prop] !== undefined) {
                    newEntry[prop] = oldEntry[prop];
                }
            });
        }
    });

    return newData;
}

/**
 * Update graph data with new data, preserving positions
 * @param {Object} newData - The new data to merge with existing data
 * @returns {Object} The updated graph data
 */
export function updateGraphData(newData) {
    graphData = {
        nodes: mergeData(graphData.nodes, newData.nodes),
        links: mergeData(graphData.links, newData.links)
    };

    return graphData;
} 
