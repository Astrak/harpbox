import { APIFormat, OmvDataSource } from "@here/harp-omv-datasource";
import { MapControls, MapControlsUI } from "@here/harp-map-controls";
import { MapView, CopyrightElementHandler } from "@here/harp-mapview";
import { TerrainRGBDataSource } from "./TerrainRGBDataSource";
import { GeoCoordinates } from "@here/harp-geoutils";

const map = new MapView({
    canvas: document.getElementsByTagName("canvas")[0],
    theme: "./harpbox.json",
    enableNativeWebglAntialias: false,
    tileCacheSize: 50,
});
window.addEventListener("resize", () => {
    map.resize(window.innerWidth, window.innerHeight);
});

CopyrightElementHandler.install("copyrightNotice", map);
CopyrightElementHandler.install("copyrightNotice")
    .attach(map)
    .setDefaults([
        {
            id: "openstreetmap.org",
            label: "OpenStreetMap contributors",
            link: "https://www.openstreetmap.org/copyright",
        },
    ]);

const omvDataSource = new OmvDataSource({
    concurrentDecoderScriptUrl: "dist/harp-worker.bundle.js",
    baseUrl: "https://xyz.api.here.com/tiles/osmbase/512/all",
    apiFormat: APIFormat.XYZMVT,
    styleSetName: "tilezen",
    maxZoomLevel: 17,
    authenticationCode: "AGln99HORnqL1kfIQtsQl70",
});
map.addDataSource(omvDataSource).then(() => {
    omvDataSource.setLanguages(["en"]);
});

const mapboxAccessKey =
    "pk.eyJ1IjoiZHVtYmxlZG9yZTk5IiwiYSI6ImNqc29meGFjeTBrYTk0M255eHZueWtydHMifQ.CJEbodjhMFYCdm8nmCsMhg";
const terrain = new TerrainRGBDataSource(mapboxAccessKey);
map.addDataSource(terrain);

const controls = new MapControls(map);
controls.maxTiltAngle = 50;

const ui = new MapControlsUI(controls, {
    zoomLevel: "input",
});
map.canvas.parentElement!.appendChild(ui.domElement);
map.lookAt(new GeoCoordinates(12.03, -61.75), 9000, 0);
