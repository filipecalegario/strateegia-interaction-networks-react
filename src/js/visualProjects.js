const svg = d3.select("svg");
const projectChooser = d3.select("#project-chooser");
const widthProjectChooser = projectChooser.node().getBoundingClientRect();
let width = widthProjectChooser.width;
let height = 1000;
const g = svg.append("g");
// g.append("rect").attr("width", 2).attr("height", 2).attr("fill", "black");
let toggle = false;

// Performance optimization variables
let isSimulationStabilizing = false;
let tickCounter = 0;
const TICKS_PER_RENDER = 10; // Only render every X ticks during simulation
const STABILITY_THRESHOLD = 0.001; // Alpha value threshold for considering simulation stable
const USE_WEB_WORKER_THRESHOLD = 500; // Use web worker for networks larger than this (lowered from 1000)
let useWebWorker = false;
let simulationWorker = null;

// update size-related forces
d3.select(window).on("resize", function () {
    // width = +svg.node().getBoundingClientRect().width;
    // height = +svg.node().getBoundingClientRect().height;
    // updateForces(consolidated_data.links);
    const projectChooser = d3.select("#project-chooser");
    const widthProjectChooser = projectChooser.node().getBoundingClientRect();
    width = widthProjectChooser.width;
    height = widthProjectChooser.height;
    //updateForces(data_links);
});

d3.select(window).on("load", function () {
    // d3.select("#filter-users").attr("checked", "true");
});

const zoom = d3
    .zoom()
    .extent([
        [0, 0],
        [width, height],
    ])
    .scaleExtent([0.3, 8])
    .on("zoom", zoomed);

svg.call(zoom);

function zoomed({ transform }) {
    g.attr("transform", transform);
}

let dataForExport = {};

export function setDataForExport(data) {
    dataForExport = data;
}

// svg objects
// let link;
// let node;
// let data;

// values for all forces
let forceProperties = {
    center: {
        x: 0.5,
        y: 0.5,
    },
    charge: {
        enabled: true,
        strength: -30,
        distanceMin: 1,
        distanceMax: 387.8,
    },
    collide: {
        enabled: true,
        strength: 0.01,
        iterations: 1,
        radius: 10,
    },
    forceX: {
        enabled: false,
        strength: 0.1,
        x: 0.5,
    },
    forceY: {
        enabled: false,
        strength: 0.1,
        y: 0.5,
    },
    link: {
        enabled: true,
        distance: 35,
        iterations: 5,
    },
};

// Dynamic force properties based on node count
function adjustForcePropertiesForNodeCount(nodeCount) {
    // For large networks, adjust force parameters for better performance and stability
    if (nodeCount > 2000) {
        // Very large networks - minimal forces for performance
        forceProperties.charge.strength = -5;
        forceProperties.charge.distanceMax = 150;
        forceProperties.collide.iterations = 1;
        forceProperties.link.iterations = 1;
        forceProperties.link.distance = 20; // Shorter links
        forceProperties.collide.radius = 5; // Smaller collision radius
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
        forceProperties.charge.strength = -30;
        forceProperties.charge.distanceMax = 387.8;
        forceProperties.collide.iterations = 1;
        forceProperties.link.iterations = 5;
        forceProperties.link.distance = 35;
        forceProperties.collide.radius = 10;
    }

    console.log(`Adjusted force properties for ${nodeCount} nodes`);
}

//////////// FORCE SIMULATION ////////////

// force simulator
const simulation = d3.forceSimulation();

