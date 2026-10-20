// Turns a SketchUp → SimLab GLB export of the Gallery into the file the
// event info pack shows: node scripts/gallery-model.mjs <export.glb>
//
// Four fixes:
// - The export has walls but no floor, so the plan floats on the page and
//   shadows have nothing to land on. A floor plate is added under the
//   building's footprint (its bounding rectangle).
// - The building itself has no material, so three.js gives it a fully
//   metallic default that renders dark grey. It gets a matte white one.
// - The rest come from SketchUp half-metallic; they become matte too.
// - The glass carries a sky-reflection texture. Embedded images are loaded
//   through a blob: URL, which the site's CSP (connect-src) blocks, so the
//   texture is dropped. The glass keeps its tint and transparency.

import { readFileSync, writeFileSync } from 'node:fs';

const [input, output = 'public/oddspace/gallery.glb'] = process.argv.slice(2);
if (!input) throw new Error('usage: node scripts/gallery-model.mjs <export.glb> [out.glb]');

const glb = readFileSync(input);
const jsonLength = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString());

const walls =
  gltf.materials.push({
    name: 'Walls',
    pbrMetallicRoughness: {
      baseColorFactor: [0.6, 0.59, 0.58, 1],
      metallicFactor: 0,
      roughnessFactor: 0.9,
    },
  }) - 1;
for (const mesh of gltf.meshes) for (const p of mesh.primitives) p.material ??= walls;

// The building is the mesh with the most vertices. Its coordinates are
// SketchUp's (Z up), so the floor is a quad at z = 0 under its x/y extent.
let bin = glb.subarray(28 + jsonLength);
const building = gltf.meshes.reduce((a, b) =>
  gltf.accessors[b.primitives[0].attributes.POSITION].count >
  gltf.accessors[a.primitives[0].attributes.POSITION].count
    ? b
    : a,
);
const { min, max } = gltf.accessors[building.primitives[0].attributes.POSITION];
const floor = {
  POSITION: [min[0], min[1], 0, max[0], min[1], 0, max[0], max[1], 0, min[0], max[1], 0],
  NORMAL: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
};
const attributes = {};
for (const [name, values] of Object.entries(floor)) {
  gltf.bufferViews.push({ buffer: 0, byteOffset: bin.length, byteLength: 48 });
  bin = Buffer.concat([bin, Buffer.from(new Float32Array(values).buffer)]);
  attributes[name] =
    gltf.accessors.push({
      bufferView: gltf.bufferViews.length - 1,
      componentType: 5126,
      count: 4,
      type: 'VEC3',
      ...(name === 'POSITION' && { min: [min[0], min[1], 0], max: [max[0], max[1], 0] }),
    }) - 1;
}
gltf.bufferViews.push({ buffer: 0, byteOffset: bin.length, byteLength: 12 });
bin = Buffer.concat([bin, Buffer.from(new Uint16Array([0, 1, 2, 0, 2, 3]).buffer)]);
const indices =
  gltf.accessors.push({
    bufferView: gltf.bufferViews.length - 1,
    componentType: 5123,
    count: 6,
    type: 'SCALAR',
  }) - 1;
const floorMaterial =
  gltf.materials.push({
    name: 'Floor',
    pbrMetallicRoughness: {
      baseColorFactor: [0.12, 0.115, 0.11, 1],
      metallicFactor: 0,
      roughnessFactor: 1,
    },
    doubleSided: true,
  }) - 1;
building.primitives.push({ attributes, indices, material: floorMaterial, mode: 4 });
gltf.buffers[0].byteLength = bin.length;

for (const m of gltf.materials) {
  delete m.extensions;
  delete m.pbrMetallicRoughness.baseColorTexture;
  if (m.alphaMode !== 'BLEND') m.pbrMetallicRoughness.metallicFactor = 0;
}
delete gltf.textures;
delete gltf.images;
delete gltf.extensionsUsed;

let json = Buffer.from(JSON.stringify(gltf));
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, ' ')]);
const header = Buffer.alloc(20);
header.write('glTF', 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + bin.length, 8);
header.writeUInt32LE(json.length, 12);
header.write('JSON', 16);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(bin.length, 0);
binHeader.write('BIN\0', 4);
writeFileSync(output, Buffer.concat([header, json, binHeader, bin]));
console.log(`${output}: ${28 + json.length + bin.length} bytes`);
