#!/usr/bin/env bash
# 이 파일의 역할: ALIVE Connection 개발 환경을 새 맥에서 원클릭으로 세팅하는 스크립트
# 사용법: bash scripts/setup-mac.sh          (설치 모드)
#         bash scripts/setup-mac.sh --check   (진단 모드 — 설치 없이 상태만 확인)

set -euo pipefail

# ─────────────────────────────────────────────
# 색상 정의 (터미널에서 예쁘게 보이도록)
# ─────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # 색상 리셋

# ─────────────────────────────────────────────
# 유틸리티 함수
# ─────────────────────────────────────────────
ok()   { echo -e "  ${GREEN}✅ $1${NC}"; }
warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; }
fail() { echo -e "  ${RED}❌ $1${NC}"; }
info() { echo -e "  ${BLUE}ℹ️  $1${NC}"; }
header() { echo -e "\n${BOLD}━━━ $1 ━━━${NC}"; }

# ─────────────────────────────────────────────
# 모드 판별: --check 면 진단만, 아니면 설치까지
# ─────────────────────────────────────────────
CHECK_ONLY=false
if [[ "${1:-}" == "--check" ]]; then
  CHECK_ONLY=true
  echo -e "${BOLD}🔍 진단 모드 — 현재 상태만 확인합니다 (설치하지 않음)${NC}"
else
  echo -e "${BOLD}🚀 ALIVE Connection 개발 환경 세팅을 시작합니다${NC}"
fi

# 프로젝트 루트 경로 (이 스크립트가 scripts/ 안에 있으므로 한 단계 위)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 결과 추적용 배열
declare -a RESULTS=()
record() {
  # record "항목이름" "pass|warn|fail"
  RESULTS+=("$1|$2")
}

# ─────────────────────────────────────────────
# 1단계: 사전 조건 체크
# ─────────────────────────────────────────────
header "1단계: 사전 조건 체크"

# macOS 확인
if [[ "$(uname)" == "Darwin" ]]; then
  ok "macOS 감지됨 ($(sw_vers -productVersion))"
  record "macOS" "pass"
else
  fail "이 스크립트는 macOS 전용입니다"
  record "macOS" "fail"
  exit 1
fi

# Node.js 확인
if command -v node &>/dev/null; then
  NODE_VER="$(node -v)"
  ok "Node.js 설치됨 ($NODE_VER)"
  record "Node.js" "pass"
else
  fail "Node.js가 없습니다"
  info "설치 방법: https://nodejs.org 에서 LTS 버전 다운로드"
  info "또는: brew install node"
  record "Node.js" "fail"
  if [[ "$CHECK_ONLY" == false ]]; then
    echo -e "\n${RED}Node.js 없이는 계속할 수 없습니다. 설치 후 다시 실행하세요.${NC}"
    exit 1
  fi
fi

# npm 확인
if command -v npm &>/dev/null; then
  NPM_VER="$(npm -v)"
  ok "npm 설치됨 (v$NPM_VER)"
  record "npm" "pass"
else
  fail "npm이 없습니다 (Node.js 설치 시 함께 설치됩니다)"
  record "npm" "fail"
fi

# Xcode Command Line Tools 확인
if xcode-select -p &>/dev/null; then
  ok "Xcode Command Line Tools 설치됨"
  record "Xcode CLT" "pass"
else
  warn "Xcode Command Line Tools가 없습니다"
  record "Xcode CLT" "warn"
  if [[ "$CHECK_ONLY" == false ]]; then
    info "설치를 시도합니다... (팝업이 뜨면 '설치' 클릭)"
    xcode-select --install 2>/dev/null || true
    info "설치가 완료되면 이 스크립트를 다시 실행하세요"
  else
    info "설치 명령: xcode-select --install"
  fi
fi

# Watchman 확인 (React Native 핫 리로드에 필요)
if command -v watchman &>/dev/null; then
  ok "Watchman 설치됨 ($(watchman --version 2>/dev/null || echo '버전 확인 불가'))"
  record "Watchman" "pass"
