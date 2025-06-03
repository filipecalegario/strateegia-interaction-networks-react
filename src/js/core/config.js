/**
 * Configuration module for the visualization
 * Contains all constants and configuration values
 */

// Visualization modes
export const USER_MODE = "usuário";
export const PROJECT_MODE = "projeto";
export const INDICATORS_MODE = "indicadores";
export const BEESWARM_MODE = "beeswarm";
export const DEFAULT_MODE = BEESWARM_MODE;

// Node groups and visual properties
export const NODE_GROUPS = [
    "project",
    "map",
    "divpoint",
    "question",
    "comment",
    "reply",
    "agreement",
    "user",
    "users"
];

export const NODE_COLORS = [
    "#023a78",
    "#0b522e",
    "#ff8000",
    "#974da2",
    "#e51d1d",
    "#377eb8",
    "#4eaf49",
    "#636c77",
    "#b2b7bd"
];

export const NODE_SIZES = [10, 9, 8, 7, 6, 4, 3, 7, 9];

// Counter categories
export const COUNTER_CATEGORIES = [
    { id: "users", title: "usuários", quant: 0, color: "#636c77" },
    { id: "active_users", title: "usuários ativos", quant: 0, color: "#636c77" },
    { id: "inactive_users", title: "usuários inativos", quant: 0, color: "#636c77" },
    { id: "comments", title: "respostas", quant: 0, color: "#e51d1d" },
    { id: "replies", title: "comentários", quant: 0, color: "#377eb8" },
    { id: "agreements", title: "concordar", quant: 0, color: "#4eaf49" },
    { id: "divpoints", title: "pontos divergência", quant: 0, color: "#ff8000" },
    { id: "questions", title: "questões", quant: 0, color: "#974da2" }
];

// Simulation parameters
export const SIMULATION_CONFIG = {
    TICKS_PER_RENDER: 10,
    STABILITY_THRESHOLD: 0.001,
    USE_WEB_WORKER_THRESHOLD: 500
};

// Force properties default values
export const DEFAULT_FORCE_PROPERTIES = {
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

// Filter configurations for different modes
export function getFiltersByMode(mode) {
    if (mode === USER_MODE) {
        return {
            group: (group) => ["comment", "reply", "agreement", "users", "user"].includes(group)
        };
    } else if (mode === PROJECT_MODE) {
        return {
            group: (group) => [
                "project",
                "map",
                "divpoint",
                "question",
                "comment",
                "reply",
                "agreement"
            ].includes(group)
        };
    } else if (mode === INDICATORS_MODE) {
        return {
            group: (group) => [
                "project",
                "map",
                "divpoint",
                "question",
                "comment",
                "reply",
                "agreement",
                "users",
                "user"
            ].includes(group)
        };
    } else if (mode === BEESWARM_MODE) {
        return {
            group: (group) => [
                "project",
                "map",
                "divpoint",
                "question",
                "comment",
                "reply"
            ].includes(group)
        };
    }
    return {};
}

// Counter filter configurations for different modes
export function getCounterFiltersByMode(mode) {
    if (mode === PROJECT_MODE) {
        console.log("getCounterFiltersByMode() PROJECT_MODE");
        return {
            id: (id) => [
                "comments",
                "replies",
                "agreements",
                "divpoints",
                "questions"
            ].includes(id)
        };
    } else if (mode === USER_MODE) {
        console.log("getCounterFiltersByMode() USER_MODE");
        return {
            id: (id) => [
                "comments",
                "replies",
                "agreements",
                "users",
                "active_users"
            ].includes(id)
        };
    } else if (mode === INDICATORS_MODE) {
        console.log("getCounterFiltersByMode() INDICATORS_MODE");
        return {
            id: (id) => [
                "comments",
                "replies",
                "agreements",
                "users",
                "questions",
                "active_users",
                "inactive_users"
            ].includes(id)
        };
    }
    return {};
} 
