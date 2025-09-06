/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}", // your Next.js/React files
        "./components/**/*.{js,ts,jsx,tsx}",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Sidebar theme tokens
                sidebar: "var(--sidebar)",
                "sidebar-foreground": "var(--sidebar-foreground)",
                "sidebar-accent": "var(--sidebar-accent)",
                "sidebar-accent-foreground": "var(--sidebar-accent-foreground)",
                "sidebar-border": "var(--sidebar-border)",
            },
        },
    },
    plugins: [],
};
