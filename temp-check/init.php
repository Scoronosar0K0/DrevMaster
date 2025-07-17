<?php
/**
 * Главный файл инициализации DrevMaster
 */

// Настройки PHP
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('default_charset', 'utf-8');

// Подключаем конфигурации
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/auth.php';

// Устанавливаем часовой пояс
date_default_timezone_set('Europe/Moscow');

// Обработка CORS для AJAX запросов
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Функции-помощники
function formatDate($date) {
    return date('d.m.Y H:i', strtotime($date));
}

function formatMoney($amount) {
    return number_format($amount, 2, '.', ' ');
}

function sanitizeInput($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

function getPostData() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?: [];
}

function validateRequired($data, $fields) {
    $missing = [];
    foreach ($fields as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            $missing[] = $field;
        }
    }
    return $missing;
}

function getActivityIcon($action) {
    $icons = [
        'создан' => '📦',
        'заказ_создан' => '📦',
        'займ_взят' => '💰',
        'займ_погашен' => '💰',
        'оплата_транспорта' => '🚛',
        'оплата_пошлины' => '🚢',
        'оплата_таможни' => '🚢',
        'продажа' => '💵',
        'обновлен' => '✏️',
        'удален' => '🗑️',
        'вход' => '🔐',
        'выход' => '🔐'
    ];
    
    return $icons[$action] ?? '📝';
}

function getStatusBadge($status) {
    $badges = [
        'pending' => ['class' => 'bg-yellow-100 text-yellow-800', 'text' => 'Ожидание'],
        'in_progress' => ['class' => 'bg-blue-100 text-blue-800', 'text' => 'В процессе'],
        'delivered' => ['class' => 'bg-green-100 text-green-800', 'text' => 'Доставлен'],
        'warehouse' => ['class' => 'bg-purple-100 text-purple-800', 'text' => 'На складе'],
        'sold' => ['class' => 'bg-gray-100 text-gray-800', 'text' => 'Продан']
    ];
    
    return $badges[$status] ?? ['class' => 'bg-gray-100 text-gray-800', 'text' => $status];
}

// Проверяем подключение к базе данных
try {
    $db = getDB();
} catch (Exception $e) {
    die("Ошибка инициализации: " . $e->getMessage());
}
?> 