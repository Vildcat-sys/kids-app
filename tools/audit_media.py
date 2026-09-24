#!/usr/bin/env python3
# audit_media.py — 全量音频 ffprobe 校验：时长/声道/采样率/体积
import os, subprocess, sys

FFDIR = r'F:\ComfyUI_windows_portable_nvidia\ComfyUI_windows_portable\ffmpeg-bin'
FFPROBE = os.path.join(FFDIR, 'ffprobe.exe')
ROOT = r'D:\Wordbuddy-Demo\kids-app\src\audio'

def probe(path):
    p = subprocess.run([FFPROBE, '-v','error','-show_entries','format=duration:stream=channels,sample_rate,codec_name',
        '-of','default=nw=1', path], stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=30)
    info = {}
    for line in p.stdout.splitlines():
        if '=' in line:
            k,v = line.split('=',1); info[k.strip()]=v.strip()
    dur = float(info.get('duration','0') or 0)
    return dur, info.get('channels','?'), info.get('sample_rate','?'), info.get('codec_name','?')

report = {'narr':[], 'quiz':[], 'word':[], 'voice':[]}
problems = []
counts = {}
for sub in report:
    d = os.path.join(ROOT, sub)
    files = sorted(f for f in os.listdir(d) if f.endswith('.mp3'))
    counts[sub] = len(files)
    for f in files:
        p = os.path.join(d, f)
        dur, ch, sr, codec = probe(p)
        sz = os.path.getsize(p)
        report[sub].append((f, dur, sz, ch, sr, codec))

for sub, rows in report.items():
    print(f'\n===== {sub}: {counts[sub]} files =====')
    durs = [r[1] for r in rows]
    print(f'duration min={min(durs):.2f} max={max(durs):.2f} avg={sum(durs)/len(durs):.2f}')
    # range expectations
    lo, hi = {'narr':(6,16),'quiz':(4.5,16),'word':(1,6),'voice':(2,8)}[sub]
    for f,dur,sz,ch,sr,codec in rows:
        flags=[]
        if dur < lo: flags.append(f'SHORT<{lo}')
        if dur > hi: flags.append(f'LONG>{hi}')
        if sz < 8000: flags.append('SMALL')
        if ch != '1': flags.append(f'CH={ch}')
        if sr != '44100': flags.append(f'SR={sr}')
        if flags:
            problems.append((sub,f,dur,sz,flags))
            print(f'  !! {f} {dur:.2f}s {sz}B ch={ch} sr={sr} -> {",".join(flags)}')

print('\n===== SUMMARY =====')
print('counts:', counts)
print(f'problems flagged: {len(problems)}')
