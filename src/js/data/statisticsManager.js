/**
 * Statistics Manager Module
 * Handles counting and statistics for the visualization
 */

import { COUNTER_CATEGORIES, getCounterFiltersByMode } from "../core/config.js";
import { filterArray } from "./dataManager.js";

// Counter data
let counterData = [...COUNTER_CATEGORIES];

/**
 * Reset counter data to initial values
 */
export function resetCounters() {
    counterData = [...COUNTER_CATEGORIES];
    counterData.forEach(counter => {
        counter.quant = 0;
    });
}

/**
 * Get counter data
 * @returns {Array} The counter data
 */
export function getCounters() {
    return counterData;
}

/**
 * Count statistics from the filtered data
 * @param {Object} data - The filtered data
 * @param {string} mode - The visualization mode
 * @returns {Array} The updated counter data
 */
export function countStatistics(data, mode) {
    // Reset counters
    resetCounters();

    // Count nodes by type
    for (let i = 0; i < data.nodes.length; i++) {
        const node = data.nodes[i];

        if (node.group === "user") {
            const userCounter = counterData.find(x => x.id === "users");
            userCounter.quant += 1;

            // Check if user has links in data.links
            const userLinks = data.links.filter(link => link.source === node.id);

            if (userLinks.length > 0) {
                const activeCounter = counterData.find(x => x.id === "active_users");
                activeCounter.quant += 1;
            } else {
                const inactiveCounter = counterData.find(x => x.id === "inactive_users");
                inactiveCounter.quant += 1;
            }
        } else if (node.group === "comment") {
            const commentCounter = counterData.find(x => x.id === "comments");
            commentCounter.quant += 1;
        } else if (node.group === "reply") {
            const replyCounter = counterData.find(x => x.id === "replies");
            replyCounter.quant += 1;
        } else if (node.group === "agreement") {
            const agreementCounter = counterData.find(x => x.id === "agreements");
            agreementCounter.quant += 1;
        } else if (node.group === "divpoint") {
            const divpointCounter = counterData.find(x => x.id === "divpoints");
            divpointCounter.quant += 1;
        } else if (node.group === "question") {
            const questionCounter = counterData.find(x => x.id === "questions");
            questionCounter.quant += 1;
        }
    }

    // Filter counters based on mode
    const filter = getCounterFiltersByMode(mode);
    const filteredCounters = filterArray(counterData, filter);

    return filteredCounters;
}

/**
 * Calculate indicators for the indicators mode
 * @param {Array} counters - The counter data
 * @returns {Object} The calculated indicators
 */
export function calculateIndicators(counters) {
    // Extract values from counters
    const usuarios = counters.find(d => d.id === "users").quant;
    const usuarios_ativos = counters.find(d => d.id === "active_users").quant;
    const usuarios_inativos = counters.find(d => d.id === "inactive_users").quant;
    const questoes_num = counters.find(d => d.id === "questions").quant;
    const respostas_num = counters.find(d => d.id === "comments").quant;
    const comentarios_num = counters.find(d => d.id === "replies").quant;
    const concordar_num = counters.find(d => d.id === "agreements").quant;

    // Calculate derived values
    const indice_atividade = (usuarios_ativos / usuarios) * 100;
    const interacoes_num = comentarios_num + concordar_num;
    const respostas_reduzidas = respostas_num / 2;
    const respostas_potenciais = usuarios_ativos * questoes_num;
    const interacoes_potenciais = usuarios_ativos * respostas_reduzidas;
    const engajamento_questoes = (respostas_num / respostas_potenciais) * 100;
    const engajamento_interacoes = (interacoes_num / interacoes_potenciais) * 100;
    const engajamento_media = (engajamento_questoes + engajamento_interacoes) / 2;

    return {
        usuarios,
        usuarios_ativos,
        usuarios_inativos,
        indice_atividade: indice_atividade.toFixed(2),
        questoes_num,
        respostas_num,
        respostas_potenciais,
        engajamento_questoes: engajamento_questoes.toFixed(2),
        comentarios_num,
        concordar_num,
        interacoes_num,
        interacoes_potenciais,
        engajamento_interacoes: engajamento_interacoes.toFixed(2),
        engajamento_media: engajamento_media.toFixed(2)
    };
} 
