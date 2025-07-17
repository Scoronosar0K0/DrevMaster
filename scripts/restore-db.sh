#!/bin/bash

# Скрипт для восстановления базы данных DrevMaster из резервной копии

BACKUP_DIR="./backups"
DB_FILE="drevmaster.db"

echo "🔄 Восстановление базы данных из резервной копии..."

# Проверяем, есть ли резервные копии
if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
    echo "❌ Резервные копии не найдены в директории $BACKUP_DIR"
    exit 1
fi

# Показываем доступные резервные копии
echo "📋 Доступные резервные копии:"
ls -lh "$BACKUP_DIR"/drevmaster_backup_*.db 2>/dev/null | nl

# Если передан аргумент с номером копии
if [ $# -eq 1 ]; then
    BACKUP_NUMBER=$1
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/drevmaster_backup_*.db 2>/dev/null | sed -n "${BACKUP_NUMBER}p")
    
    if [ -z "$BACKUP_FILE" ]; then
        echo "❌ Резервная копия с номером $BACKUP_NUMBER не найдена!"
        exit 1
    fi
else
    # Выбираем самую новую резервную копию
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/drevmaster_backup_*.db 2>/dev/null | head -n 1)
    
    if [ -z "$BACKUP_FILE" ]; then
        echo "❌ Резервные копии не найдены!"
        exit 1
    fi
fi

echo "📁 Выбрана резервная копия: $BACKUP_FILE"

# Создаем резервную копию текущей базы данных перед восстановлением
if [ -f "$DB_FILE" ]; then
    echo "💾 Создание резервной копии текущей базы данных..."
    cp "$DB_FILE" "${DB_FILE}.before_restore_$(date +%Y%m%d_%H%M%S)"
fi

# Восстанавливаем базу данных
echo "🔄 Восстановление базы данных..."
cp "$BACKUP_FILE" "$DB_FILE"

if [ $? -eq 0 ]; then
    echo "✅ База данных успешно восстановлена!"
    echo "📊 Размер восстановленной базы: $(du -h "$DB_FILE" | cut -f1)"
    
    # Проверяем права доступа
    chmod 644 "$DB_FILE"
    echo "🔐 Права доступа к базе данных обновлены"
    
    echo "💡 Для применения изменений перезапустите приложение:"
    echo "   docker-compose restart"
    echo "   или"
    echo "   pm2 restart drevmaster"
else
    echo "❌ Ошибка при восстановлении базы данных!"
    exit 1
fi 