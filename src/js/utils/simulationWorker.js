// Import D3.js
importScripts('https://d3js.org/d3.v6.min.js');

let simulation;
let nodes;
let links;

self.onmessage = function (e) {
    const msg = e.data;

    if (msg.type === 'init') {
        nodes = msg.nodes;
        links = msg.links;

        // Determine number of iterations based on network size
        const nodeCount = nodes.length;
        let iterations = 300; // Default

        // Scale iterations based on network size
        if (nodeCount > 2000) {
            iterations = 1000;
        } else if (nodeCount > 1000) {
            iterations = 800;
        } else if (nodeCount > 500) {
            iterations = 600;
        } else if (nodeCount > 200) {
            iterations = 400;
        }

        console.log(`Worker running ${iterations} iterations for ${nodeCount} nodes`);

        // Create simulation with optimized parameters for large networks
        simulation = d3.forceSimulation(nodes)
            .force("center", d3.forceCenter(msg.width / 2, msg.height / 2))
            .force("charge", d3.forceManyBody().strength(-10).distanceMax(200))
            .force("collide", d3.forceCollide(10).strength(0.01).iterations(1))
            .force("link", d3.forceLink(links).id(d => d.id).distance(35).iterations(1));

        // Stop the automatic ticking
        simulation.stop();

        // Implement a cooling schedule for better layout
        // Start with high alpha and gradually decrease
        let currentAlpha = 0.8;
        const minAlpha = 0.001;
        const coolingFactor = Math.pow(minAlpha / currentAlpha, 1 / iterations);

        // Run many ticks at once for better performance
        for (let i = 0; i < iterations; i++) {
            // Set alpha for this iteration
            simulation.alpha(currentAlpha);

            // Run one tick
            simulation.tick();

            // Cool down
            currentAlpha *= coolingFactor;

            // Report progress periodically
            if (i % Math.floor(iterations / 10) === 0 || i === iterations - 1) {
                self.postMessage({
                    type: 'progress',
                    progress: i / iterations,
                    alpha: currentAlpha,
                    iteration: i,
                    totalIterations: iterations
                });
            }
        }

        // Final stabilization phase - run additional ticks with very low alpha
        for (let i = 0; i < 50; i++) {
            simulation.alpha(0.0005).tick();
        }

        // Send final node positions
        self.postMessage({
            type: 'complete',
            nodes: nodes,
            links: links,
            iterations: iterations
        });
    }
}; 
