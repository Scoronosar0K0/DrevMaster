<?php
require_once __DIR__ . '/../../init.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = getPostData();
    
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        jsonResponse(['error' => 'Логин и пароль обязательны'], 400);
    }
    
    $result = Auth::login($username, $password);
    
    if ($result['success']) {
        jsonResponse($result);
    } else {
        jsonResponse(['error' => $result['message']], 401);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Выход из системы
    $result = Auth::logout();
    jsonResponse($result);
    
} else {
    jsonResponse(['error' => 'Метод не поддерживается'], 405);
}
?> 