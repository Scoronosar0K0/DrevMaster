<?php
/**
 * Конфигурация авторизации для DrevMaster
 */

// Инициализируем сессию только если она еще не запущена
if (session_status() === PHP_SESSION_NONE) {
    // Настройки сессии можно задавать только до её запуска
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', 0); // Установить в 1 для HTTPS
    ini_set('session.use_strict_mode', 1);
    
    session_start();
}

// JWT секретный ключ
define('JWT_SECRET', 'drevmaster-secret-key-2024');

/**
 * Проверка авторизации для HTML страниц (редирект на login.php)
 */
function requireAuth() {
    if (!isset($_SESSION['user_id'])) {
        // Если это AJAX запрос, возвращаем JSON
        if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
            http_response_code(401);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'Требуется авторизация']);
            exit;
        }
        // Иначе редирект на страницу логина
        header('Location: /login.php');
        exit;
    }
    return $_SESSION;
}

/**
 * Проверка авторизации для API (JSON ответ)
 */
function requireApiAuth() {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Требуется авторизация']);
        exit;
    }
    return $_SESSION;
}

function requireRole($requiredRole) {
    $session = requireApiAuth();
    
    if (!isset($session['role'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Роль пользователя не определена']);
        exit;
    }
    
    $userRole = $session['role'];
    
    // Проверяем права доступа
    $roleHierarchy = [
        'admin' => ['admin', 'manager', 'partner'],
        'manager' => ['manager', 'partner'],
        'partner' => ['partner']
    ];
    
    if (!isset($roleHierarchy[$userRole]) || !in_array($requiredRole, $roleHierarchy[$userRole])) {
        http_response_code(403);
        echo json_encode(['error' => 'Недостаточно прав доступа']);
        exit;
    }
    
    return $session;
}

/**
 * Проверка авторизации и роли для HTML страниц
 */
function requirePageAuth($requiredRole = null) {
    $session = requireAuth();
    
    if ($requiredRole) {
        $userRole = $session['role'] ?? null;
        
        $roleHierarchy = [
            'admin' => ['admin', 'manager', 'partner'],
            'manager' => ['manager', 'partner'],
            'partner' => ['partner']
        ];
        
        if (!$userRole || !isset($roleHierarchy[$userRole]) || !in_array($requiredRole, $roleHierarchy[$userRole])) {
            http_response_code(403);
            echo '<h1>Доступ запрещен</h1><p>У вас недостаточно прав для просмотра этой страницы.</p>';
            echo '<a href="/index.php">Вернуться на главную</a>';
            exit;
        }
    }
    
    return $session;
}

function login($username, $password) {
    try {
        $db = getDB();
        
        $stmt = $db->prepare("SELECT * FROM users WHERE username = ? AND is_active = 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password'])) {
            // Регенерируем ID сессии для безопасности
            session_regenerate_id(true);
            
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['name'] = $user['name'] ?? $user['username'];
            $_SESSION['email'] = $user['email'];
            
            // Логируем вход
            logActivity($user['id'], 'user_login', 'Пользователь вошел в систему');
            
            return [
                'success' => true,
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role' => $user['role'],
                    'name' => $user['name'] ?? $user['username'],
                    'email' => $user['email']
                ]
            ];
        } else {
            return ['success' => false, 'error' => 'Неверный логин или пароль'];
        }
        
    } catch (Exception $e) {
        error_log("Login error: " . $e->getMessage());
        return ['success' => false, 'error' => 'Ошибка сервера'];
    }
}

function logout() {
    if (isset($_SESSION['user_id'])) {
        logActivity($_SESSION['user_id'], 'user_logout', 'Пользователь вышел из системы');
    }
    
    session_destroy();
    return ['success' => true];
}

function getCurrentUser() {
    if (!isset($_SESSION['user_id'])) {
        return null;
    }
    
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT id, username, name, email, role, is_active FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        return $stmt->fetch();
    } catch (Exception $e) {
        error_log("Get current user error: " . $e->getMessage());
        return null;
    }
}

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function hasRole($role) {
    if (!isLoggedIn()) {
        return false;
    }
    
    $userRole = $_SESSION['role'] ?? null;
    
    $roleHierarchy = [
        'admin' => ['admin', 'manager', 'partner'],
        'manager' => ['manager', 'partner'],
        'partner' => ['partner']
    ];
    
    return isset($roleHierarchy[$userRole]) && in_array($role, $roleHierarchy[$userRole]);
}

function logActivity($userId, $action, $description = null, $data = null) {
    try {
        $db = getDB();
        $stmt = $db->prepare("
            INSERT INTO activity_logs (user_id, action, description, data, created_at) 
            VALUES (?, ?, ?, ?, datetime('now'))
        ");
        $stmt->execute([
            $userId,
            $action,
            $description,
            $data ? json_encode($data) : null
        ]);
    } catch (Exception $e) {
        error_log("Activity log error: " . $e->getMessage());
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