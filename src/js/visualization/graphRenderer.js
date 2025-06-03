/**
 * Graph Renderer Module
 * Handles graph visualization and rendering
 */

import { NODE_GROUPS, NODE_COLORS, NODE_SIZES, SIMULATION_CONFIG, DEFAULT_FORCE_PROPERTIES } from "../core/config.js";

// SVG and dimensions
let svg, g, width, height;

// Force simulation
let simulation;

// Force properties
let forceProperties = { ...DEFAULT_FORCE_PROPERTIES };

// Performance optimization variables
let isSimulationStabilizing = false;
let tickCounter = 0;
let useWebWorker = false;
let simulationWorker = null;

/**
 * Initialize the graph renderer
 * @param {string} svgSelector - The selector for the SVG element
 * @param {string} containerSelector - The selector for the container element
 */
export function initializeRenderer(svgSelector, containerSelector) {
    // Initialize SVG
    svg = d3.select(svgSelector);

    // Clear any existing content
    svg.selectAll("*").remove();

    g = svg.append("g");

    // Get dimensions from container
    const container = d3.select(containerSelector);
    const containerRect = container.node().getBoundingClientRect();
    width = containerRect.width;
    height = 1000; // Fixed height or calculate based on needs

    // Set SVG dimensions
    svg.style("width", width + "px")
        .style("height", height + "px")
        .attr("viewBox", [0, 0, width, height]);

    // Initialize zoom behavior
    const zoom = d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([0.3, 8])
        .on("zoom", zoomed);

    svg.call(zoom);

    // Initialize simulation
    simulation = d3.forceSimulation();

    // Handle window resize
    d3.select(window).on("resize", () => {
        const containerRect = container.node().getBoundingClientRect();
        width = containerRect.width;
        height = containerRect.height;
    });
}

/**
 * Zoom handler function
 */
function zoomed({ transform }) {
    g.attr("transform", transform);
}

/**
 * Adjust force properties based on node count
 * @param {number} nodeCount - The number of nodes
 */
function adjustForcePropertiesForNodeCount(nodeCount) {
    if (nodeCount > 2000) {
        // Very large networks - minimal forces for performance
        forceProperties.charge.strength = -5;
        forceProperties.charge.distanceMax = 150;
        forceProperties.collide.iterations = 1;
        forceProperties.link.iterations = 1;
        forceProperties.link.distance = 20;
        forceProperties.collide.radius = 5;
    } else if (nodeCount > 1000) {
        // Large networks
        forceProperties.charge.strength = -8;
        forceProperties.charge.distanceMax = 180;
        forceProperties.collide.iterations = 1;
        forceProperties.link.iterations = 1;
        forceProperties.link.distance = 25;
        forceProperties.collide.radius = 7;
    } else if (nodeCount > 500) {
        // Medium-large networks
        forceProperties.charge.strength = -10;
        forceProperties.charge.distanceMax = 200;
        forceProperties.collide.iterations = 1;
        forceProperties.link.iterations = 1;
        forceProperties.link.distance = 30;
        forceProperties.collide.radius = 8;
    } else if (nodeCount > 200) {
        // Medium networks
        forceProperties.charge.strength = -20;
        forceProperties.charge.distanceMax = 300;
        forceProperties.collide.iterations = 1;
        forceProperties.link.iterations = 2;
        forceProperties.link.distance = 35;
        forceProperties.collide.radius = 10;
    } else {
        // Default values for small networks
        forceProperties = { ...DEFAULT_FORCE_PROPERTIES };
    }

    console.log(`Adjusted force properties for ${nodeCount} nodes`);
}

/**
 * Initialize the simulation
 * @param {Array} nodes - The nodes data
 * @param {Array} links - The links data
 */
