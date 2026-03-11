// Allow CSS imports (e.g., leaflet/dist/leaflet.css)
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
