export async function authenticatedFetch(endpoint: string, options: RequestInit = {}) {
    const isServer = typeof window === "undefined";

    // Base URL
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://app180-backend.onrender.com";

    // Construir URL completa si es relativa
    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

    // Obtener token (prioridad sessionStorage para seguridad en tabs, fallback localStorage)
    const token = !isServer
        ? (sessionStorage.getItem("token") || localStorage.getItem("token"))
        : null;

    // Headers base
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // Fetch nativo
    const response = await fetch(url, {
        ...options,
        headers
    });

    // Manejo global de 401 (Token expirado)
    if (response.status === 401 && !isServer) {
        const currentPath = window.location.pathname;
        // Evitar bucle si ya estamos en login
        if (!currentPath.includes("/login")) {
            // Opcional: limpiar storage y redirigir
            // localStorage.removeItem("token");
            // window.location.href = "/login?expired=true";
        }
    }

    return response;
}
