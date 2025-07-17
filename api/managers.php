<?php
require_once __DIR__ . '/../init.php';

// Требуем права администратора
requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Получение списка менеджеров или конкретного менеджера
    try {
        $db = getDB();
        $managerId = $_GET['id'] ?? null;
        
        if ($managerId) {
            // Получение конкретного менеджера
            $stmt = $db->prepare("
                SELECT 
                    u.id,
                    u.username,
                    u.name,
                    u.email,
                    u.phone,
                    u.is_active,
                    u.created_at
                FROM users u
                WHERE u.id = ? AND u.role = 'manager'
            ");
            $stmt->execute([$managerId]);
            $manager = $stmt->fetch();
            
            if (!$manager) {
                error('Менеджер не найден', 404);
                exit;
            }
            
            success($manager);
        } else {
            // Получение списка всех менеджеров
            $stmt = $db->prepare("
                SELECT 
                    u.id,
                    u.username,
                    u.name,
                    u.email,
                    u.phone,
                    u.is_active,
                    u.created_at
                FROM users u
                WHERE u.role = 'manager'
                ORDER BY u.created_at DESC
            ");
            $stmt->execute();
            $managers = $stmt->fetchAll();
            
            success($managers);
        }
        
    } catch (Exception $e) {
        error_log("Ошибка получения менеджеров: " . $e->getMessage());
        error('Ошибка получения менеджеров', 500);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Создание нового менеджера
    try {
        $input = getInput();
        
        // Валидация обязательных полей
        $required = ['username', 'password', 'name'];
        validateRequired($input, $required);
        
        $db = getDB();
        
        // Проверяем уникальность username
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$input['username']]);
        if ($stmt->fetch()) {
            error('Пользователь с таким username уже существует', 400);
            exit;
        }
        
        // Хешируем пароль
        $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
        
        // Создаем менеджера
        $stmt = $db->prepare("
            INSERT INTO users (username, password, role, name, email, phone, is_active, created_at)
            VALUES (?, ?, 'manager', ?, ?, ?, 1, datetime('now'))
        ");
        
        $stmt->execute([
            $input['username'],
            $hashedPassword,
            $input['name'],
            $input['email'] ?? null,
            $input['phone'] ?? null
        ]);
        
        $managerId = $db->lastInsertId();
        
        // Логируем создание менеджера
        $currentUser = getCurrentUser();
        logActivity(
            $currentUser['id'],
            'manager_created',
            "Создан менеджер: {$input['name']} ({$input['username']})"
        );
        
        success(['id' => $managerId], 'Менеджер создан успешно');
        
    } catch (Exception $e) {
        error_log("Ошибка создания менеджера: " . $e->getMessage());
        error('Ошибка создания менеджера', 500);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Обновление менеджера
    try {
        $input = getInput();
        $managerId = $_GET['id'] ?? null;
        
        if (!$managerId) {
            error('ID менеджера не указан', 400);
            exit;
        }
        
        // Валидация обязательных полей
        $required = ['username', 'name'];
        validateRequired($input, $required);
        
        $db = getDB();
        
        // Проверяем что менеджер существует
        $stmt = $db->prepare("SELECT id FROM users WHERE id = ? AND role = 'manager'");
        $stmt->execute([$managerId]);
        if (!$stmt->fetch()) {
            error('Менеджер не найден', 404);
            exit;
        }
        
        // Проверяем уникальность username (исключая текущего пользователя)
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
        $stmt->execute([$input['username'], $managerId]);
        if ($stmt->fetch()) {
            error('Пользователь с таким username уже существует', 400);
            exit;
        }
        
        // Обновляем менеджера
        if (!empty($input['password'])) {
            // Обновляем с новым паролем
            $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
            $stmt = $db->prepare("
                UPDATE users 
                SET username = ?, password = ?, name = ?, email = ?, phone = ?, is_active = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $input['username'],
                $hashedPassword,
                $input['name'],
                $input['email'] ?? null,
                $input['phone'] ?? null,
                isset($input['is_active']) ? ($input['is_active'] ? 1 : 0) : 1,
                $managerId
            ]);
        } else {
            // Обновляем без изменения пароля
            $stmt = $db->prepare("
                UPDATE users 
                SET username = ?, name = ?, email = ?, phone = ?, is_active = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $input['username'],
                $input['name'],
                $input['email'] ?? null,
                $input['phone'] ?? null,
                isset($input['is_active']) ? ($input['is_active'] ? 1 : 0) : 1,
                $managerId
            ]);
        }
        
        // Логируем обновление
        $currentUser = getCurrentUser();
        logActivity(
            $currentUser['id'],
            'manager_updated',
            "Обновлен менеджер: {$input['name']} ({$input['username']})"
        );
        
        success(null, 'Менеджер обновлен успешно');
        
    } catch (Exception $e) {
        error_log("Ошибка обновления менеджера: " . $e->getMessage());
        error('Ошибка обновления менеджера', 500);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Удаление менеджера
    try {
        $managerId = $_GET['id'] ?? null;
        
        if (!$managerId) {
            error('ID менеджера не указан', 400);
            exit;
        }
        
        $db = getDB();
        
        // Получаем данные менеджера для логирования
        $stmt = $db->prepare("SELECT name, username FROM users WHERE id = ? AND role = 'manager'");
        $stmt->execute([$managerId]);
        $manager = $stmt->fetch();
        
        if (!$manager) {
            error('Менеджер не найден', 404);
            exit;
        }
        
        // Удаляем менеджера
        $stmt = $db->prepare("DELETE FROM users WHERE id = ? AND role = 'manager'");
        $stmt->execute([$managerId]);
        
        // Логируем удаление
        $currentUser = getCurrentUser();
        logActivity(
            $currentUser['id'],
            'manager_deleted',
            "Удален менеджер: {$manager['name']} ({$manager['username']})"
        );
        
        success(null, 'Менеджер удален успешно');
        
    } catch (Exception $e) {
        error_log("Ошибка удаления менеджера: " . $e->getMessage());
        error('Ошибка удаления менеджера', 500);
    }
    
} else {
    error('Метод не поддерживается', 405);
} 