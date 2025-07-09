#!/bin/bash

# 必要な設定
PROJECT_DIR="/Users/kensuke/Desktop/gto-vantage"
SCRIPTS_DIR="$PROJECT_DIR/scripts"

# 色の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # 色のリセット

# スクリプトに実行権限を付与
chmod +x "$SCRIPTS_DIR/fix-errors.js"
chmod +x "$SCRIPTS_DIR/dev.js"
chmod +x "$SCRIPTS_DIR/test-component.js"
chmod +x "$SCRIPTS_DIR/simple-test-component.js"

# バナーを表示
echo -e "${BLUE}==============================================${NC}"
echo -e "${GREEN}      GTO Vantage 自動テスト環境 v1.0${NC}"
echo -e "${BLUE}==============================================${NC}"
echo ""

# メニューを表示
show_menu() {
  echo -e "${CYAN}利用可能なオプション:${NC}"
  echo -e "1) ${YELLOW}エラー修正と開発サーバー起動${NC}"
  echo -e "2) ${YELLOW}コンポーネントテスト（詳細）${NC}"
  echo -e "3) ${YELLOW}簡易コンポーネントテスト${NC}"
  echo -e "4) ${YELLOW}終了${NC}"
  echo ""
  echo -e "${CYAN}選択してください (1-4):${NC} "
  read choice
  
  case $choice in
    1)
      # エラー修正スクリプトを実行
      echo -e "${PURPLE}エラー修正スクリプトを実行中...${NC}"
      node "$SCRIPTS_DIR/fix-errors.js"
      
      # 開発環境スクリプトを実行
      echo -e "${PURPLE}開発環境を起動中...${NC}"
      node "$SCRIPTS_DIR/dev.js"
      ;;
    2)
      # コンポーネントテストスクリプトを実行
      echo -e "${PURPLE}コンポーネントテスターを起動中...${NC}"
      node "$SCRIPTS_DIR/test-component.js"
      ;;
    3)
      # 簡易コンポーネントテストスクリプトを実行
      echo -e "${PURPLE}簡易コンポーネントテスターを起動中...${NC}"
      node "$SCRIPTS_DIR/simple-test-component.js"
      ;;
    4)
      echo -e "${GREEN}プログラムを終了します。${NC}"
      exit 0
      ;;
    *)
      echo -e "${RED}無効な選択です。もう一度試してください。${NC}"
      show_menu
      ;;
  esac
}

# メニューを表示して処理を開始
show_menu 