export function initializeSimulation(nodes, links) {
    // Validate input parameters
    if (!nodes || !Array.isArray(nodes)) {
        console.error("Invalid nodes data provided to initializeSimulation");
        nodes = [];
    }

    if (!links || !Array.isArray(links)) {
        console.error("Invalid links data provided to initializeSimulation");
        links = [];
    }

    // Show loading spinner
    d3.select("#loading-spinner").style("display", "block");
    d3.select("#graph-view").style("display", "none");

    // Reset counters and flags
    tickCounter = 0;
    isSimulationStabilizing = true;

    // Create a new simulation instance to ensure clean state
    simulation = d3.forceSimulation();

    // Determine if we should use web worker based on node count
    useWebWorker = nodes.length > SIMULATION_CONFIG.USE_WEB_WORKER_THRESHOLD && window.Worker;

    if (useWebWorker) {
        console.log(`Using Web Worker for ${nodes.length} nodes`);
        runSimulationInWebWorker(nodes, links);
    } else {
        // Adjust force properties based on node count
        adjustForcePropertiesForNodeCount(nodes.length);

        // Set up simulation
        simulation.nodes(nodes).on("tick", ticked);

        // Initialize forces
        initializeForces(nodes, links);

        // Determine number of pre-calculation iterations based on network size
        const nodeCount = nodes.length;
        let preIterations = 100; // Default

        // Scale iterations based on network size
        if (nodeCount > 500) {
            preIterations = 300;
        } else if (nodeCount > 200) {
            preIterations = 200;
        } else if (nodeCount > 100) {
            preIterations = 150;
        }

        console.log(`Running ${preIterations} pre-calculation iterations for ${nodeCount} nodes`);

        // Pre-calculate layout without rendering
        runPreCalculation(preIterations);
    }
}

/**
 * Run pre-calculation iterations without rendering
 * @param {number} iterations - The number of iterations to run
 */
function runPreCalculation(iterations) {
    // Update loading message
    d3.select("#loading-message").text(`Pre-calculating network layout (0/${iterations})...`);

    // Implement a cooling schedule
    let currentAlpha = 0.8;
    const minAlpha = 0.001;
    const coolingFactor = Math.pow(minAlpha / currentAlpha, 1 / iterations);

    // Temporarily remove tick handler to avoid rendering during pre-calculation
    const originalTickHandler = simulation.on("tick");
    simulation.on("tick", null);

    // Run iterations with manual progress updates
    let i = 0;
    const runBatch = () => {
        const batchSize = 10; // Process in small batches to avoid blocking UI
        const end = Math.min(i + batchSize, iterations);

        for (; i < end; i++) {
            simulation.alpha(currentAlpha);
            simulation.tick();
            currentAlpha *= coolingFactor;
        }

        // Update progress
        const progress = Math.min(100, Math.round((i / iterations) * 100));
        d3.select("#alpha_value")
            .style("flex-basis", progress + "%")
            .attr("aria-valuenow", progress);

        d3.select("#loading-message").text(`Pre-calculating network layout (${i}/${iterations})...`);

        if (i < iterations) {
            // Continue with next batch
            setTimeout(runBatch, 0);
        } else {
            // Finished pre-calculation
            console.log("Pre-calculation complete");

            // Restore tick handler
            simulation.on("tick", originalTickHandler);

            // Set a low alpha to continue with gentle adjustments
            simulation.alpha(0.1).restart();

            // Start checking for stability
            checkStability();
        }
    };

    // Start the first batch
    setTimeout(runBatch, 0);
}

/**
 * Check if simulation has stabilized enough
 */
function checkStability() {
    if (!isSimulationStabilizing) return;

    // Update loading message with current alpha value
    const stabilityPercent = Math.round((1 - simulation.alpha()) * 100);
    d3.select("#loading-message").text(`Refining network layout... (stability: ${stabilityPercent}%)`);

    // Check if simulation is stable enough
    if (simulation.alpha() < SIMULATION_CONFIG.STABILITY_THRESHOLD) {
        console.log("Simulation stabilized early");
        finishSimulation();
        return;
    }

    // Also check if node movement has become minimal
    const nodeMovement = calculateAverageNodeMovement();
    if (nodeMovement < 0.1 && simulation.alpha() < 0.05) {
        console.log(`Simulation stabilized based on minimal movement: ${nodeMovement}`);
        finishSimulation();
        return;
    }

    // Check again in 300ms (more frequent checks)
    setTimeout(checkStability, 300);
}

/**
 * Calculate average node movement
 * @returns {number} The average node movement
 */
function calculateAverageNodeMovement() {
    const nodes = simulation.nodes();
    if (!nodes || nodes.length === 0) return 0;

    let totalMovement = 0;
    for (const node of nodes) {
        // Calculate magnitude of velocity vector
        const movement = Math.sqrt((node.vx || 0) * (node.vx || 0) + (node.vy || 0) * (node.vy || 0));
        totalMovement += movement;
    }

    return totalMovement / nodes.length;
}

/**
 * Finish simulation and show results
 */
