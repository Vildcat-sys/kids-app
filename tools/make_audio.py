#!/usr/bin/env python3
# make_audio.py — 单文件、绝不挂死的 TTS 下载+转码闭环
# 用法: python make_audio.py <音频URL> <目标.mp3>
# 设计要点（根治终端挂死）：
#   - 下载 urllib 带 connect/read 硬超时，读完即走，不挂后台
#   - ffmpeg 用 -y 自动覆盖、-nostdin 不读终端、stdin=DEVNULL、subprocess timeout
#   - 幂等：目标已存在直接覆盖；临时 wav 用完即删
#   - 转码为 44.1kHz 单声道 48k mp3；ffprobe 校验时长/体积，异常退出码非 0
import sys, os, subprocess, urllib.request

FFDIR = r'F:\ComfyUI_windows_portable_nvidia\ComfyUI_windows_portable\ffmpeg-bin'
FFMPEG = os.path.join(FFDIR, 'ffmpeg.exe')
FFPROBE = os.path.join(FFDIR, 'ffprobe.exe')

def main():
    if len(sys.argv) != 3:
        print('USAGE: python make_audio.py <url> <out.mp3>'); sys.exit(1)
    url, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.dirname(out), exist_ok=True)
    wav = out + '.wavtmp'
    if os.path.exists(wav):
        os.remove(wav)
    try:
        # 用系统 curl.exe 下载（沙箱 Python 的 urllib 解析不到 CDN 主机，会 DNS 失败/挂起）
        curl = r'C:\Windows\System32\curl.exe'
        if not os.path.exists(curl):
            curl = 'curl.exe'
        c = subprocess.run(
            [curl, '-sSL', '--fail', '--connect-timeout', '30', '--max-time', '120',
             '--retry', '2', '-A', 'Mozilla/5.0', '-o', wav, url],
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE, timeout=150)
        if c.returncode != 0 or not os.path.exists(wav):
            print('DOWNLOAD_FAIL', c.stderr.decode('utf-8', 'ignore')[:300]); sys.exit(4)
        wsize = os.path.getsize(wav)
        if wsize < 2000:
            print(f'DOWNLOAD_TOO_SMALL {wsize}B'); sys.exit(4)
        p = subprocess.run(
            [FFMPEG, '-y', '-nostdin', '-loglevel', 'error', '-i', wav,
             '-ac', '1', '-ar', '44100', '-b:a', '48k', '-codec:a', 'libmp3lame', out],
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE, timeout=120)
        if p.returncode != 0:
            print('FFMPEG_FAIL', p.stderr.decode('utf-8', 'ignore')[:500]); sys.exit(2)
        q = subprocess.run(
            [FFPROBE, '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=nw=1:nk=1', out],
            stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=30)
        dur = float((q.stdout or '').strip() or 0)
        sz = os.path.getsize(out)
        print(f'OK {os.path.basename(out)} {dur:.2f}s {sz}B srcWav={wsize}B')
        if dur < 1.0 or sz < 8000:
            print('SUSPECT_SHORT_OR_SMALL'); sys.exit(3)
    finally:
        if os.path.exists(wav):
            os.remove(wav)

if __name__ == '__main__':
    main()
