import * as THREE from "three";
import { SphericalGeometrySubdivisionModifier } from "@here/harp-geometry/lib/SphericalGeometrySubdivisionModifier";
import {
    ProjectionType,
    TileKey,
    TilingScheme,
    webMercatorTilingScheme,
} from "@here/harp-geoutils";
import { DataSource, Tile } from "@here/harp-mapview";
import { LoggerManager } from "@here/harp-utils";

const logger = LoggerManager.instance.create("RGBTerrainDataSource");
logger.warn(THREE.REVISION);

const textureLoader = new THREE.TextureLoader();
textureLoader.crossOrigin = ""; // empty assignment required to support CORS

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
        /*
        return new Promise((resolve, reject) => {
            getPixels(url, (error, pixels) => {
                if (error) {
                    reject(error);
                }
                console.log(pixels.shape.slice());
                return resolve(new Float32Array(pixels.shape.slice()));
            });
        });
        */
        const color = new THREE.Color();
        Promise.resolve(this.loadTexture(url))
            .then(texture => {
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;
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

                if (shouldSubdivide) {
                    const modifier = new SphericalGeometrySubdivisionModifier(
                        (10 / 180) * Math.PI,
                        sourceProjection
                    );
                    modifier.modify(terrain.geometry as THREE.BufferGeometry);
                }

                const water = this.createWater(tmpV.x, tmpV.y, tile.center);

                tile.objects.push(terrain);
                //tile.objects.push(water);
                tile.invalidateResourceInfo();
                this.requestUpdate();
            })
            .catch(error => {
                logger.error(
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
        const maxRes = 100;
        const maxZoomLevel = 13;
        const z = Math.floor(this.mapView.zoomLevel);
        const res = maxRes; //z <= maxZoomLevel ? maxRes : maxRes / (2 * (z - maxZoomLevel));
        const geometry = new THREE.PlaneBufferGeometry(width, height, res, res);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(heightMap.image as CanvasImageSource, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size + 1, size).data;
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

    private createWater(
        width: number,
        height: number,
        planeCenter: THREE.Vector3
    ): THREE.Mesh {
        const geometry = new THREE.PlaneBufferGeometry(width, height, 1, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x80a9c1,
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
