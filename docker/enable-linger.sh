#!/bin/bash
# 启用用户会话持久化（Linger）
# 这样即使用户登出，用户服务也会继续运行

set -e

USERNAME="${1:-$(whoami)}"

echo "=========================================="
echo "  Enable User Session Linger"
echo "  User: $USERNAME"
echo "=========================================="

# 启用 linger（需要 root 权限）
if [ "$EUID" -eq 0 ]; then
    loginctl enable-linger "$USERNAME"
    echo "✓ Linger enabled for user: $USERNAME"
else
    echo "Running with sudo..."
    sudo loginctl enable-linger "$USERNAME"
    echo "✓ Linger enabled for user: $USERNAME"
fi

# 验证
echo ""
echo "Linger status:"
loginctl show-user "$USERNAME" | grep Linger

echo ""
echo "=========================================="
echo "  What is Linger?"
echo "=========================================="
echo "Linger 允许用户服务在用户登出后继续运行。"
echo "这样你的 Podman 容器就不会因为会话超时而停止。"
echo ""
echo "注意：这是临时方案，推荐使用系统服务（systemd service）"
echo "=========================================="
