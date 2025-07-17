<?php
require_once __DIR__ . '/../init.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Получение списка партнеров
    try {
        $db = getDB();
        
        $stmt = $db->prepare("
            SELECT 
                p.id,
                u.name,
                u.username,
                u.email,
                u.phone,
                p.description,
                p.created_at
            FROM partners p
            JOIN users u ON p.user_id = u.id
            WHERE u.is_active = 1
            ORDER BY p.created_at DESC
        ");
        $stmt->execute();
        $partners = $stmt->fetchAll();
        
        jsonResponse($partners);
        
    } catch (Exception $e) {
        error_log("Ошибка получения партнеров: " . $e->getMessage());
        jsonResponse(['error' => 'Ошибка получения партнеров'], 500);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Создание нового партнера
    requireRole('admin');
    
    try {
        $data = getInput();
        
        $required = ['name', 'username', 'password'];
        $missing = validateRequired($data, $required);
        
        if (!empty($missing)) {
            jsonResponse(['error' => 'Поля обязательны: ' . implode(', ', $missing)], 400);
        }
        
        $db = getDB();
        
        // Проверяем уникальность логина
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$data['username']]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Пользователь с таким логином уже существует'], 400);
        }
        
        $db->beginTransaction();
        
        try {
            // Создаем пользователя
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
            
            $stmt = $db->prepare("
                INSERT INTO users (username, password, role, name, email, phone, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            ");
            
            $stmt->execute([
                $data['username'],
                $hashedPassword,
                'partner',
                $data['name'],
                $data['email'] ?? '',
                $data['phone'] ?? ''
            ]);
            
            $userId = $db->lastInsertId();
            
            // Создаем партнера
            $stmt = $db->prepare("
                INSERT INTO partners (user_id, description, created_at) 
                VALUES (?, ?, datetime('now'))
            ");
            
            $stmt->execute([
                $userId,
                $data['description'] ?? "Партнер: {$data['name']}"
            ]);
            
            $partnerId = $db->lastInsertId();
            
            $db->commit();
            
            // Логируем создание партнера
            $user = getCurrentUser();
            logActivity(
                $user['id'], 
                'partner_created', 
                "Создан партнер {$data['name']}"
            );
            
            jsonResponse(['success' => true, 'id' => $partnerId, 'user_id' => $userId]);
            
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
        
    } catch (Exception $e) {
        error_log("Ошибка создания партнера: " . $e->getMessage());
        jsonResponse(['error' => 'Ошибка создания партнера'], 500);
    }
    
} else {
    jsonResponse(['error' => 'Метод не поддерживается'], 405);
}
