<?php
require_once __DIR__ . '/../../init.php';

// Требуем права администратора
requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = getInput();
        $userId = $_GET['id'] ?? null;
        
        if (!$userId) {
            error('ID пользователя не указан', 400);
            exit;
        }
        
        if (!isset($input['is_active'])) {
            error('Статус активности не указан', 400);
            exit;
        }
        
        $isActive = $input['is_active'] ? 1 : 0;
        
        $db = getDB();
        
        $stmt = $db->prepare("UPDATE users SET is_active = ? WHERE id = ?");
        $result = $stmt->execute([$isActive, $userId]);
        
        if ($stmt->rowCount() === 0) {
            error('Пользователь не найден', 404);
            exit;
        }
        
        // Логируем изменение статуса
        $currentUser = getCurrentUser();
        $status = $isActive ? 'активирован' : 'деактивирован';
        logActivity(
            $currentUser['id'],
            'user_status_changed',
            "Пользователь ID: {$userId} {$status}"
        );
        
        success(null, 'Статус пользователя изменен успешно');
        
    } catch (Exception $e) {
        error_log("Ошибка изменения статуса пользователя: " . $e->getMessage());
        error('Ошибка изменения статуса пользователя', 500);
    }
    
} else {
    error('Метод не поддерживается', 405);
} 