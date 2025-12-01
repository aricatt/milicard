#!/bin/bash
# 容器健康监控脚本
# 用于诊断容器停止的原因

CONTAINER_NAME="${1:-milicard-staging}"
LOG_FILE="/tmp/milicard-monitor-$(date +%Y%m%d-%H%M%S).log"

echo "=========================================="
echo "  MiliCard Container Monitor"
echo "  Container: $CONTAINER_NAME"
echo "  Log: $LOG_FILE"
echo "=========================================="

# 检查容器是否存在
if ! podman ps -a --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "ERROR: Container $CONTAINER_NAME not found"
    exit 1
fi

# 持续监控
while true; do
    TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
    
    # 检查容器状态
    STATUS=$(podman inspect $CONTAINER_NAME --format '{{.State.Status}}' 2>/dev/null)
    
    if [ "$STATUS" != "running" ]; then
        echo "[$TIMESTAMP] ❌ Container STOPPED! Status: $STATUS" | tee -a $LOG_FILE
        
        # 获取退出码
        EXIT_CODE=$(podman inspect $CONTAINER_NAME --format '{{.State.ExitCode}}' 2>/dev/null)
        echo "[$TIMESTAMP] Exit Code: $EXIT_CODE" | tee -a $LOG_FILE
        
        # 获取最后的日志
        echo "[$TIMESTAMP] Last 50 lines of logs:" | tee -a $LOG_FILE
        podman logs --tail 50 $CONTAINER_NAME 2>&1 | tee -a $LOG_FILE
        
        # 检查 OOM
        echo "[$TIMESTAMP] Checking OOM events:" | tee -a $LOG_FILE
        dmesg | grep -i "out of memory" | tail -5 | tee -a $LOG_FILE
        
        echo "[$TIMESTAMP] Monitor stopped. Check log: $LOG_FILE"
        exit 1
    fi
    
    # 获取资源使用情况
    STATS=$(podman stats --no-stream --format "CPU: {{.CPUPerc}} | MEM: {{.MemUsage}}" $CONTAINER_NAME 2>/dev/null)
    echo "[$TIMESTAMP] ✓ Running | $STATS" | tee -a $LOG_FILE
    
    # 每分钟检查一次
    sleep 60
done
