<?php
require_once __DIR__ . '/../../init.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Метод не поддерживается'], 405);
}

if (!Auth::check()) {
    jsonResponse(['error' => 'Токен авторизации не найден'], 401);
}

$user = Auth::user();

if (!$user) {
    jsonResponse(['error' => 'Пользователь не найден'], 401);
}

jsonResponse([
    'success' => true,
    'user' => [
        'id' => $user['id'],
        'username' => $user['username'],
        'name' => $user['name'],
        'role' => $user['role'],
        'partnerId' => $user['partner_id']
    ]
]);
?> 