function finishSimulation() {
    // Update loading message
    d3.select("#loading-message").text("Final stabilization...");

    // Run a final stabilization phase with very low alpha
    const finalStabilizationTicks = 50;
    let ticksRun = 0;

    // Temporarily remove tick handler to avoid rendering during final stabilization
    const originalTickHandler = simulation.on("tick");
    simulation.on("tick", null);

    // Run final stabilization ticks in batches
    const runFinalBatch = () => {
        const batchSize = 10;
        const end = Math.min(ticksRun + batchSize, finalStabilizationTicks);

        for (; ticksRun < end; ticksRun++) {
            simulation.alpha(0.0005).tick();
        }

        // Update progress
        const progress = Math.min(100, Math.round((ticksRun / finalStabilizationTicks) * 100));
        d3.select("#alpha_value")
            .style("flex-basis", progress + "%")
            .attr("aria-valuenow", progress);

        if (ticksRun < finalStabilizationTicks) {
            // Continue with next batch
            setTimeout(runFinalBatch, 0);
        } else {
            // Finished final stabilization
            console.log("Final stabilization complete");

            // Restore tick handler
            simulation.on("tick", originalTickHandler);

            // Mark simulation as no longer stabilizing
            isSimulationStabilizing = false;

            // Update loading message
            d3.select("#loading-message").text("Rendering network visualization...");

            // Force final positions update
            renderPositions();

            // Hide loading spinner and show graph
            d3.select("#loading-spinner").style("display", "none");
            d3.select("#graph-view").style("display", "block");

            // Cool down simulation to allow for gentle user interaction
            simulation.alpha(0.05).alphaTarget(0).alphaDecay(0.02).restart();
        }
    };

    // Start the first batch
    setTimeout(runFinalBatch, 0);
}

/**
 * Render current positions
 */
function renderPositions() {
    d3.selectAll("line.links")
        .attr("x1", function (d) { return d.source.x; })
        .attr("y1", function (d) { return d.source.y; })
        .attr("x2", function (d) { return d.target.x; })
        .attr("y2", function (d) { return d.target.y; });

    d3.selectAll("g.nodes").attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
    });
}

/**
 * Initialize forces for the simulation
 * @param {Array} nodes - The nodes data
 * @param {Array} links - The links data
 */
function initializeForces(nodes, links) {
    // Validate input parameters
    if (!nodes || !Array.isArray(nodes)) {
        console.error("Invalid nodes data provided to initializeForces");
        nodes = [];
    }

    if (!links || !Array.isArray(links)) {
        console.error("Invalid links data provided to initializeForces");
        links = [];
    }

    // Add forces and associate each with a name
    simulation
        .force("center", d3.forceCenter())
        .force("link", d3.forceLink())
        .force("charge", d3.forceManyBody())
        .force("collide", d3.forceCollide())
        .force("forceX", d3.forceX())
        .force("forceY", d3.forceY());

    // Apply properties to each of the forces
    updateForces(links);
}

/**
 * Update forces based on force properties
 * @param {Array} links - The links data
 * @param {number} alpha - The alpha value for the simulation
 */
export function updateForces(links, alpha = 0.2) {
    // Validate input parameters
    if (!links || !Array.isArray(links)) {
        console.error("Invalid links data provided to updateForces");
        links = [];
    }

    // Check if simulation exists
    if (!simulation) {
        console.warn("Simulation is not initialized in updateForces");
        return;
    }

    const centerX = width * forceProperties.center.x;
    const centerY = height * forceProperties.center.y;

    const forces = {
        center: ["x", "y"],
        charge: ["strength", "distanceMin", "distanceMax"],
        collide: ["strength", "radius", "iterations"],
        forceX: ["strength", "x"],
        forceY: ["strength", "y"],
    };

    for (let forceName in forces) {
        let force = simulation.force(forceName);
        if (!force) {
            console.warn(`Force "${forceName}" not found in simulation`);
            continue;
        }

        forces[forceName].forEach((property) => {
            let value = forceProperties[forceName][property];
            if (property === "strength" || property === "iterations") {
                value *= forceProperties[forceName].enabled ? 1 : 0;
            }
            force[property](value);
        });
    }

    // Check if center force exists
    const centerForce = simulation.force("center");
    if (centerForce) {
        centerForce.x(centerX).y(centerY);
    }

    // Separate link force due to its specific requirements
    const linkForce = simulation.force("link");
    if (linkForce) {
        linkForce
            .id((d) => d.id)
            .distance(forceProperties.link.distance)
            .iterations(forceProperties.link.iterations);

        if (forceProperties.link.enabled) {
            linkForce.links(links);
        } else {
            linkForce.links([]);
        }
    } else {
        console.warn("Link force not found in simulation");
    }

    // Restart simulation if it exists
    simulation.alpha(alpha).restart();
}

