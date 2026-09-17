"""生成 PWA 图标：暖橙圆角底 + 极简动物脸。纯标准库实现，不依赖 Pillow。

用法：python make-icons.py
输出：icon-192.png / icon-512.png / icon-maskable-512.png
"""
import zlib
import struct
import math
import os

OUT = os.path.dirname(os.path.abspath(__file__))

BG = (232, 115, 74)
FACE = (255, 251, 245)
INK = (45, 42, 38)


def clamp(v, lo=0.0, hi=1.0):
    return lo if v < lo else (hi if v > hi else v)


def rrect_sdf(px, py, w, h, r):
    qx = abs(px - w * 0.5) - (w * 0.5 - r)
    qy = abs(py - h * 0.5) - (h * 0.5 - r)
    return math.hypot(max(qx, 0.0), max(qy, 0.0)) + min(max(qx, qy), 0.0) - r


def circ_sdf(px, py, cx, cy, r):
    return math.hypot(px - cx, py - cy) - r


def cov(sdf, aa):
    return clamp(0.5 - sdf / aa)


def over(dst, src, a):
    if a >= 1.0:
        return src
    if a <= 0.0:
        return dst
    return (dst[0] + (src[0] - dst[0]) * a,
            dst[1] + (src[1] - dst[1]) * a,
            dst[2] + (src[2] - dst[2]) * a)


def render(size, maskable=False):
    k = 0.78 if maskable else 1.0

    def S(v):
        return (0.5 + (v - 0.5) * k) * size

    def R(v):
        return v * k * size

    bg_r = 0.0 if maskable else size * 0.225
    aa = max(1.0, size / 420.0)

    rows = []
    for y in range(size):
        row = bytearray()
        py = y + 0.5
        for x in range(size):
            px = x + 0.5

            if maskable:
                a_bg = 1.0
            else:
                a_bg = cov(rrect_sdf(px, py, size, size, bg_r), aa)
                if a_bg <= 0.0:
                    row += b'\x00\x00\x00\x00'
                    continue

            col = BG

            for ex in (0.345, 0.655):
                a = cov(circ_sdf(px, py, S(ex), S(0.315), R(0.088)), aa)
                if a > 0.0:
                    col = over(col, FACE, a)

            a = cov(circ_sdf(px, py, S(0.5), S(0.505), R(0.245)), aa)
            if a > 0.0:
                col = over(col, FACE, a)

            for ex in (0.417, 0.583):
                a = cov(circ_sdf(px, py, S(ex), S(0.468), R(0.049)), aa)
                if a > 0.0:
                    col = over(col, INK, a)

            a = cov(circ_sdf(px, py, S(0.5), S(0.572), R(0.040)), aa)
            if a > 0.0:
                col = over(col, BG, a)

            row += bytes((int(col[0] + 0.5), int(col[1] + 0.5), int(col[2] + 0.5),
                          int(a_bg * 255 + 0.5)))
        rows.append(bytes(row))
    return rows


def write_png(path, size, rows):
    raw = b''.join(b'\x00' + r for r in rows)
    comp = zlib.compress(raw, 9)

    def chunk(typ, data):
        return (struct.pack('>I', len(data)) + typ + data
                + struct.pack('>I', zlib.crc32(typ + data) & 0xffffffff))

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', comp)
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


if __name__ == '__main__':
    targets = [
        ('icon-192.png', 192, False),
        ('icon-512.png', 512, False),
        ('icon-maskable-512.png', 512, True),
    ]
    for name, size, mask in targets:
        path = os.path.join(OUT, name)
        write_png(path, size, render(size, mask))
        print('wrote %-24s %dx%d  %d bytes' % (name, size, size, os.path.getsize(path)))
