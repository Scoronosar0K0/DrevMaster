<?php
require_once __DIR__ . '/../init.php';

// Требуем права администратора
requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Получение списка пользователей
    try {
        $db = getDB();
        
        $stmt = $db->prepare("
            SELECT id, username, role, name, email, phone, is_active, created_at
            FROM users 
            ORDER BY created_at DESC
        ");
        $stmt->execute();
        $users = $stmt->fetchAll();
        
        success($users);
        
    } catch (Exception $e) {
        error_log("Ошибка получения пользователей: " . $e->getMessage());
        error('Ошибка получения пользователей', 500);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Создание нового пользователя
    try {
        $input = getInput();
        
        // Валидация обязательных полей
        $required = ['username', 'password', 'role', 'name'];
        validateRequired($input, $required);
        
        $db = getDB();
        
        // Проверяем, что пользователь с таким логином не существует
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$input['username']]);
        if ($stmt->fetch()) {
            error('Пользователь с таким логином уже существует', 400);
            exit;
        }
        
        // Хешируем пароль
        $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
        
        // Создаем пользователя
        $stmt = $db->prepare("
            INSERT INTO users (username, password, role, name, email, phone, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
        ");
        
        $stmt->execute([
            $input['username'],
            $hashedPassword,
            $input['role'],
            $input['name'],
            $input['email'] ?? null,
            $input['phone'] ?? null
        ]);
        
        $userId = $db->lastInsertId();
        
        // Если создаем партнера, также создаем запись в таблице partners
        if ($input['role'] === 'partner') {
            $stmt = $db->prepare("
                INSERT INTO partners (user_id, name, description, created_at)
                VALUES (?, ?, ?, datetime('now'))
            ");
            $stmt->execute([
                $userId,
                $input['name'],
                "Партнер: " . $input['name']
            ]);
        }
        
        // Логируем создание пользователя
        $currentUser = getCurrentUser();
        logActivity(
            $currentUser['id'],
            'user_created',
            "Создан пользователь {$input['username']} с ролью {$input['role']}"
        );
        
        success(['id' => $userId], 'Пользователь создан успешно');
        
    } catch (Exception $e) {
        error_log("Ошибка создания пользователя: " . $e->getMessage());
        error('Ошибка создания пользователя', 500);
    }
    
} else {
    error('Метод не поддерживается', 405);
} 