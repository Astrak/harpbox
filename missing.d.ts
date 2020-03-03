declare module "get-pixels" {
    export function getPixels(url: string, cb: (err: Error, pixels: { shape: [] }) => any): void;
}
