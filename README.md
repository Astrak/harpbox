# harpbox

A [harp.gl](harp.gl) map implementing terrain by using the [Mapbox RGB terrain provider](https://docs.mapbox.com/help/troubleshooting/access-elevation-data/#mapbox-terrain-rgb).

![image](./harpbox.png)

:warning: The code is basic and does not support the sphere projection.

:warning: This terrain is **only** a mesh underlayed in render order below the vector data. The vector data is **not** elevated and does not know at all about the elevation.

Elevation of vector data should be implemented in the current OmvDataSource of harp.gl instead (see that project). This is more of a demo mixing the harp suite with Mapbox RGB tiles for the moment.

## Installation

```
git clone git@github.com:Astrak/harpbox.git
cd harpbox
yarn
yarn start
```
