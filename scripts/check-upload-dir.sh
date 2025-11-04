#!/bin/bash

# 测试脚本：验证文件上传路径配置
# 用于部署前检查 UPLOAD_DIR 配置是否正确

echo "================================"
echo "文件上传路径配置检查"
echo "================================"
echo ""

# 1. 检查环境变量
echo "1. 检查环境变量配置"
if [ -f ".env" ]; then
    UPLOAD_DIR=$(grep "^UPLOAD_DIR=" .env | cut -d '=' -f2)
    echo "   ✓ .env 文件存在"
    echo "   UPLOAD_DIR=$UPLOAD_DIR"
else
    echo "   ✗ .env 文件不存在"
    exit 1
fi

# 2. 检查目录是否存在
echo ""
echo "2. 检查上传目录"
if [ -z "$UPLOAD_DIR" ]; then
    echo "   ✗ UPLOAD_DIR 未配置"
    exit 1
fi

# 处理相对路径
if [[ "$UPLOAD_DIR" == ./* ]]; then
    FULL_PATH="$(pwd)/${UPLOAD_DIR#./}"
else
    FULL_PATH="$UPLOAD_DIR"
fi

echo "   完整路径: $FULL_PATH"

if [ -d "$FULL_PATH" ]; then
    echo "   ✓ 目录存在"
else
    echo "   ✗ 目录不存在"
    echo "   创建目录..."
    mkdir -p "$FULL_PATH"/{images,documents,videos,audios,others,thumbnails}
    echo "   ✓ 目录已创建"
fi

# 3. 检查权限
echo ""
echo "3. 检查目录权限"
if [ -w "$FULL_PATH" ]; then
    echo "   ✓ 具有写入权限"
else
    echo "   ✗ 没有写入权限"
    echo "   请执行: sudo chown -R \$USER:$USER $FULL_PATH"
    exit 1
fi

# 4. 检查磁盘空间
echo ""
echo "4. 检查磁盘空间"
AVAILABLE=$(df -h "$FULL_PATH" | awk 'NR==2 {print $4}')
echo "   可用空间: $AVAILABLE"

# 5. 测试写入
echo ""
echo "5. 测试文件写入"
TEST_FILE="$FULL_PATH/test-write-$(date +%s).txt"
if echo "test" > "$TEST_FILE" 2>/dev/null; then
    echo "   ✓ 写入测试成功"
    rm -f "$TEST_FILE"
else
    echo "   ✗ 写入测试失败"
    exit 1
fi

# 6. 检查子目录
echo ""
echo "6. 检查子目录结构"
for subdir in images documents videos audios others thumbnails; do
    if [ -d "$FULL_PATH/$subdir" ]; then
        echo "   ✓ $subdir/"
    else
        echo "   ✗ $subdir/ (正在创建...)"
        mkdir -p "$FULL_PATH/$subdir"
    fi
done

# 7. 显示目录信息
echo ""
echo "7. 目录信息"
echo "   所有者: $(ls -ld "$FULL_PATH" | awk '{print $3":"$4}')"
echo "   权限: $(ls -ld "$FULL_PATH" | awk '{print $1}')"
echo "   大小: $(du -sh "$FULL_PATH" | awk '{print $1}')"

echo ""
echo "================================"
echo "✓ 所有检查通过！"
echo "================================"
echo ""
echo "下一步："
echo "1. 确保 .env 中配置了正确的 UPLOAD_DIR"
echo "2. 启动应用: pnpm run dev:server"
echo "3. 查看日志确认上传目录配置"
echo ""
