<?php
require_once __DIR__ . '/../../init.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Метод не поддерживается'], 405);
}

try {
    $db = getDB();
    
    // Инициализируем значения по умолчанию
    $totalOrders = 0;
    $pendingOrders = 0;
    $totalBalance = 0;
    $suppliersCount = 0;
    
    try {
        // Общее количество заказов
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM orders");
        $stmt->execute();
        $result = $stmt->fetch();
        $totalOrders = $result['count'];
    } catch (Exception $e) {
        error_log("Ошибка получения общего количества заказов: " . $e->getMessage());
    }
    
    try {
        // Количество заказов не в статусе "продан"
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM orders WHERE status != ?");
        $stmt->execute(['sold']);
        $result = $stmt->fetch();
        $pendingOrders = $result['count'];
    } catch (Exception $e) {
        error_log("Ошибка получения ожидающих заказов: " . $e->getMessage());
    }
    
    try {
        // Общий баланс (сумма непогашенных займов)
        $stmt = $db->prepare("SELECT SUM(amount) as total FROM loans WHERE is_paid = 0");
        $stmt->execute();
        $result = $stmt->fetch();
        $totalBalance = $result['total'] ?? 0;
    } catch (Exception $e) {
        error_log("Ошибка получения баланса: " . $e->getMessage());
    }
    
    try {
        // Количество поставщиков
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM suppliers");
        $stmt->execute();
        $result = $stmt->fetch();
        $suppliersCount = $result['count'];
    } catch (Exception $e) {
        error_log("Ошибка получения количества поставщиков: " . $e->getMessage());
    }
    
    jsonResponse([
        'totalOrders' => (int)$totalOrders,
        'pendingOrders' => (int)$pendingOrders,
        'totalBalance' => (float)$totalBalance,
        'suppliersCount' => (int)$suppliersCount
    ]);
    
} catch (Exception $e) {
    error_log("Ошибка получения статистики: " . $e->getMessage());
    jsonResponse(['error' => 'Ошибка получения статистики'], 500);
}
?> 