/**
 * Update display based on forces
 */
function updateDisplay() {
    d3.selectAll("line.links")
        .attr("stroke-width", forceProperties.link.enabled ? 1 : 0.5)
        .attr("opacity", forceProperties.link.enabled ? 1 : 0)
        .lower();
}

/**
 * Tick handler for the simulation
 */
function ticked() {
    tickCounter++;

    // During stabilization phase, only render occasionally to improve performance
    if (isSimulationStabilizing) {
        // Update progress indicator
        const progress = Math.round((1 - simulation.alpha()) * 100);
        d3.select("#alpha_value")
            .style("flex-basis", progress + "%")
            .attr("aria-valuenow", progress);

        // Only render every TICKS_PER_RENDER ticks
        if (tickCounter % SIMULATION_CONFIG.TICKS_PER_RENDER !== 0) return;
    }

    // Render current positions
    renderPositions();
}

/**
 * Build the graph visualization
 * @param {Array} nodes - The nodes data
 * @param {Array} links - The links data
 * @param {string} mode - The visualization mode
 */
export function buildGraph(nodes, links, mode = MODE_PROJECT) {
    // Validate input parameters
    if (!nodes || !Array.isArray(nodes)) {
        console.error("Invalid nodes data provided to buildGraph");
        nodes = [];
    }

    if (!links || !Array.isArray(links)) {
        console.error("Invalid links data provided to buildGraph");
        links = [];
    }

    console.log(`Building graph for mode: ${mode} with ${nodes.length} nodes and ${links.length} links`);

    // Color and size scales
    const color = d3.scaleOrdinal().domain(NODE_GROUPS).range(NODE_COLORS);
    const nodeSize = d3.scaleOrdinal().domain(NODE_GROUPS).range(NODE_SIZES);

    // Clear existing elements to avoid duplicates
    g.selectAll("line.links").remove();
    g.selectAll("g.nodes").remove();

    // === LINKS ===
    let linksSelection = g.selectAll("line.links").data(links);

    // Update existing links
    linksSelection.style("stroke", "#aaa");

    // Enter new links
    linksSelection
        .enter()
        .append("line")
        .attr("class", "links")
        .style("stroke", "#aaa");

    // Exit old links
    linksSelection.exit().remove();

    // === NODES ===
    let nodesSelection = g.selectAll("g.nodes").data(nodes, (d) => d.id);

    // Update existing nodes
    nodesSelection
        .select("circle")
        .attr("fill", (d) => color(d.group))
        .attr("r", (d) => nodeSize(d.group));

    // Enter new nodes
    let nodeGroup = nodesSelection
        .enter()
        .append("g")
        .attr("class", "nodes")
        .attr("cursor", "grab");

    let t = d3.transition().duration(500).ease(d3.easeLinear);

    nodeGroup
        .append("a")
        .attr("xlink:href", (d) => d.dashboardUrl)
        .attr("target", "_blank")
        .append("circle")
        .attr("fill", "white")
        .attr("r", 0)
        .transition(t)
        .attr("r", (d) => nodeSize(d.group))
        .attr("fill", (d) => color(d.group))
        .attr("id", (d) => d.id);

    nodeGroup
        .append("text")
        .text((d) => d.title)
        .attr("x", 6)
        .attr("y", 3)
        .style("display", "none");

    // Node tooltip
    nodeGroup.append("title").text((d) => d.title);

    // Drag behaviors
    const drag = d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);

    nodeGroup
        .call(drag)
        .on("mouseover", focus)
        .on("mouseout", unfocus)
        .each(function (d) {
            d.x = d.x || d.x === 0 ? width * 0.5 : d.x;
            d.y = d.y || d.y === 0 ? height * 0.5 : d.y;
        });

    // Reset and reinitialize simulation for each mode change
    simulation = d3.forceSimulation();

    // Add forces and associate each with a name
    simulation
        .force("center", d3.forceCenter())
        .force("link", d3.forceLink())
        .force("charge", d3.forceManyBody())
        .force("collide", d3.forceCollide())
        .force("forceX", d3.forceX())
        .force("forceY", d3.forceY());

    // Apply properties to each of the forces
    const centerX = width * forceProperties.center.x;
    const centerY = height * forceProperties.center.y;

    simulation.force("center").x(centerX).y(centerY);

    // Configure forces based on mode
    if (mode === "usuário") {
        // Adjust force properties for user mode
        simulation.force("charge").strength(-50).distanceMin(10).distanceMax(300);
        simulation.force("collide").radius(15).strength(0.7);
    } else {
        // Default force properties for project mode
        simulation.force("charge").strength(forceProperties.charge.strength)
            .distanceMin(forceProperties.charge.distanceMin)
            .distanceMax(forceProperties.charge.distanceMax);
        simulation.force("collide").radius(forceProperties.collide.radius)
            .strength(forceProperties.collide.strength);
    }

    // Configure link force
    const linkForce = simulation.force("link");
    linkForce
        .id((d) => d.id)
        .distance(forceProperties.link.distance)
        .iterations(forceProperties.link.iterations);

    // Set links
    try {
        linkForce.links(links);
    } catch (error) {
        console.error("Error setting links:", error);
    }

    // Set nodes and tick handler
    simulation.nodes(nodes).on("tick", ticked);

    // Start simulation
    simulation.alpha(1).restart();

    // Visualize the data
    updateDisplay();
}

