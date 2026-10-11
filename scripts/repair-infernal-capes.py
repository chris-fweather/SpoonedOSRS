"""Remove the stray opaque upper-back triangle from affected exported cape models.

The animated textured surface is separate and is preserved byte-for-byte. Match
all three coordinates, rather than deleting arbitrary black faces or relying on
a face index (the locked cape has a different index). Safe to run again.
"""
import base64
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRIANGLE = {(-33., 158., -15.), (33., 158., -15.), (-33., 118., -21.)}

def repair(path):
    model = json.loads(path.read_text(encoding="utf-8"))
    buffers = [bytearray(base64.b64decode(b["uri"].split(",", 1)[1])) for b in model["buffers"]]
    removed = 0
    def values(index):
        acc = model["accessors"][index]
        view = model["bufferViews"][acc["bufferView"]]
        code = {5123: "H", 5125: "I", 5126: "f"}[acc["componentType"]]
        fmt = "<" + code * {"SCALAR": 1, "VEC3": 3, "VEC2": 2}[acc["type"]]
        start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
        stride = view.get("byteStride", struct.calcsize(fmt))
        return [struct.unpack_from(fmt, buffers[view["buffer"]], start + i * stride) for i in range(acc["count"])]
    for mesh in model["meshes"]:
        for primitive in mesh["primitives"]:
            material = model["materials"][primitive["material"]]
            if material.get("name", "").startswith("flow:"):
                continue
            positions = values(primitive["attributes"]["POSITION"])
            indices = [v[0] for v in values(primitive["indices"])]
            keep = []
            for i in range(0, len(indices), 3):
                tri = indices[i:i + 3]
                if {positions[j] for j in tri} == TRIANGLE:
                    removed += 1
                else:
                    keep.extend(tri)
            if len(keep) == len(indices):
                continue
            acc = model["accessors"][primitive["indices"]]
            view = model["bufferViews"][acc["bufferView"]]
            code = {5123: "H", 5125: "I"}[acc["componentType"]]
            start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
            struct.pack_into("<" + code * len(indices), buffers[view["buffer"]], start, *(keep + [0] * (len(indices) - len(keep))))
            acc.update(count=len(keep), min=[min(keep)], max=[max(keep)])
    if removed:
        for item, data in zip(model["buffers"], buffers):
            item["uri"] = item["uri"].split(",", 1)[0] + "," + base64.b64encode(data).decode()
        path.write_text(json.dumps(model, separators=(",", ":")), encoding="utf-8")
    return removed

if __name__ == "__main__":
    for item in (21295, 23622, 24224):
        path = ROOT / "public/models/look/items" / f"{item}.gltf"
        print(f"{item}: removed {repair(path)} stray triangle(s)")
