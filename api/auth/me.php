<?php
require_once __DIR__ . '/../../init.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_SESSION['user_id'])) {
        error('Пользователь не авторизован', 401);
    }
    
    $user = getCurrentUser();
    
    if ($user) {
        success([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role']
            ]
        ]);
    } else {
        error('Пользователь не найден', 404);
    }
} else {
    error('Метод не поддерживается', 405);
} 