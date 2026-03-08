#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "[purpose-guard] $*" >&2
  exit 1
}

usage() {
  cat >&2 <<'EOF'
사용법:
  .ai/scripts/verify-purpose-focus.sh issue    < body-from-stdin
  .ai/scripts/verify-purpose-focus.sh pr       < body-from-stdin
  .ai/scripts/verify-purpose-focus.sh docs --staged
  .ai/scripts/verify-purpose-focus.sh docs --base-ref <git-ref>
EOF
  exit 1
}

section_exists() {
  local text="$1"
  local heading="$2"
  printf '%s\n' "$text" | grep -Eq "^##[[:space:]]*${heading}([[:space:]].*)?$"
}

extract_section() {
  local text="$1"
  local heading="$2"
  printf '%s\n' "$text" | awk -v h="$heading" '
    $0 ~ "^##[[:space:]]*" h "([[:space:]].*)?$" { in_section=1; next }
    in_section && $0 ~ "^##[[:space:]]+" { exit }
    in_section { print }
  '
}

normalize_line() {
  local line="$1"
  printf '%s\n' "$line" | sed -E \
    -e 's/^[[:space:]]*[-*][[:space:]]*//' \
    -e 's/^[[:space:]]*[0-9]+\.[[:space:]]*//' \
    -e 's/^[[:space:]]*//' \
    -e 's/[[:space:]]*$//'
}

is_placeholder_line() {
  local line="$1"
  [[ -z "$line" ]] && return 0

  local lower
  lower="$(printf '%s\n' "$line" | tr '[:upper:]' '[:lower:]')"

  case "$lower" in
    "-"|"*"|"todo"|"tbd"|"n/a"|"na"|"none"|"없음"|"미정"|"추후 작성"|"추후작성"|"작성 예정"|"작성예정")
      return 0
      ;;
  esac

  if [[ "$line" =~ \<[[:space:]]*필수[[:space:]]*작성 ]]; then
    return 0
  fi

  if [[ "$line" =~ \<[[:space:]]*required[[:space:]]* ]]; then
    return 0
  fi

  if [[ "$line" =~ ^\[[[:space:]xX]?\][[:space:]]*$ ]]; then
    return 0
  fi

  return 1
}

has_meaningful_content() {
  local text="$1"
  local raw
  while IFS= read -r raw; do
    local line
    line="$(normalize_line "$raw")"
    [[ -z "$line" ]] && continue
    if ! is_placeholder_line "$line"; then
      return 0
    fi
  done <<< "$text"

  return 1
}

ensure_required_section() {
  local text="$1"
  local heading="$2"
  local context="$3"

  if ! section_exists "$text" "$heading"; then
    fail "$context: 필수 섹션 누락 (## $heading)"
  fi

  local section
  section="$(extract_section "$text" "$heading")"
  if ! has_meaningful_content "$section"; then
    fail "$context: 섹션 내용이 비어 있거나 placeholder만 포함 (## $heading)"
  fi
}

read_stdin_body() {
  cat | tr -d '\r'
}

validate_issue_body() {
  local body="$1"
  [[ -n "${body//[[:space:]]/}" ]] || fail "issue body가 비어 있다."

  ensure_required_section "$body" "근본 목적" "issue body"
  ensure_required_section "$body" "비목적" "issue body"
  ensure_required_section "$body" "성공 기준" "issue body"
  ensure_required_section "$body" "수행할 작업" "issue body"
}

validate_pr_body() {
  local body="$1"
  [[ -n "${body//[[:space:]]/}" ]] || fail "PR body가 비어 있다."

  ensure_required_section "$body" "근본 목적" "PR body"
  ensure_required_section "$body" "비목적" "PR body"
  ensure_required_section "$body" "변경 요약" "PR body"
  ensure_required_section "$body" "검증" "PR body"
  ensure_required_section "$body" "관련 이슈" "PR body"
}

is_exempt_doc() {
  local file="$1"
  case "$file" in
    AGENTS.md|.ai/state/*|.github/ISSUE_TEMPLATE/*|.github/pull_request_template.md)
      return 0
      ;;
  esac

  if grep -Eq '<!--[[:space:]]*purpose-guard:[[:space:]]*exempt[[:space:]]*-->' "$file"; then
    return 0
  fi

  return 1
}

list_changed_docs_staged() {
  git diff --cached --name-only --diff-filter=ACMR -- '*.md'
}

list_changed_docs_range() {
  local base_ref="$1"
  git diff --name-only --diff-filter=ACMR "${base_ref}...HEAD" -- '*.md'
}

validate_doc_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0

  if is_exempt_doc "$file"; then
    echo "[purpose-guard] 문서 검사 예외: $file"
    return 0
  fi

  local body
  body="$(cat "$file" | tr -d '\r')"

  ensure_required_section "$body" "근본 목적" "$file"
  ensure_required_section "$body" "비목적" "$file"
}

validate_docs() {
  local mode="$1"
  local base_ref="${2:-}"
  local files=()

  if [[ "$mode" == "staged" ]]; then
    mapfile -t files < <(list_changed_docs_staged)
  else
    [[ -n "$base_ref" ]] || fail "docs 모드에서 --base-ref <git-ref>가 필요하다."
    mapfile -t files < <(list_changed_docs_range "$base_ref")
  fi

  if [[ "${#files[@]}" -eq 0 ]]; then
    echo "[purpose-guard] 검사할 Markdown 변경 없음"
    return 0
  fi

  local file
  for file in "${files[@]}"; do
    validate_doc_file "$file"
  done
}

main() {
  [[ $# -ge 1 ]] || usage
  local mode="$1"
  shift

  case "$mode" in
    issue)
      [[ $# -eq 0 ]] || usage
      validate_issue_body "$(read_stdin_body)"
      ;;
    pr)
      [[ $# -eq 0 ]] || usage
      validate_pr_body "$(read_stdin_body)"
      ;;
    docs)
      if [[ "${1:-}" == "--staged" ]]; then
        [[ $# -eq 1 ]] || usage
        validate_docs "staged"
      elif [[ "${1:-}" == "--base-ref" ]]; then
        [[ $# -eq 2 ]] || usage
        validate_docs "range" "$2"
      else
        usage
      fi
      ;;
    *)
      usage
      ;;
  esac

  echo "[purpose-guard] OK"
}

main "$@"
