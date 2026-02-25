#!/usr/bin/env python3
"""
ALIVE Connection APK 서버
로컬 네트워크에서 APK를 간편하게 배포하는 스크립트
"""

import http.server
import socketserver
import socket
import os
import sys
import signal
from pathlib import Path

try:
    import qrcode
except ImportError:
    print("qrcode 패키지가 필요합니다. 설치: pip install qrcode")
    sys.exit(1)


def get_local_ip():
    """로컬 네트워크 IP 주소 가져오기"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def get_file_size(file_path):
    """파일 크기를 MB 단위로 반환"""
    size_bytes = os.path.getsize(file_path)
    size_mb = size_bytes / (1024 * 1024)
    return f"{size_mb:.1f} MB"


def generate_qr_code(url):
    """터미널에 QR 코드 출력"""
    qr = qrcode.QRCode()
    qr.add_data(url)
    qr.print_ascii(invert=True)


PAGE_HTML = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ALIVE Connection 다운로드</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;
  background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
  min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}}
.c{{background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.3);
  padding:40px 30px;max-width:500px;width:100%}}
.hd{{text-align:center;margin-bottom:30px}}
h1{{font-size:28px;color:#667eea;margin-bottom:8px}}
.ver{{color:#888;font-size:14px}}
.info{{background:#f7f7f7;border-radius:12px;padding:20px;margin-bottom:30px}}
.row{{display:flex;justify-content:space-between;margin-bottom:10px;font-size:14px}}
.row:last-child{{margin-bottom:0}}
.lbl{{color:#666}}.val{{font-weight:600;color:#333}}
.btn{{display:block;width:100%;background:linear-gradient(135deg,#667eea,#764ba2);
  color:#fff;border:none;border-radius:12px;padding:18px;font-size:18px;font-weight:600;
  cursor:pointer;text-decoration:none;text-align:center;margin-bottom:30px;
  transition:transform .2s,box-shadow .2s}}
.btn:active{{transform:translateY(2px)}}
.box{{border-radius:8px;padding:20px;margin-bottom:20px}}
.box-y{{background:#fff9e6;border-left:4px solid #ffc107}}
.box-b{{background:#e3f2fd;border-left:4px solid #2196f3;margin-bottom:0}}
.box h2{{font-size:16px;margin-bottom:12px}}
.box-y h2{{color:#f57c00}}.box-b h2{{color:#1976d2}}
ol{{margin-left:20px}}li{{margin-bottom:8px;color:#555;font-size:14px;line-height:1.6}}
.ft{{text-align:center;margin-top:20px;color:#aaa;font-size:12px}}
</style>
</head>
<body>
<div class="c">
  <div class="hd">
    <h1>ALIVE Connection</h1>
    <div class="ver">v1.0.0 &middot; BLE-v2</div>
  </div>
  <div class="info">
    <div class="row"><span class="lbl">파일 크기</span><span class="val">{apk_size}</span></div>
    <div class="row"><span class="lbl">플랫폼</span><span class="val">Android</span></div>
    <div class="row"><span class="lbl">빌드</span><span class="val">Release</span></div>
  </div>
  <a href="/download" class="btn">APK 다운로드</a>
  <div class="box box-y">
    <h2>설치 방법</h2>
    <ol>
      <li>위 버튼을 눌러 APK를 다운로드합니다</li>
      <li>다운로드 완료 후 파일을 엽니다</li>
      <li>"출처를 알 수 없는 앱" 허용 메시지가 나오면 <b>설정에서 허용</b></li>
      <li><b>설치</b> 버튼을 눌러 완료합니다</li>
    </ol>
  </div>
  <div class="box box-b">
    <h2>BLE 테스트 방법</h2>
    <ol>
      <li>앱 실행 후 <b>블루투스 + 위치 권한</b>을 허용합니다</li>
      <li>회원가입/로그인 후 홈 화면으로 이동합니다</li>
      <li>다른 기기에도 같은 방법으로 앱을 설치 + 로그인합니다</li>
      <li>두 기기를 <b>가까이 대면</b> BLE 핸드셰이크가 자동 시작됩니다</li>
      <li>"교환 중..." 메시지가 표시되면 성공!</li>
      <li>교환 완료 후 <b>Connections 탭</b>에서 확인합니다</li>
    </ol>
  </div>
  <div class="ft">로컬 네트워크 배포 &middot; ALIVE Connection</div>
</div>
</body>
</html>"""


class APKHandler(http.server.BaseHTTPRequestHandler):
    apk_path = ""
    apk_size = ""

    def do_GET(self):
        if self.path == "/":
            body = PAGE_HTML.format(apk_size=self.apk_size).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        elif self.path == "/download":
            size = os.path.getsize(self.apk_path)
            self.send_response(200)
            self.send_header("Content-Type", "application/vnd.android.package-archive")
            self.send_header("Content-Disposition",
                             'attachment; filename="ALIVE-Connection-v1.0.0.apk"')
            self.send_header("Content-Length", str(size))
            self.end_headers()
            with open(self.apk_path, "rb") as f:
                while chunk := f.read(1024 * 1024):
                    self.wfile.write(chunk)
        else:
            self.send_error(404)

    def log_message(self, fmt, *args):
        # 다운로드 요청만 로그
        if "/download" in (args[0] if args else ""):
            print(f"  >> 다운로드 요청: {self.client_address[0]}")


def main():
    project_root = Path(__file__).resolve().parent.parent
    apk_path = project_root / "android/app/build/outputs/apk/release/app-release.apk"

    if not apk_path.exists():
        print(f"APK 파일을 찾을 수 없습니다: {apk_path}")
        print("먼저 빌드하세요: cd android && ./gradlew assembleRelease")
        sys.exit(1)

    PORT = 8080
    local_ip = get_local_ip()
    url = f"http://{local_ip}:{PORT}"
    apk_size = get_file_size(apk_path)

    APKHandler.apk_path = str(apk_path)
    APKHandler.apk_size = apk_size

    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("0.0.0.0", PORT), APKHandler)

    def shutdown(sig, frame):
        print("\n서버를 종료합니다...")
        httpd.server_close()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)

    print()
    print("=" * 50)
    print("  ALIVE Connection APK 서버")
    print("=" * 50)
    print(f"  앱:      ALIVE Connection v1.0.0")
    print(f"  크기:    {apk_size}")
    print(f"  URL:     {url}")
    print()
    print("  모바일에서 아래 QR 코드를 스캔하세요:")
    print()

    generate_qr_code(url)

    print()
    print("=" * 50)
    print("  같은 Wi-Fi에 연결된 기기에서 스캔하세요")
    print("  종료: Ctrl+C")
    print("=" * 50)
    print()

    httpd.serve_forever()


if __name__ == "__main__":
    main()
