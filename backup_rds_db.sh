#!/bin/bash

################################################################################
# 阿里云RDS数据库备份脚本
# 用途: 从生产环境RDS导出数据库备份
# 使用: ./backup_rds_db.sh
#
# 注意: 此脚本需要读取 .env.production.rds 文件获取数据库连接信息
#       该配置文件仅存在于生产服务器上，不会提交到Git仓库
################################################################################

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置文件路径
ENV_FILE=".env.production.rds"

################################################################################
# 加载配置文件
################################################################################

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}错误: 配置文件不存在: $ENV_FILE${NC}"
    echo ""
    echo "请确保在生产服务器上运行此脚本，并且配置文件存在。"
    echo "配置文件应包含以下变量:"
    echo "  RDS_HOST=xxx"
    echo "  RDS_PORT=5432"
    echo "  RDS_USER=xxx"
    echo "  RDS_DATABASE=xxx"
    echo "  RDS_PASSWORD=xxx"
    exit 1
fi

echo -e "${BLUE}正在加载配置文件: $ENV_FILE${NC}"

# 读取配置文件
set -a
source "$ENV_FILE"
set +a

# 验证必需的配置项
if [ -z "$RDS_HOST" ] || [ -z "$RDS_USER" ] || [ -z "$RDS_DATABASE" ] || [ -z "$RDS_PASSWORD" ]; then
    echo -e "${RED}错误: 配置文件缺少必需的配置项${NC}"
    echo ""
    echo "请检查 $ENV_FILE 文件是否包含以下变量:"
    echo "  RDS_HOST"
    echo "  RDS_PORT"
    echo "  RDS_USER"
    echo "  RDS_DATABASE"
    echo "  RDS_PASSWORD"
    exit 1
fi

# 设置默认端口
RDS_PORT=${RDS_PORT:-5432}

# 备份目录
BACKUP_DIR="./backuprds"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="milicard_prod_${DATE}.sql"

################################################################################
# 主程序
################################################################################

echo "=================================="
echo "  阿里云RDS数据库备份工具"
echo "=================================="
echo ""
echo "RDS地址: $RDS_HOST"
echo "数据库: $RDS_DATABASE"
echo "备份时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 创建备份目录
if [ ! -d "$BACKUP_DIR" ]; then
    echo "创建备份目录: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}错误: Docker未运行，请先启动Docker${NC}"
    exit 1
fi

# 检查PostgreSQL镜像
echo "检查PostgreSQL 18镜像..."
if ! docker images | grep -q "postgres.*18"; then
    echo "正在拉取PostgreSQL 18镜像（首次运行需要下载）..."
    docker pull postgres:18
fi

echo ""
echo -e "${YELLOW}开始导出数据库...${NC}"
echo "这可能需要几分钟，请耐心等待"
echo ""

# 导出数据库
docker run --rm \
    -e PGPASSWORD="$RDS_PASSWORD" \
    -e PGCLIENTENCODING=UTF8 \
    postgres:18 \
    pg_dump -h $RDS_HOST \
            -p $RDS_PORT \
            -U $RDS_USER \
            -d $RDS_DATABASE \
            --no-owner \
            --no-privileges \
            --encoding=UTF8 \
    > "$BACKUP_DIR/$BACKUP_FILE" 2>&1

# 检查导出是否成功
if [ $? -eq 0 ] && [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo -e "${GREEN}✓ 数据库导出成功${NC}"
    echo ""
    
    # 转换编码并添加客户端编码设置
    echo "正在优化 SQL 文件编码..."
    TEMP_FILE="$BACKUP_DIR/${BACKUP_FILE}.tmp"
    
    # 在文件开头添加编码设置，并确保 UTF-8 编码
    {
        echo "-- Encoding: UTF-8"
        echo "SET client_encoding = 'UTF8';"
        echo ""
        cat "$BACKUP_DIR/$BACKUP_FILE"
    } > "$TEMP_FILE"
    
    # 使用 iconv 确保文件是 UTF-8 编码（如果可用）
    if command -v iconv &> /dev/null; then
        iconv -f UTF-8 -t UTF-8 -c "$TEMP_FILE" > "$BACKUP_DIR/$BACKUP_FILE"
        rm "$TEMP_FILE"
        echo -e "${GREEN}✓ 编码优化完成${NC}"
    else
        mv "$TEMP_FILE" "$BACKUP_DIR/$BACKUP_FILE"
        echo -e "${YELLOW}⚠ iconv 不可用，跳过编码转换${NC}"
    fi
    
    FILE_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo ""
    echo "备份文件: $BACKUP_FILE"
    echo "文件大小: $FILE_SIZE"
    echo "完整路径: $(pwd)/$BACKUP_DIR/$BACKUP_FILE"
    echo ""
    
    # 询问是否压缩
    read -p "是否压缩备份文件? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "正在压缩..."
        gzip "$BACKUP_DIR/$BACKUP_FILE"
        COMPRESSED_FILE="${BACKUP_FILE}.gz"
        COMPRESSED_SIZE=$(du -h "$BACKUP_DIR/$COMPRESSED_FILE" | cut -f1)
        echo -e "${GREEN}✓ 压缩完成${NC}"
        echo "压缩后大小: $COMPRESSED_SIZE"
        echo "压缩文件: $COMPRESSED_FILE"
        FINAL_FILE="$COMPRESSED_FILE"
    else
        FINAL_FILE="$BACKUP_FILE"
    fi
    
    echo ""
    echo "=================================="
    echo -e "${GREEN}备份完成！${NC}"
    echo "=================================="
    echo ""
    echo "备份文件位置: $BACKUP_DIR/$FINAL_FILE"
    echo ""
    echo "下载到本地命令:"
    echo "scp root@服务器IP:$(pwd)/$BACKUP_DIR/$FINAL_FILE ./"
    echo ""
    
    # 显示最近的备份文件
    echo "最近的备份文件:"
    ls -lht "$BACKUP_DIR" | head -6
    
else
    echo -e "${RED}✗ 数据库导出失败${NC}"
    echo ""
    echo "可能的原因:"
    echo "1. 网络连接问题"
    echo "2. RDS白名单未配置当前IP"
    echo "3. 用户名或密码错误"
    echo "4. 数据库不存在"
    echo ""
    echo "请检查错误信息并重试"
    exit 1
fi
