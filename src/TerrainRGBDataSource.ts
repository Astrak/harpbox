import * as THREE from "three";
import { SphericalGeometrySubdivisionModifier } from "@here/harp-geometry/lib/SphericalGeometrySubdivisionModifier";
import {
    ProjectionType,
    TileKey,
    TilingScheme,
    webMercatorTilingScheme,
} from "@here/harp-geoutils";
import { DataSource, Tile } from "@here/harp-mapview";

const textureLoader = new THREE.TextureLoader();
textureLoader.crossOrigin = ""; // empty assignment required to support CORS

/**
 * Class to plug RGB encoded terrain into harpgl's [[MapView]].
 */
export class TerrainRGBDataSource extends DataSource {
    /**
     * Constructs a new `WebTileDataSource`.
     *
     * @param m_accessKey The Mapbox access key.
     */
    constructor(private readonly m_accessKey: string) {
        super("terraintile", undefined, 1, 20);
        this.cacheable = true;
        this.storageLevelOffset = -1;
    }

    /** @override */
    shouldPreloadTiles(): boolean {
        return true;
    }

    /** @override */
    getTilingScheme(): TilingScheme {
        return webMercatorTilingScheme;
    }

    /** @override */
    getTile(tileKey: TileKey): Tile {
        const tile = new Tile(this, tileKey);
        const url =
            `https://api.mapbox.com/v4/mapbox.terrain-rgb/` +
            `${tileKey.level}/${tileKey.column}/${tileKey.row}@2x.pngraw?access_token=` +
            `${this.m_accessKey}`;

        Promise.resolve(this.loadTexture(url))
            .then(texture => {
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;
                // Size is 512 when "@2x" is added after the tile key in the URL, 256 otherwise.
                const size = texture.image.width;

                const shouldSubdivide =
                    this.projection.type === ProjectionType.Spherical;
                const sourceProjection = this.getTilingScheme().projection;

                const tmpV = new THREE.Vector3();
                tile.boundingBox.getSize(tmpV);
                tile.addOwnedTexture(texture);
                const terrain = this.createTerrain(
                    tmpV.x,
                    tmpV.y,
                    size,
                    texture,
                    tile.center
                );

                // This is taken from the code for the background plane in OmvDataSource
                // but doesn't work here for the sphere projection somehow. Requires fix.
                if (shouldSubdivide) {
                    const modifier = new SphericalGeometrySubdivisionModifier(
                        (10 / 180) * Math.PI,
                        sourceProjection
                    );
                    modifier.modify(terrain.geometry as THREE.BufferGeometry);
                }

                tile.objects.push(terrain);
                tile.invalidateResourceInfo();
                this.requestUpdate();
            })
            .catch(error => {
                console.error(
                    `failed to load RGBTerrain tile ${tileKey.mortonCode()}: ${error}`
                );
            });
        return tile;
    }

    private createTerrain(
        width: number,
        height: number,
        size: number,
        heightMap: THREE.Texture,
        planeCenter: THREE.Vector3
    ): THREE.Mesh {
        // TODO: limit terrain detail to a specific zoomLevel (Mapbox's RGB terrain
        // is limited to 15 anyway).
        const maxZoomLevel = 13;

        // Number of vertices per side of tile, below maxZoomLevel. The tiles are 512x512
        // but this results in too many vertices. Performance is very acceptable up to 150.
        // Lower is even better for low perf devices and the relief just needs to be
        // symbolic, as the vector data rendering already is. Downside: mountain ranges
        // are not visible at 1-6 zoom levels around 100.
        const maxRes = 150;

        const z = Math.floor(this.mapView.zoomLevel);
        const res = maxRes; //z <= maxZoomLevel ? maxRes : maxRes / (2 * (z - maxZoomLevel));
        const geometry = new THREE.PlaneBufferGeometry(
            width,
            height,
            res,
            res - 2 // Needed to avoid gaps??
        );
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(heightMap.image as CanvasImageSource, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size + 1, size).data; // Needed to avoid shifts??
        for (let row = 0; row < res; row++) {
            const rowOnImage = Math.floor((row / res) * size);
            for (let column = 0; column < res; column++) {
                const columnOnImage = Math.floor((column / res) * size);
                const indexOnImage = (rowOnImage * size + columnOnImage) * 4;
                const R = imgData[indexOnImage];
                const G = imgData[indexOnImage + 1];
                const B = imgData[indexOnImage + 2];
                const height = -10000 + (R * 256 * 256 + G * 256 + B) * 0.1;
                const index = row * res + column;
                geometry.attributes.position.setZ(index, height);
            }
        }
        geometry.computeVertexNormals();

        const material = new THREE.MeshLambertMaterial({
            color: 0xc0b3aa,
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.position.copy(planeCenter);
        return plane;
    }

    private loadTexture(url: string): Promise<THREE.Texture> {
        return new Promise((resolve, reject) => {
            textureLoader.load(
                url,
                texture => resolve(texture),
                undefined, // The "onProgress" event's callback.
                () => reject(new Error("failed to load texture"))
            );
        });
    }
}
