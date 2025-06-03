import { NODE_GROUPS, NODE_COLORS } from '../core/config.js';
// Execute when DOM is fully loaded 
// document.addEventListener('DOMContentLoaded', async () => {
//     // Get data from the mockup function
//     const data = await gatherMockupGraphData2();
//     // Log the loaded data
//     console.log("Mockup graph data loaded:", data);
//     initBeeswarm(data);
// });

export async function initBeeswarm(data) {
    // Constantes de configuração
    const categorias = NODE_GROUPS;
    const colors = NODE_COLORS;
    const containerWidth = d3.select("#beeswarm-view").node().getBoundingClientRect().width;
    const width = containerWidth, height = 700;
    const margin = { top: 10, right: 10, bottom: 50, left: 10 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Escala ordinal para cores
    const colorGroup = d3.scaleOrdinal().domain(categorias).range(colors);

    // Seleciona e configura o SVG
    const _svg = d3.select("#beeswarm_svg")
        .selectAll("*").remove() // Limpa conteúdos anteriores
        .exit().select(function () { return this; }); // Garante que continuamos com a seleção correta

    d3.select("#beeswarm_svg")
        .attr("width", width)
        .attr("height", height);

    // Cria o grupo principal que receberá a transformação
    const g = d3.select("#beeswarm_svg").append("g");

    // Configura as datas e os tamanhos dos nós
    data.nodes.forEach(d => {
        d.date = d.createdAt;
    });

    const minTitleLength = d3.min(data.nodes, d => d.title ? d.title.length : 0);
    const maxTitleLength = d3.max(data.nodes, d => d.title ? d.title.length : 0);

    const radiusScale = d3.scaleLinear()
        .domain([minTitleLength, maxTitleLength])
        .range([3, 15])
        .clamp(true);

    data.nodes.forEach(d => {
        d.radius = radiusScale(d.title ? d.title.length : 0);
    });

    // Escala de tempo para o eixo X
    const xScale = d3.scaleTime()
        .domain(d3.extent(data.nodes, d => d.date))
        .range([0, innerWidth])
        .nice();

    // Configura e roda a simulação de forças
    const simulation = d3.forceSimulation(data.nodes)
        .force("x", d3.forceX(d => xScale(d.date)).strength(1))
        .force("y", d3.forceY(innerHeight / 2))
        .force("collide", d3.forceCollide(d => d.radius + 2))
        .stop();

    for (let i = 0; i < 300; i++) simulation.tick();

    // Calcula os limites dos nós utilizando reduce
    const bounds = data.nodes.reduce((acc, d) => ({
        minX: Math.min(acc.minX, d.x - d.radius),
        maxX: Math.max(acc.maxX, d.x + d.radius),
        minY: Math.min(acc.minY, d.y - d.radius),
        maxY: Math.max(acc.maxY, d.y + d.radius)
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

    // Adiciona padding e calcula o scale para "zoom to fit"
    const padding = 20;
    bounds.minX -= padding; bounds.maxX += padding;
    bounds.minY -= padding; bounds.maxY += padding;

    // Calcular escala e translação para zoom to fit
    const xScale_ = innerWidth / (bounds.maxX - bounds.minX);
    const yScale_ = innerHeight / (bounds.maxY - bounds.minY);
    const scale = Math.min(xScale_, yScale_);

    // Calcular offsets para centralizar o conteúdo no SVG
    const offsetX = (innerWidth - ((bounds.maxX - bounds.minX) * scale)) / 2;
    const offsetY = (innerHeight - ((bounds.maxY - bounds.minY) * scale)) / 2;

    // Aplicar transformação ao grupo principal
    g.attr("transform", `translate(${margin.left + offsetX}, ${margin.top + offsetY}) scale(${scale}) translate(${-bounds.minX}, ${-bounds.minY})`);

    // Adiciona os círculos representando os nós
    g.selectAll("circle")
        .data(data.nodes)
        .enter().append("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => d.radius)
        .attr("fill", d => colorGroup(d.group))
        .append("title")
        .text(d => `${d.title} (${d.group}) - ${d.title ? d.title.length : 0} chars`);

    // Adiciona o eixo X e formata os ticks da timeline
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b '%y"));
    g.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-0.2em")
        .attr("dy", "0.6em")
        .attr("transform", "rotate(-45)");

    // Rótulo do eixo X
    g.append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 60)
        .text("Timeline");

    // ----- External Legends as separate SVGs -----
    // Create or select a container div for legends within the page layout
    let legendContainer = d3.select('#legend-container');
    legendContainer.selectAll('*').remove();
    if (legendContainer.empty()) {
        legendContainer = d3.select('body').append('div')
            .attr('id', 'legend-container')
            .attr('class', 'row legend-container')
            .style('margin-top', '20px');
    }

    // External SVG for node size legend (horizontal layout)
    const sizeLegendSVG = legendContainer.append('svg')
        .attr('id', 'size-legend-svg')
        .attr('width', 400)  // Increased width for horizontal arrangement
        .attr('height', 70)
        .style('margin', '10px');

    const sizeLegendGroup = sizeLegendSVG.append('g')
        .attr('transform', 'translate(10, 20)');

    // Title for node size legend
    sizeLegendGroup.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .text('Node Size: Title Length')
        .style('font-weight', 'bold');

    // Prepare data for node size legend
    const sizeLegendData = [
        { label: `${d3.min(data.nodes, d => d.title ? d.title.length : 0)} chars`, radius: radiusScale(d3.min(data.nodes, d => d.title ? d.title.length : 0)) },
        { label: `${Math.floor((d3.min(data.nodes, d => d.title ? d.title.length : 0) + d3.max(data.nodes, d => d.title ? d.title.length : 0)) / 2)} chars`, radius: radiusScale(Math.floor((d3.min(data.nodes, d => d.title ? d.title.length : 0) + d3.max(data.nodes, d => d.title ? d.title.length : 0)) / 2)) },
        { label: `${d3.max(data.nodes, d => d.title ? d.title.length : 0)} chars`, radius: radiusScale(d3.max(data.nodes, d => d.title ? d.title.length : 0)) }
    ];

    // Arrange legend items horizontally
    let xOffsetLegend = 0;
    const legendY = 30; // fixed vertical position
    sizeLegendData.forEach(item => {
        const legendItemGroup = sizeLegendGroup.append('g')
            .attr('transform', `translate(${xOffsetLegend}, ${legendY})`);
        legendItemGroup.append('circle')
            .attr('cx', item.radius)
            .attr('cy', 0)
            .attr('r', item.radius)
            .attr('fill', '#666');
        legendItemGroup.append('text')
            .attr('x', item.radius * 2 + 5)
            .attr('y', 5)
            .text(item.label)
            .style('font-size', '12px');
        // Increase xOffset for next item (circle diameter + text spacing; adjust as needed)
        xOffsetLegend += item.radius * 2 + 60;
    });

    // External SVG for node color legend (horizontal layout)
    const colorLegendSVG = legendContainer.append('svg')
        .attr('id', 'color-legend-svg')
        .attr('width', 800)  // Increased width from 400 to 600
        .attr('height', 70)
        .style('margin', '10px');

    const colorLegendGroup = colorLegendSVG.append('g')
        .attr('transform', 'translate(10, 20)');

    // Title for node color legend
    colorLegendGroup.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .text('Node Color: Type')
        .style('font-weight', 'bold');

    // Arrange color legend items horizontally
    let xOffsetColorLegend = 0;
    const colorLegendY = 30;
    categorias.forEach((category, i) => {
        const legendItem = colorLegendGroup.append('g')
            .attr('transform', `translate(${xOffsetColorLegend}, ${colorLegendY})`);
        legendItem.append('rect')
            .attr('x', 0)
            .attr('y', -10)
            .attr('width', 20)
            .attr('height', 20)
            .attr('fill', colors[i]);
        legendItem.append('text')
            .attr('x', 25)
            .attr('y', 5)
            .text(category)
            .style('font-size', '12px');
        // Increase xOffset for next color item; adjust as needed
        xOffsetColorLegend += 90;
    });
}
