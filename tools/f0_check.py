#!/usr/bin/env python3
# f0_check.py — 用 ffprobe 时长 + numpy 自相关粗测 F0（基频中位数）
import sys, subprocess, os, json
FFDIR = r'F:\ComfyUI_windows_portable_nvidia\ComfyUI_windows_portable\ffmpeg-bin'
FFPROBE = os.path.join(FFDIR, 'ffprobe.exe')
FFMPEG = os.path.join(FFDIR, 'ffmpeg.exe')

def load_mono_44k(path):
    p = subprocess.run([FFMPEG,'-y','-nostdin','-v','error','-i',path,'-ac','1','-ar','44100','-f','f32le','-'],
        stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=120)
    import numpy as np
    return np.frombuffer(p.stdout, dtype=np.float32)

def dur(path):
    q = subprocess.run([FFPROBE,'-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',path],
        stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=30)
    return float((q.stdout or '').strip() or 0)

def f0_median(wav, sr=44100, fmin=80, fmax=500):
    import numpy as np
    # 分帧 40ms / 10ms hop，对有声段做自相关
    win = int(0.04*sr); hop = int(0.01*sr)
    lo = int(sr/fmax); hi = int(sr/fmin)
    pitches=[]
    for i in range(0, len(wav)-win, hop):
        frame = wav[i:i+win]
        rms = float(np.sqrt(np.mean(frame*frame)))
        if rms < 0.01: continue
        frame = frame - frame.mean()
        corr = np.correlate(frame, frame, 'full')[win-1:]
        seg = corr[lo:hi]
        if len(seg)==0: continue
        lag = lo + int(np.argmax(seg))
        p = sr/lag if lag>0 else 0
        if fmin < p < fmax: pitches.append(p)
    if not pitches: return 0.0
    pitches.sort()
    return pitches[len(pitches)//2]

for path in sys.argv[1:]:
    d = dur(path)
    w = load_mono_44k(path)
    f = f0_median(w)
    print(f"{os.path.basename(path):32s} dur={d:6.2f}s  F0median≈{f:6.1f}Hz  size={os.path.getsize(path)}B")