else
  warn "Watchman이 없습니다 (React Native 핫 리로드에 권장)"
  record "Watchman" "warn"
  if [[ "$CHECK_ONLY" == false ]]; then
    if command -v brew &>/dev/null; then
      info "Homebrew로 Watchman 설치 중..."
      brew install watchman || warn "Watchman 설치 실패 (선택사항이므로 계속 진행)"
      record "Watchman" "pass"
    else
      info "설치 방법: brew install watchman (Homebrew 필요)"
    fi
  fi
fi

# ─────────────────────────────────────────────
# 2단계: npm 글로벌 경로 설정
# ─────────────────────────────────────────────
header "2단계: npm 글로벌 경로 설정"

NPM_GLOBAL_DIR="$HOME/.npm-global"
ZSHRC="$HOME/.zshrc"
NPM_PATH_LINE='export PATH="$HOME/.npm-global/bin:$PATH"'

# ~/.npm-global 디렉토리
if [[ -d "$NPM_GLOBAL_DIR" ]]; then
  ok "~/.npm-global 디렉토리 존재"
  record "npm-global 디렉토리" "pass"
else
  if [[ "$CHECK_ONLY" == false ]]; then
    mkdir -p "$NPM_GLOBAL_DIR"
    ok "~/.npm-global 디렉토리 생성 완료"
    record "npm-global 디렉토리" "pass"
  else
    warn "~/.npm-global 디렉토리 없음"
    record "npm-global 디렉토리" "warn"
  fi
fi

# npm prefix 설정
CURRENT_PREFIX="$(npm config get prefix 2>/dev/null || echo "")"
if [[ "$CURRENT_PREFIX" == "$NPM_GLOBAL_DIR" ]]; then
  ok "npm prefix 이미 설정됨 ($NPM_GLOBAL_DIR)"
  record "npm prefix" "pass"
else
  if [[ "$CHECK_ONLY" == false ]]; then
    npm config set prefix "$NPM_GLOBAL_DIR"
    ok "npm prefix 설정 완료 → $NPM_GLOBAL_DIR"
    record "npm prefix" "pass"
  else
    warn "npm prefix가 다름: $CURRENT_PREFIX (기대값: $NPM_GLOBAL_DIR)"
    record "npm prefix" "warn"
  fi
fi

# .zshrc PATH 추가 (중복 방지)
if [[ -f "$ZSHRC" ]] && grep -qF '.npm-global/bin' "$ZSHRC"; then
  ok "~/.zshrc에 npm-global PATH 이미 존재"
  record "zshrc PATH" "pass"
else
  if [[ "$CHECK_ONLY" == false ]]; then
    echo "" >> "$ZSHRC"
    echo "# ALIVE Connection — npm 글로벌 패키지 경로" >> "$ZSHRC"
    echo "$NPM_PATH_LINE" >> "$ZSHRC"
    ok "~/.zshrc에 PATH 추가 완료"
    info "적용하려면: source ~/.zshrc"
    record "zshrc PATH" "pass"
  else
    warn "~/.zshrc에 npm-global PATH 없음"
    record "zshrc PATH" "warn"
  fi
fi

# 현재 세션에도 PATH 적용 (설치 모드일 때)
if [[ "$CHECK_ONLY" == false ]]; then
  export PATH="$NPM_GLOBAL_DIR/bin:$PATH"
fi

# ─────────────────────────────────────────────
# 3단계: 글로벌 npm 패키지 설치
# ─────────────────────────────────────────────
header "3단계: 글로벌 npm 패키지 설치"

# 설치할 패키지 목록: "패키지명|확인용 명령어|설명"
GLOBAL_PACKAGES=(
  "typescript-language-server|typescript-language-server|Claude Code TS-LSP 플러그인용"
  "typescript|tsc|TypeScript 컴파일러"
  "eas-cli|eas|Expo EAS 빌드 CLI"
)

