<?php
require_once __DIR__ . '/../../init.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['error' => 'Метод не поддерживается'], 405);
}

try {
    $db = getDB();
    
    // Получаем общую сумму всех непогашенных займов от партнеров
    $stmt = $db->prepare("SELECT SUM(amount - paid_amount) as total FROM loans WHERE is_paid = 0");
    $stmt->execute();
    $loansResult = $stmt->fetch();
    $totalLoans = $loansResult['total'] ?? 0;
    
    // Получаем общую сумму всех расходов
    $stmt = $db->prepare("SELECT SUM(amount) as total FROM expenses");
    $stmt->execute();
    $expensesResult = $stmt->fetch();
    $totalExpenses = $expensesResult['total'] ?? 0;
    
    // Доступный баланс = займы - расходы
    $balance = $totalLoans - $totalExpenses;
    
    jsonResponse(['balance' => (float)$balance]);
    
} catch (Exception $e) {
    error_log("Ошибка получения баланса: " . $e->getMessage());
    jsonResponse(['error' => 'Ошибка получения баланса'], 500);
}
?> 