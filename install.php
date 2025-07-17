<?php
/**
 * Скрипт инициализации базы данных DrevMaster
 * Запустите этот файл один раз для создания базы данных
 */

// Включаем отображение ошибок для диагностики
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>🌳 DrevMaster - Инициализация базы данных</h1>";
echo "<p>Этот скрипт создаст базу данных и начальные данные.</p>";

try {
    // Подключаем конфигурацию
    require_once __DIR__ . '/config/database.php';
    
    echo "<div style='background: #d4edda; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
    echo "✅ <strong>Успешно!</strong> База данных инициализирована.<br>";
    echo "📁 Путь к базе данных: <code>" . __DIR__ . "/data/drevmaster.db</code><br>";
    echo "👤 Создан пользователь администратор:<br>";
    echo "&nbsp;&nbsp;&nbsp;&nbsp;Логин: <strong>admin</strong><br>";
    echo "&nbsp;&nbsp;&nbsp;&nbsp;Пароль: <strong>admin</strong><br>";
    echo "</div>";
    
    echo "<div style='background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
    echo "⚠️ <strong>Важно:</strong> Обязательно смените пароль администратора после первого входа!";
    echo "</div>";
    
    echo "<div style='background: #d1ecf1; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
    echo "📊 <strong>Структура базы данных:</strong><br>";
    
    $db = getDB();
    $tables = $db->query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")->fetchAll();
    
    echo "<ul>";
    foreach ($tables as $table) {
        $count = $db->query("SELECT COUNT(*) as count FROM " . $table['name'])->fetch();
        echo "<li><strong>{$table['name']}</strong> - {$count['count']} записей</li>";
    }
    echo "</ul>";
    echo "</div>";
    
    echo "<div style='margin: 20px 0;'>";
    echo "<a href='/login.php' style='background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>🚀 Перейти к входу</a>";
    echo "</div>";
    
    echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; font-size: 12px;'>";
    echo "<strong>ℹ️ Информация о системе:</strong><br>";
    echo "PHP версия: " . PHP_VERSION . "<br>";
    echo "SQLite версия: " . SQLite3::version()['versionString'] . "<br>";
    echo "Путь к проекту: " . __DIR__ . "<br>";
    echo "Время инициализации: " . date('Y-m-d H:i:s') . "<br>";
    echo "</div>";
    
    // Удаляем этот файл после успешной инициализации (в продакшене)
    // unlink(__FILE__);
    
} catch (Exception $e) {
    echo "<div style='background: #f8d7da; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
    echo "❌ <strong>Ошибка инициализации:</strong><br>";
    echo htmlspecialchars($e->getMessage());
    echo "</div>";
    
    echo "<div style='background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
    echo "<strong>Возможные причины ошибки:</strong><br>";
    echo "1. Нет прав на создание файлов в папке проекта<br>";
    echo "2. SQLite не поддерживается на сервере<br>";
    echo "3. Недостаточно места на диске<br>";
    echo "4. Неправильные права доступа к папкам<br>";
    echo "</div>";
    
    echo "<div style='background: #d1ecf1; padding: 10px; border-radius: 5px; margin: 10px 0;'>";
    echo "<strong>Рекомендации:</strong><br>";
    echo "1. Установите права 755 на папку проекта<br>";
    echo "2. Создайте папку 'data' с правами 777<br>";
    echo "3. Обратитесь в поддержку хостинга Timeweb<br>";
    echo "</div>";
}

initializeDatabase();

echo "<hr>";
echo "<p style='text-align: center; color: #666; font-size: 12px;'>";
echo "DrevMaster v1.0 - Система управления деревообрабатывающим бизнесом<br>";
echo "Создано для хостинга Timeweb";
echo "</p>";
