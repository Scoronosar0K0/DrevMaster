<?php
require_once __DIR__ . '/../../init.php';

// Требуем права администратора
requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Обновление пользователя
    try {
        $input = getInput();
        $userId = $_GET['id'] ?? null;
        
        if (!$userId) {
            error('ID пользователя не указан', 400);
            exit;
        }
        
        // Валидация обязательных полей
        $required = ['role', 'name'];
        validateRequired($input, $required);
        
        $db = getDB();
        
        // Проверяем существование пользователя
        $stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        if (!$stmt->fetch()) {
            error('Пользователь не найден', 404);
            exit;
        }
        
        // Обновляем пароль только если он указан
        if (!empty($input['password'])) {
            $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
            $stmt = $db->prepare("
                UPDATE users 
                SET password = ?, role = ?, name = ?, email = ?, phone = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $hashedPassword,
                $input['role'],
                $input['name'],
                $input['email'] ?? null,
                $input['phone'] ?? null,
                $userId
            ]);
        } else {
            $stmt = $db->prepare("
                UPDATE users 
                SET role = ?, name = ?, email = ?, phone = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $input['role'],
                $input['name'],
                $input['email'] ?? null,
                $input['phone'] ?? null,
                $userId
            ]);
        }
        
        // Логируем обновление
        $currentUser = getCurrentUser();
        logActivity(
            $currentUser['id'],
            'user_updated',
            "Обновлен пользователь ID: {$userId}"
        );
        
        success(null, 'Пользователь обновлен успешно');
        
    } catch (Exception $e) {
        error_log("Ошибка обновления пользователя: " . $e->getMessage());
        error('Ошибка обновления пользователя', 500);
    }
    
} else {
    error('Метод не поддерживается', 405);
} 