<?php
require_once __DIR__ . '/../../init.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Получаем данные из запроса
    $input = getInput();
    
    // Отладочная информация
    error_log("Login attempt - Input: " . json_encode($input));
    
    if (empty($input['username']) || empty($input['password'])) {
        error('Логин и пароль обязательны', 400);
    }
    
    $result = login($input['username'], $input['password']);
    
    // Отладочная информация
    error_log("Login result: " . json_encode($result));
    
    if ($result['success']) {
        // Возвращаем успешный ответ
        success($result);
    } else {
        error($result['error'], 401);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $result = logout();
    success($result);
    
} else {
    error('Метод не поддерживается', 405);
} 