// set up the simulation and event to update locations after each tick
export function initializeSimulation(data_nodes, data_links) {
    // Show loading spinner
    d3.select("#loading-spinner").style("display", "block");
    d3.select("#graph-view").style("display", "none");

    // Reset counters and flags
    tickCounter = 0;
    isSimulationStabilizing = true;

    // Determine if we should use web worker based on node count
    useWebWorker = data_nodes.length > USE_WEB_WORKER_THRESHOLD && window.Worker;

    if (useWebWorker) {
        console.log(`Using Web Worker for ${data_nodes.length} nodes`);
        runSimulationInWebWorker(data_nodes, data_links);
    } else {
        // Adjust force properties based on node count
        adjustForcePropertiesForNodeCount(data_nodes.length);

        // Set up simulation
        simulation.nodes(data_nodes).on("tick", ticked);
        initializeForces(data_nodes, data_links);

        // Determine number of pre-calculation iterations based on network size
        const nodeCount = data_nodes.length;
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

// Function to run pre-calculation iterations without rendering
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

// Function to check if simulation has stabilized enough
function checkStability() {
    if (!isSimulationStabilizing) return;

    // Update loading message with current alpha value
    const stabilityPercent = Math.round((1 - simulation.alpha()) * 100);
    d3.select("#loading-message").text(`Refining network layout... (stability: ${stabilityPercent}%)`);

    // Check if simulation is stable enough
    if (simulation.alpha() < STABILITY_THRESHOLD) {
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

// Function to calculate average node movement
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

// Function to finish simulation and show results
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

// Function to render current positions
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

// add forces to the simulation
function initializeForces(data_nodes, data_links) {
    // add forces and associate each with a name
    simulation
        .force("center", d3.forceCenter())
        .force("link", d3.forceLink())
        .force("charge", d3.forceManyBody())
        .force("collide", d3.forceCollide())
        .force("forceX", d3.forceX())
        .force("forceY", d3.forceY());

    // apply properties to each of the forces
    updateForces(data_links);
}

function updateForces(data_links, alpha = 0.2) {
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
        forces[forceName].forEach((property) => {
            let value = forceProperties[forceName][property];
            if (property === "strength" || property === "iterations") {
                value *= forceProperties[forceName].enabled ? 1 : 0;
            }
            force[property](value);
        });
    }

    simulation.force("center").x(centerX).y(centerY);

    // Separate link force due to its specific requirements
    const linkForce = simulation.force("link");
    linkForce
        .id((d) => d.id)
        .distance(forceProperties.link.distance)
        .iterations(forceProperties.link.iterations);

    if (forceProperties.link.enabled) {
        linkForce.links(data_links);
    } else {
        linkForce.links([]);
    }

    simulation.alpha(alpha).restart();
}

//////////// DISPLAY ////////////

// color = d3.scaleOrdinal(d3.schemeCategory10); "#377eb8"

// generate the svg objects and force simulation
export function buildGraph(data_nodes, data_links) {
    let categorias = [
        "project",
        "map",
        "divpoint",
        "question",
        "comment",
        "reply",
        "agreement",
        "user",
        "users",
    ];
    let colors = [
        "#023a78",
        "#0b522e",
        "#ff8000",
        "#974da2",
        "#e51d1d",
        "#377eb8",
        "#4eaf49",
        "#636c77",
        "#b2b7bd",
    ];
    // let colors =     ["#ac92ea", "#e3b692", "#ed7d31", "#3aadd9", "#eb5463", "#46ceac", "#fdcd56", "#d56fac", "#636c77"];
    // simulation.stop();
    svg.style("width", width + "px")
        .style("height", height + "px")
        .attr("viewBox", [0, 0, width, height]);

    const color = d3.scaleOrdinal().domain(categorias).range(colors);

    const node_size = d3
        .scaleOrdinal()
        .domain(categorias)
        .range([10, 9, 8, 7, 6, 4, 3, 7, 9]);

    // === LINKS ===
    let links_selection = g.selectAll("line.links").data(data_links);

    // Update existing links
    // (add any attribute or style updates required for existing links here)
    // Example:
    links_selection.style("stroke", "#aaa");

    // Enter new links
    links_selection
        .enter()
        .append("line")
        .attr("class", "links")
        .style("stroke", "#aaa");

    // Exit old links
    links_selection.exit().remove();

    // === NODES ===
    let nodes_selection = g.selectAll("g.nodes").data(data_nodes, (d) => d.id);

    // Update existing nodes
    nodes_selection
        .select("circle")
        .attr("fill", (d) => color(d.group))
        .attr("r", (d) => node_size(d.group));

    // Enter new nodes
    let node_group = nodes_selection
        .enter()
        .append("g")
        .attr("class", "nodes")
        .attr("cursor", "grab");

    let t = d3.transition().duration(500).ease(d3.easeLinear);

    node_group
        .append("a")
        .attr("xlink:href", (d) => d.dashboardUrl)
        .attr("target", "_blank")
        .append("circle")
        .attr("fill", "white")
        .attr("r", 0)
        .transition(t)
        .attr("r", (d) => node_size(d.group))
        .attr("fill", (d) => color(d.group))
        .attr("id", (d) => d.id);

    node_group
        .append("text")
        .text((d) => d.title)
        .attr("x", 6)
        .attr("y", 3)
        .style("display", "none");

    // Node tooltip
    node_group.append("title").text((d) => d.title);

    // Drag behaviors
    const drag = d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);

    node_group
        .call(drag)
        .on("mouseover", focus)
        .on("mouseout", unfocus)
        .each(function (d) {
            d.x = d.x || d.x === 0 ? width * 0.5 : d.x;
            d.y = d.y || d.y === 0 ? height * 0.5 : d.y;
        });

    simulation.nodes(data_nodes).on("tick", ticked);
    simulation.force("link").links(data_links);

    // Exit old nodes
    nodes_selection.exit().remove();

    // visualize the data
    updateDisplay();
}

// update the display based on the forces (but not positions)
function updateDisplay() {
    d3.selectAll("line.links")
        .attr("stroke-width", forceProperties.link.enabled ? 1 : 0.5)
        .attr("opacity", forceProperties.link.enabled ? 1 : 0)
        .lower();
}

// update the display positions after each simulation tick
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
        if (tickCounter % TICKS_PER_RENDER !== 0) return;
    }

    // Render current positions
    renderPositions();
}

