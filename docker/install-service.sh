#!/bin/bash
# 安装 MiliCard 系统服务脚本

set -e

ENVIRONMENT="${1:-staging}"
SERVICE_NAME="milicard-${ENVIRONMENT}"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "=========================================="
echo "  Installing MiliCard System Service"
echo "  Environment: $ENVIRONMENT"
echo "=========================================="

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then 
    echo "ERROR: This script must be run as root (use sudo)"
    exit 1
fi

# 检查环境变量
if [ -z "$DB_PASSWORD" ]; then
    echo "ERROR: DB_PASSWORD environment variable is required"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "ERROR: JWT_SECRET environment variable is required"
    exit 1
fi

# 确定端口
if [ "$ENVIRONMENT" = "staging" ]; then
    PORT=8075
    CONTAINER_NAME="milicard-staging"
elif [ "$ENVIRONMENT" = "production" ]; then
    PORT=8175
    CONTAINER_NAME="milicard-prod"
else
    echo "ERROR: Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

# 创建环境变量文件
ENV_FILE="/etc/milicard/${ENVIRONMENT}.env"
mkdir -p /etc/milicard
cat > "$ENV_FILE" <<EOF
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
EOF
chmod 600 "$ENV_FILE"

echo "✓ Created environment file: $ENV_FILE"

# 创建 systemd 服务文件
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=MiliCard Application Container (${ENVIRONMENT})
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
EnvironmentFile=${ENV_FILE}

# 停止并删除旧容器
ExecStartPre=-/usr/bin/podman stop ${CONTAINER_NAME}
ExecStartPre=-/usr/bin/podman rm ${CONTAINER_NAME}

# 启动容器
ExecStart=/usr/bin/podman run \\
  --name ${CONTAINER_NAME} \\
  -p ${PORT}:80 \\
  -e DB_PASSWORD=\${DB_PASSWORD} \\
  -e JWT_SECRET=\${JWT_SECRET} \\
  -v milicard_${ENVIRONMENT}_data:/var/lib/postgresql/data \\
  milicard:latest

# 停止容器
ExecStop=/usr/bin/podman stop -t 30 ${CONTAINER_NAME}
ExecStopPost=/usr/bin/podman rm -f ${CONTAINER_NAME}

# 自动重启配置
Restart=always
RestartSec=10s
StartLimitInterval=300s
StartLimitBurst=5

# 资源限制
MemoryLimit=2G
CPUQuota=200%

# 日志配置
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF

echo "✓ Created systemd service: $SERVICE_FILE"

# 重载 systemd
systemctl daemon-reload
echo "✓ Reloaded systemd"

# 启用服务（开机自启）
systemctl enable ${SERVICE_NAME}
echo "✓ Enabled service: ${SERVICE_NAME}"

# 启动服务
systemctl start ${SERVICE_NAME}
echo "✓ Started service: ${SERVICE_NAME}"

# 显示状态
echo ""
echo "=========================================="
echo "  Service Status"
echo "=========================================="
systemctl status ${SERVICE_NAME} --no-pager

echo ""
echo "=========================================="
echo "  Useful Commands"
echo "=========================================="
echo "  View logs:    journalctl -u ${SERVICE_NAME} -f"
echo "  Stop service: systemctl stop ${SERVICE_NAME}"
echo "  Start service: systemctl start ${SERVICE_NAME}"
echo "  Restart:      systemctl restart ${SERVICE_NAME}"
echo "  Status:       systemctl status ${SERVICE_NAME}"
echo "  Disable:      systemctl disable ${SERVICE_NAME}"
echo "=========================================="
