<?php

// Базовая инициализация приложения
define('APP_ROOT', __DIR__);
define('APP_VERSION', '1.0.0');

// Включаем отображение ошибок только для разработки
// В продакшене эти строки нужно закомментировать или удалить
if (getenv('APP_ENV') !== 'production') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}

// Подключаем конфигурацию базы данных
require_once __DIR__ . '/config/database.php';

// Подключаем систему авторизации
require_once __DIR__ . '/config/auth.php';

// Устанавливаем CORS заголовки только если это API запрос
$isApiRequest = strpos($_SERVER['REQUEST_URI'], '/api/') !== false;

if ($isApiRequest && !headers_sent()) {
    // Устанавливаем заголовки для API
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
}

// Обработка CORS preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Функции-помощники
function success($data = null, $message = null) {
    $response = ['success' => true];
    if ($message) $response['message'] = $message;
    if ($data !== null) {
        if (is_array($data) && isset($data['success'])) {
            // Если данные уже содержат success, объединяем
            $response = array_merge($response, $data);
        } else {
            $response['data'] = $data;
        }
    }
    
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

function error($message, $code = 400) {
    http_response_code($code);
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function getInput() {
    // Сначала пробуем получить JSON из body
    $input = file_get_contents('php://input');
    
    if (!empty($input)) {
        $data = json_decode($input, true);
        
        // Если JSON корректный, возвращаем его
        if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
            return $data;
        }
    }
    
    // Если JSON не удалось декодировать, возвращаем POST данные
    return $_POST;
}

// Общие функции
function formatDate($date) {
    if (!$date) return '';
    return date('d.m.Y H:i', strtotime($date));
}

function formatMoney($amount) {
    return number_format((float)$amount, 2, '.', ' ') . ' ₽';
}

function sanitizeInput($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
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

function generateId($length = 8) {
    return substr(md5(uniqid(rand(), true)), 0, $length);
}

function redirect($url, $permanent = false) {
    $code = $permanent ? 301 : 302;
    http_response_code($code);
    header("Location: $url");
    exit;
}

function isPost() {
    return $_SERVER['REQUEST_METHOD'] === 'POST';
}

function isGet() {
    return $_SERVER['REQUEST_METHOD'] === 'GET';
}

function isDelete() {
    return $_SERVER['REQUEST_METHOD'] === 'DELETE';
}

function isPut() {
    return $_SERVER['REQUEST_METHOD'] === 'PUT';
}

// Устанавливаем часовой пояс
date_default_timezone_set('Europe/Moscow'); 