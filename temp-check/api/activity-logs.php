<?php
require_once __DIR__ . '/../init.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Метод не поддерживается'], 405);
}

try {
    $db = getDB();
    
    $action = $_GET['action'] ?? null;
    $entityType = $_GET['entity_type'] ?? null;
    $user = $_GET['user'] ?? null;
    $dateFrom = $_GET['date_from'] ?? null;
    $dateTo = $_GET['date_to'] ?? null;
    $limit = $_GET['limit'] ?? 1000;
    
    $query = "
        SELECT 
            al.id,
            al.user_id,
            al.action,
            al.entity_type,
            al.entity_id,
            al.details,
            al.created_at,
            u.name as user_name
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
    ";
    $params = [];
    
    if ($action) {
        $query .= " AND al.action = ?";
        $params[] = $action;
    }
    
    if ($entityType) {
        $query .= " AND al.entity_type = ?";
        $params[] = $entityType;
    }
    
    if ($user) {
        $query .= " AND u.name = ?";
        $params[] = $user;
    }
    
    if ($dateFrom) {
        $query .= " AND date(al.created_at) >= ?";
        $params[] = $dateFrom;
    }
    
    if ($dateTo) {
        $query .= " AND date(al.created_at) <= ?";
        $params[] = $dateTo;
    }
    
    $query .= " ORDER BY al.created_at DESC LIMIT ?";
    $params[] = (int)$limit;
    
    try {
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $logs = $stmt->fetchAll();
    } catch (Exception $e) {
        // Если таблица activity_logs еще не создана
        error_log("Таблица activity_logs еще не создана: " . $e->getMessage());
        $logs = [];
    }
    
    jsonResponse($logs);
    
} catch (Exception $e) {
    error_log("Ошибка получения логов: " . $e->getMessage());
    jsonResponse(['error' => 'Ошибка получения логов'], 500);
}
?> 