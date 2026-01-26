#!/bin/bash

# 查看生产环境错误日志的便捷脚本
# 使用方法: bash scripts/view-error-logs.sh [选项]
#
# 选项:
#   -f, --follow     实时监控日志
#   -n, --lines N    显示最近 N 行（默认 100）
#   -a, --all        显示所有日志源
#   -h, --help       显示帮助信息

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 默认参数
CONTAINER_NAME="milicard-prod"
LINES=100
FOLLOW=false
SHOW_ALL=false

# 解析参数
while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--follow)
      FOLLOW=true
      shift
      ;;
    -n|--lines)
      LINES="$2"
      shift 2
      ;;
    -a|--all)
      SHOW_ALL=true
      shift
      ;;
    -h|--help)
      echo "使用方法: bash scripts/view-error-logs.sh [选项]"
      echo ""
      echo "选项:"
      echo "  -f, --follow     实时监控日志"
      echo "  -n, --lines N    显示最近 N 行（默认 100）"
      echo "  -a, --all        显示所有日志源（包括 info/warn）"
      echo "  -h, --help       显示帮助信息"
      echo ""
      echo "示例:"
      echo "  bash scripts/view-error-logs.sh              # 查看最近 100 行错误日志"
      echo "  bash scripts/view-error-logs.sh -n 200       # 查看最近 200 行"
      echo "  bash scripts/view-error-logs.sh -f           # 实时监控错误日志"
      echo "  bash scripts/view-error-logs.sh -a           # 查看所有日志"
      exit 0
      ;;
    *)
      echo -e "${RED}未知选项: $1${NC}"
      echo "使用 -h 或 --help 查看帮助"
      exit 1
      ;;
  esac
done

# 检查容器是否运行
echo -e "${CYAN}检查容器状态...${NC}"
if ! podman ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
  echo -e "${RED}错误: 容器 ${CONTAINER_NAME} 未运行${NC}"
  echo ""
  echo "可用的容器:"
  podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  exit 1
fi

echo -e "${GREEN}✓ 容器 ${CONTAINER_NAME} 正在运行${NC}"
echo ""

# 显示日志
if [ "$FOLLOW" = true ]; then
  echo -e "${YELLOW}========================================${NC}"
  echo -e "${YELLOW}  实时监控错误日志 (Ctrl+C 退出)${NC}"
  echo -e "${YELLOW}========================================${NC}"
  echo ""
  
  if [ "$SHOW_ALL" = true ]; then
    # 监控所有日志
    echo -e "${CYAN}监控来源: 容器日志 + 应用日志文件${NC}"
    echo ""
    podman exec $CONTAINER_NAME tail -f /app/logs/combined.log 2>/dev/null || \
    podman logs -f $CONTAINER_NAME
  else
    # 只监控错误日志
    echo -e "${CYAN}监控来源: 错误日志文件 + 容器错误输出${NC}"
    echo ""
    podman exec $CONTAINER_NAME tail -f /app/logs/error.log 2>/dev/null || \
    podman logs -f $CONTAINER_NAME 2>&1 | grep -i "error\|exception\|failed" --color=always
  fi
else
  echo -e "${YELLOW}========================================${NC}"
  echo -e "${YELLOW}  查看最近 ${LINES} 行日志${NC}"
  echo -e "${YELLOW}========================================${NC}"
  echo ""
  
  # 1. 应用错误日志文件
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  1. 应用错误日志 (/app/logs/error.log)${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  if podman exec $CONTAINER_NAME test -f /app/logs/error.log 2>/dev/null; then
    ERROR_LOG=$(podman exec $CONTAINER_NAME tail -n $LINES /app/logs/error.log 2>/dev/null)
    if [ -z "$ERROR_LOG" ]; then
      echo -e "${GREEN}✓ 无错误日志（这是好事！）${NC}"
    else
      echo "$ERROR_LOG"
    fi
  else
    echo -e "${YELLOW}⚠ 日志文件不存在${NC}"
  fi
  echo ""
  
  if [ "$SHOW_ALL" = true ]; then
    # 2. 完整应用日志
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  2. 完整应用日志 (/app/logs/combined.log)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    if podman exec $CONTAINER_NAME test -f /app/logs/combined.log 2>/dev/null; then
      podman exec $CONTAINER_NAME tail -n $LINES /app/logs/combined.log 2>/dev/null || \
      echo -e "${YELLOW}⚠ 无法读取日志文件${NC}"
    else
      echo -e "${YELLOW}⚠ 日志文件不存在${NC}"
    fi
    echo ""
  fi
  
  # 3. 容器日志中的错误
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $([ "$SHOW_ALL" = true ] && echo "3" || echo "2"). 容器日志中的错误${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  CONTAINER_ERRORS=$(podman logs --tail $LINES $CONTAINER_NAME 2>&1 | grep -i "error\|exception\|failed" || true)
  if [ -z "$CONTAINER_ERRORS" ]; then
    echo -e "${GREEN}✓ 容器日志中无错误${NC}"
  else
    echo "$CONTAINER_ERRORS"
  fi
  echo ""
  
  # 4. Nginx 错误日志
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $([ "$SHOW_ALL" = true ] && echo "4" || echo "3"). Nginx 错误日志${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  if podman exec $CONTAINER_NAME test -f /var/log/nginx/error.log 2>/dev/null; then
    NGINX_ERRORS=$(podman exec $CONTAINER_NAME tail -n 50 /var/log/nginx/error.log 2>/dev/null | grep -v "^\s*$" || true)
    if [ -z "$NGINX_ERRORS" ]; then
      echo -e "${GREEN}✓ Nginx 无错误${NC}"
    else
      echo "$NGINX_ERRORS"
    fi
  else
    echo -e "${YELLOW}⚠ Nginx 错误日志不存在${NC}"
  fi
  echo ""
  
  # 总结
  echo -e "${YELLOW}========================================${NC}"
  echo -e "${YELLOW}  日志查看完成${NC}"
  echo -e "${YELLOW}========================================${NC}"
  echo ""
  echo -e "${CYAN}提示:${NC}"
  echo -e "  • 使用 ${GREEN}-f${NC} 参数实时监控日志"
  echo -e "  • 使用 ${GREEN}-n 200${NC} 查看更多行"
  echo -e "  • 使用 ${GREEN}-a${NC} 查看所有日志（包括 info/warn）"
  echo ""
fi
