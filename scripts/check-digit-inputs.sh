#!/bin/sh
# 0.14 — ورودی عددی/شماره/کد فقط از طریق components/ui/DigitsInput.tsx؛ type="number" و
# inputMode عددی بیرون از آن ممنوع است (کیبورد فارسی روی iOS/macOS رقم فارسی می‌فرستد).
# اجرا از ریشه‌ی ریپو: sh scripts/check-digit-inputs.sh
cd "$(dirname "$0")/.." || exit 1

PATTERN='type="number"|type=\{[[:space:]]*["'"'"']number["'"'"'][[:space:]]*\}|inputMode=("|\{["'"'"'])(numeric|decimal|tel)'

found=$(grep -rnE "$PATTERN" src --include='*.ts' --include='*.tsx' --include='*.jsx' --include='*.js' \
  | grep -v '^src/components/ui/DigitsInput\.tsx:')

if [ -n "$found" ]; then
  echo "ERROR: numeric inputs must use <DigitsInput> (src/components/ui/DigitsInput.tsx):"
  echo "$found"
  exit 1
fi
echo "OK: no raw numeric inputs outside DigitsInput"