for entry in "${GLOBAL_PACKAGES[@]}"; do
  IFS='|' read -r PKG CMD DESC <<< "$entry"

  if command -v "$CMD" &>/dev/null; then
    VER="$("$CMD" --version 2>/dev/null | head -1 || echo '설치됨')"
    ok "$PKG ($DESC) — $VER"
    record "$PKG" "pass"
  else
    if [[ "$CHECK_ONLY" == false ]]; then
      info "$PKG 설치 중... ($DESC)"
      if npm install -g "$PKG" 2>/dev/null; then
        ok "$PKG 설치 완료"
        record "$PKG" "pass"
      else
        fail "$PKG 설치 실패"
        record "$PKG" "fail"
      fi
    else
      fail "$PKG 설치 안 됨 ($DESC)"
      record "$PKG" "fail"
    fi
  fi
done

# ─────────────────────────────────────────────
# 4단계: Claude Code 플러그인 마켓플레이스 확인
# ─────────────────────────────────────────────
header "4단계: Claude Code 플러그인 확인"

CLAUDE_DIR="$HOME/.claude"
PLUGINS_DIR="$CLAUDE_DIR/plugins/marketplaces/claude-plugins-official"

if [[ -d "$CLAUDE_DIR" ]]; then
  ok "~/.claude 디렉토리 존재"
  record "~/.claude" "pass"
else
  warn "~/.claude 디렉토리 없음"
  info "Claude Code를 한 번 실행하면 자동 생성됩니다"
  record "~/.claude" "warn"
fi

if [[ -d "$PLUGINS_DIR" ]]; then
  ok "플러그인 마켓플레이스 존재"
  PLUGIN_COUNT=$(ls -1 "$PLUGINS_DIR" 2>/dev/null | wc -l | tr -d ' ')
  info "설치된 플러그인: ${PLUGIN_COUNT}개"
  record "플러그인 마켓플레이스" "pass"
else
  warn "플러그인 마켓플레이스 없음"
  info "Claude Code 첫 실행 시 자동 생성됩니다"
  info "실행 후 프로젝트에서 필요한 플러그인을 활성화하세요:"
  info "  - frontend-design, feature-dev, typescript-lsp"
  info "  - security-guidance, supabase, skill-creator"
  record "플러그인 마켓플레이스" "warn"
fi

# 프로젝트별 Claude 설정 확인
CLAUDE_PROJECT_SETTINGS="$PROJECT_ROOT/.claude/settings.json"
if [[ -f "$CLAUDE_PROJECT_SETTINGS" ]]; then
  ok "프로젝트 Claude 설정 파일 존재 (.claude/settings.json)"
  record "프로젝트 Claude 설정" "pass"
else
  warn "프로젝트 Claude 설정 파일 없음"
  record "프로젝트 Claude 설정" "warn"
fi

# ─────────────────────────────────────────────
# 5단계: 프로젝트 의존성 설치
# ─────────────────────────────────────────────
header "5단계: 프로젝트 의존성 설치"

# npm install 실행 함수
install_deps() {
  local dir="$1"
  local label="$2"

  if [[ ! -f "$dir/package.json" ]]; then
    warn "$label — package.json 없음 (건너뜀)"
    record "$label 의존성" "warn"
    return
  fi

  if [[ -d "$dir/node_modules" ]]; then
    ok "$label — node_modules 이미 존재"
    if [[ "$CHECK_ONLY" == false ]]; then
      info "$label 의존성 업데이트 중..."
      if (cd "$dir" && npm install --silent 2>/dev/null); then
        ok "$label 의존성 설치/업데이트 완료"
        record "$label 의존성" "pass"
      else
        fail "$label 의존성 설치 실패"
        record "$label 의존성" "fail"
      fi
    else
      record "$label 의존성" "pass"
    fi
  else
    if [[ "$CHECK_ONLY" == false ]]; then
      info "$label 의존성 설치 중... (처음이라 시간이 걸릴 수 있어요)"
      if (cd "$dir" && npm install 2>/dev/null); then
        ok "$label 의존성 설치 완료"
        record "$label 의존성" "pass"
      else
        fail "$label 의존성 설치 실패"
        record "$label 의존성" "fail"
      fi
    else
      fail "$label — node_modules 없음"
      record "$label 의존성" "fail"
    fi
  fi
}

