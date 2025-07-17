#!/bin/bash

# Скрипт для резервного копирования базы данных DrevMaster

BACKUP_DIR="./backups"
DB_FILE="drevmaster.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/drevmaster_backup_${TIMESTAMP}.db"

# Создаем директорию для резервных копий, если её нет
mkdir -p "$BACKUP_DIR"

echo "🔄 Создание резервной копии базы данных..."

# Проверяем, существует ли файл базы данных
if [ ! -f "$DB_FILE" ]; then
    echo "❌ Файл базы данных $DB_FILE не найден!"
    exit 1
fi

# Создаем резервную копию
cp "$DB_FILE" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Резервная копия создана: $BACKUP_FILE"
    
    # Показываем размер файла
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "📊 Размер резервной копии: $SIZE"
    
    # Удаляем старые резервные копии (оставляем последние 10)
    echo "🧹 Очистка старых резервных копий..."
    ls -t "$BACKUP_DIR"/drevmaster_backup_*.db | tail -n +11 | xargs -r rm
    
    echo "📋 Список резервных копий:"
    ls -lh "$BACKUP_DIR"/drevmaster_backup_*.db 2>/dev/null || echo "Резервных копий не найдено"
else
    echo "❌ Ошибка при создании резервной копии!"
    exit 1
fi 