/**
 * Update all aspects of the visualization
 * @param {Array} links - The links data
 * @param {number} alpha - The alpha value for the simulation
 */
export function updateAll(links, alpha) {
    updateForces(links, alpha);
    updateDisplay();
}

/**
 * Drag started handler
 */
function dragstarted(event, d) {
    if (!event.active) {
        simulation.alphaTarget(1).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
    d3.selectAll("g.nodes").attr("cursor", "grabbing");
}

/**
 * Dragged handler
 */
function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

/**
 * Drag ended handler
 */
function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0.0001);
    d.fx = null;
    d.fy = null;
    d3.selectAll("g.nodes").attr("cursor", "grab");
}

/**
 * Focus handler for node hover
 */
function focus(event, d) {
    d3.selectAll("g.nodes")
        .selectAll("text")
        .style("display", function (o) {
            return o.id == d.id ? "block" : "none";
        });
}

/**
 * Unfocus handler for node hover
 */
function unfocus() {
    d3.selectAll("g.nodes").selectAll("text").style("display", "none");
}

/**
 * Run simulation in a web worker
 * @param {Array} nodes - The nodes data
 * @param {Array} links - The links data
 */
function runSimulationInWebWorker(nodes, links) {
    // Create worker
    simulationWorker = new Worker('./js/utils/simulationWorker.js');

    // Listen for messages from worker
    simulationWorker.onmessage = function (e) {
        const msg = e.data;

        if (msg.type === 'progress') {
            // Update progress indicator
            const progress = Math.round(msg.progress * 100);
            d3.select("#alpha_value")
                .style("flex-basis", progress + "%")
                .attr("aria-valuenow", progress);

            // Update loading message with more detailed information
            d3.select("#loading-message").text(
                `Calculating network layout... (${msg.iteration}/${msg.totalIterations}, ${progress}% complete)`
            );
        } else if (msg.type === 'complete') {
            console.log(`Worker completed ${msg.iterations} iterations`);

            // Update node positions from worker
            nodes.forEach((node, i) => {
                node.x = msg.nodes[i].x;
                node.y = msg.nodes[i].y;
            });

            // Clean up worker
            simulationWorker.terminate();
            simulationWorker = null;

            // Finish simulation
            finishSimulation();
        }
    };

    // Start the worker
    simulationWorker.postMessage({
        type: 'init',
        nodes: nodes,
        links: links,
        width: width,
        height: height
    });
}

/**
 * Save the graph as SVG
 */
export function saveAsSVG() {
    // Get svg element
    let svgElement;

    if (d3.select('#graph-view').style('display') !== 'none') {
        svgElement = document.getElementById('main_svg');
    } else if (d3.select('#beeswarm-view').style('display') !== 'none') {
        svgElement = document.getElementById('beeswarm_svg');
    } else {
        alert('No visualization is currently visible.');
        return;
    }

    // Get svg source
    var serializer = new XMLSerializer();
    var source = serializer.serializeToString(svgElement);

    // Add name spaces
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(
            /^<svg/,
            '<svg xmlns="http://www.w3.org/2000/svg"'
        );
    }
    if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
        source = source.replace(
            /^<svg/,
            '<svg xmlns:xlink="http://www.w3.org/1999/xlink"'
        );
    }

    // Add xml declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

    // Convert svg source to URI data scheme
    var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);

    // Set url value to a element's href attribute
    let linkSvg = document.getElementById("link_svg");
    linkSvg.setAttribute("href", url);
    linkSvg.setAttribute("download", "graph.svg");
    linkSvg.click();
} 
