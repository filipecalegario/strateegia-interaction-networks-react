/**
 * Authentication Module
 * Handles user authentication
 */

import { auth, getUser } from "https://unpkg.com/strateegia-api/strateegia-api.js";

/**
 * Initialize login functionality
 */
export function initializeLogin() {
    const btnLogin = document.getElementById("btnLogin");

    if (btnLogin) {
        btnLogin.addEventListener("click", (e) => {
            console.log("btnLogin clicked");
            const usernameElement = document.getElementById("username");
            const passwordElement = document.getElementById("password");

            const queryString = window.location.search;
            const urlParams = new URLSearchParams(queryString);
            const selectedMode = urlParams.get('mode') || "projeto";

            const username = usernameElement.value;
            const password = passwordElement.value;

            auth(username, password).then((token) => {
                console.log(token);
                localStorage.setItem("strateegiaAccessToken", token);
                location.href = `main.html?mode=${selectedMode}`;
            }).catch(error => {
                console.error("Authentication failed:", error);
                alert("Authentication failed. Please check your credentials.");
            });
        });
    }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export async function checkAuthentication() {
    const accessToken = localStorage.getItem("strateegiaAccessToken");

    if (!accessToken || accessToken === 'undefined') {
        console.log("No access token");
        return false;
    }

    try {
        const user = await getUser(accessToken);
        localStorage.setItem("userId", user.id);
        return true;
    } catch (error) {
        console.error("Authentication check failed:", error);
        return false;
    }
}

/**
 * Get current user
 * @returns {Promise<Object>} User object
 */
export async function getCurrentUser() {
    const accessToken = localStorage.getItem("strateegiaAccessToken");

    if (!accessToken || accessToken === 'undefined') {
        throw new Error("No access token");
    }

    return await getUser(accessToken);
}

/**
 * Logout user
 */
export function logout() {
    localStorage.removeItem("strateegiaAccessToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("selectedProject");
    localStorage.removeItem("selectedMode");

    // Redirect to login page
    location.href = "index.html";
} 