install_deps "$PROJECT_ROOT" "루트(모바일)"
install_deps "$PROJECT_ROOT/web" "웹 대시보드"
install_deps "$PROJECT_ROOT/server" "백엔드 서버"

# ─────────────────────────────────────────────
# 6단계: 환경변수 파일 체크
# ─────────────────────────────────────────────
header "6단계: 환경변수 (.env) 파일 체크"

# .env 체크 함수
check_env() {
  local dir="$1"
  local label="$2"
  local env_file="$dir/.env"
  local example_file="$dir/.env.example"

  if [[ -f "$env_file" ]]; then
    ok "$label — .env 파일 존재"
    record "$label .env" "pass"
  elif [[ -f "$example_file" ]]; then
    warn "$label — .env 없음 (.env.example은 있음)"
    if [[ "$CHECK_ONLY" == false ]]; then
      cp "$example_file" "$env_file"
      ok "$label — .env.example → .env 복사 완료"
      warn "⚡ 반드시 $env_file 을 열어서 실제 값을 입력하세요!"
      record "$label .env" "warn"
    else
      info "설치 모드에서 .env.example → .env 복사됩니다"
      record "$label .env" "warn"
    fi
  else
    warn "$label — .env 파일과 .env.example 모두 없음"
    record "$label .env" "warn"
  fi
}

check_env "$PROJECT_ROOT" "루트(모바일)"
check_env "$PROJECT_ROOT/web" "웹 대시보드"
check_env "$PROJECT_ROOT/server" "백엔드 서버"

# ─────────────────────────────────────────────
# 7단계: 완료 상태 리포트
# ─────────────────────────────────────────────
header "📊 최종 결과 리포트"

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

echo ""
printf "  ${BOLD}%-30s  상태${NC}\n" "항목"
echo "  ────────────────────────────────────────"

for entry in "${RESULTS[@]}"; do
  IFS='|' read -r NAME STATUS <<< "$entry"
  case "$STATUS" in
    pass)
      printf "  %-30s  ${GREEN}✅ 정상${NC}\n" "$NAME"
      ((PASS_COUNT++))
      ;;
    warn)
      printf "  %-30s  ${YELLOW}⚠️  확인 필요${NC}\n" "$NAME"
      ((WARN_COUNT++))
      ;;
    fail)
      printf "  %-30s  ${RED}❌ 실패${NC}\n" "$NAME"
      ((FAIL_COUNT++))
      ;;
  esac
done

echo "  ────────────────────────────────────────"
echo -e "  ${GREEN}정상: $PASS_COUNT${NC}  ${YELLOW}확인필요: $WARN_COUNT${NC}  ${RED}실패: $FAIL_COUNT${NC}"
echo ""

if [[ "$FAIL_COUNT" -eq 0 && "$WARN_COUNT" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}🎉 모든 항목이 정상입니다! 개발을 시작하세요.${NC}"
elif [[ "$FAIL_COUNT" -eq 0 ]]; then
  echo -e "${YELLOW}${BOLD}⚠️  일부 항목을 확인하세요. 개발은 가능합니다.${NC}"
else
  echo -e "${RED}${BOLD}❌ 실패 항목이 있습니다. 위의 안내를 따라 해결하세요.${NC}"
fi

if [[ "$CHECK_ONLY" == true ]]; then
  echo -e "\n${BLUE}💡 설치하려면: bash scripts/setup-mac.sh (--check 없이 실행)${NC}"
fi

echo ""
