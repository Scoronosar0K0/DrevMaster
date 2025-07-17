<?php
/**
 * Конфигурация авторизации для DrevMaster
 */

// Настройки сессий
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 0); // Для локального развития
session_start();

// JWT секретный ключ
define('JWT_SECRET', 'drevmaster-secret-key-2024');

class Auth {
    
    /**
     * Проверка авторизации пользователя
     */
    public static function check() {
        return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
    }
    
    /**
     * Получить данные текущего пользователя
     */
    public static function user() {
        if (!self::check()) {
            return null;
        }
        
        $db = getDB();
        $stmt = $db->prepare("
            SELECT u.*, p.id as partner_id 
            FROM users u 
            LEFT JOIN partners p ON u.id = p.user_id 
            WHERE u.id = ?
        ");
        $stmt->execute([$_SESSION['user_id']]);
        return $stmt->fetch();
    }
    
    /**
     * Вход пользователя
     */
    public static function login($username, $password) {
        $db = getDB();
        
        $stmt = $db->prepare("
            SELECT u.*, p.id as partner_id 
            FROM users u 
            LEFT JOIN partners p ON u.id = p.user_id 
            WHERE u.username = ? AND u.is_active = 1
        ");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['name'] = $user['name'];
            $_SESSION['partner_id'] = $user['partner_id'];
            
            // Логируем вход
            self::logActivity($user['id'], 'вход', 'auth', "Пользователь {$user['username']} вошел в систему");
            
            return [
                'success' => true,
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'name' => $user['name'],
                    'role' => $user['role'],
                    'partner_id' => $user['partner_id']
                ]
            ];
        }
        
        return ['success' => false, 'message' => 'Неверный логин или пароль'];
    }
    
    /**
     * Выход пользователя
     */
    public static function logout() {
        $userId = $_SESSION['user_id'] ?? null;
        $username = $_SESSION['username'] ?? null;
        
        if ($userId) {
            self::logActivity($userId, 'выход', 'auth', "Пользователь {$username} вышел из системы");
        }
        
        session_destroy();
        return ['success' => true];
    }
    
    /**
     * Проверка роли пользователя
     */
    public static function hasRole($role) {
        return isset($_SESSION['role']) && $_SESSION['role'] === $role;
    }
    
    /**
     * Проверка доступа к администратору
     */
    public static function isAdmin() {
        return self::hasRole('admin');
    }
    
    /**
     * Проверка доступа менеджера
     */
    public static function isManager() {
        return self::hasRole('manager');
    }
    
    /**
     * Проверка доступа партнера
     */
    public static function isPartner() {
        return self::hasRole('partner');
    }
    
    /**
     * Логирование активности
     */
    public static function logActivity($userId, $action, $entityType = null, $details = null, $entityId = null) {
        try {
            $db = getDB();
            $stmt = $db->prepare("
                INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, created_at) 
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            ");
            $stmt->execute([$userId, $action, $entityType, $entityId, $details]);
        } catch (Exception $e) {
            // Игнорируем ошибки логирования
            error_log("Ошибка логирования: " . $e->getMessage());
        }
    }
    
    /**
     * Требовать авторизацию
     */
    public static function requireAuth() {
        if (!self::check()) {
            header('Location: /login.php');
            exit;
        }
    }
    
    /**
     * Требовать роль администратора
     */
    public static function requireAdmin() {
        self::requireAuth();
        if (!self::isAdmin()) {
            http_response_code(403);
            die('Доступ запрещен');
        }
    }
    
    /**
     * Требовать роль менеджера
     */
    public static function requireManager() {
        self::requireAuth();
        if (!self::isManager()) {
            http_response_code(403);
            die('Доступ запрещен');
        }
    }
}

/**
 * Функция для безопасного JSON ответа
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Функция для проверки CSRF токена (если нужно)
 */
function generateCSRFToken() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function validateCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}
?> 