//////////// UI EVENTS ////////////

function dragstarted(event, d) {
    if (!event.active) {
        simulation.alphaTarget(1).restart();
        // simulation.alpha(1).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
    d3.selectAll("g.nodes").attr("cursor", "grabbing");
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0.0001);
    d.fx = null;
    d.fy = null;
    d3.selectAll("g.nodes").attr("cursor", "grab");
}

function focus(event, d) {
    d3.selectAll("g.nodes")
        .selectAll("text")
        .style("display", function (o) {
            return o.id == d.id ? "block" : "none";
        });
}

function unfocus(d) {
    d3.selectAll("g.nodes").selectAll("text").style("display", "none");
}

export function updateAll(data_links, alpha) {
    console.log("dataLinks %o", data_links);
    updateForces(data_links, alpha);
    updateDisplay();
}

export function saveJson() {
    var dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(dataForExport));
    var dlAnchorElem = document.getElementById("downloadAnchorElem");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "consolidated_data.json");
    dlAnchorElem.click();
}

export function saveAsSVG() {
    //get svg element.
    var svg = document.getElementById("main_svg");

    //get svg source.
    var serializer = new XMLSerializer();
    var source = serializer.serializeToString(svg);

    //add name spaces.
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

    //add xml declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

    //convert svg source to URI data scheme.
    var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);

    //set url value to a element's href attribute.
    let link_svg = document.getElementById("link_svg");
    // link_svg.href = url;
    link_svg.setAttribute("href", url);
    link_svg.setAttribute("download", "graph.svg");
    link_svg.click();
    //you can download svg file by right click menu.
}

//   .filter(time => data.nodes.some(d => contains(d, time)))

// Function to run simulation in a web worker
function runSimulationInWebWorker(data_nodes, data_links) {
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
            data_nodes.forEach((node, i) => {
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
        nodes: data_nodes,
        links: data_links,
        width: width,
        height: height
    });
}
