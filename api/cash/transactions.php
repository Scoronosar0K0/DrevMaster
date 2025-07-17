<?php
require_once __DIR__ . '/../../init.php';

// Требуем авторизацию
$session = requireApiAuth();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Получение истории транзакций
    try {
        $db = getDB();
        
        $stmt = $db->prepare("
            SELECT 
                cf.*,
                u.name as user_name
            FROM cash_flow cf
            LEFT JOIN users u ON cf.user_id = u.id
            ORDER BY cf.created_at DESC
            LIMIT 100
        ");
        $stmt->execute();
        $transactions = $stmt->fetchAll();
        
        success($transactions);
        
    } catch (Exception $e) {
        error_log("Ошибка получения транзакций: " . $e->getMessage());
        error('Ошибка получения транзакций', 500);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Добавление новой транзакции
    try {
        $input = getInput();
        
        // Валидация обязательных полей
        $required = ['description', 'amount'];
        validateRequired($input, $required);
        
        $db = getDB();
        
        // Получаем текущий баланс
        $currentBalance = $db->query("SELECT COALESCE(SUM(amount), 0) as balance FROM cash_flow")->fetch()['balance'];
        $newBalance = $currentBalance + $input['amount'];
        
        // Добавляем транзакцию
        $stmt = $db->prepare("
            INSERT INTO cash_flow (user_id, amount, description, category, balance_after, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        ");
        
        $stmt->execute([
            $session['user_id'],
            $input['amount'],
            $input['description'],
            $input['category'] ?? null,
            $newBalance
        ]);
        
        // Логируем операцию
        $currentUser = getCurrentUser();
        $type = $input['amount'] > 0 ? 'доход' : 'расход';
        logActivity(
            $currentUser['id'],
            'cash_transaction',
            "Добавлен {$type}: {$input['description']} на сумму " . formatCurrency($input['amount'])
        );
        
        success(['balance_after' => $newBalance], 'Транзакция добавлена успешно');
        
    } catch (Exception $e) {
        error_log("Ошибка добавления транзакции: " . $e->getMessage());
        error('Ошибка добавления транзакции', 500);
    }
    
} else {
    error('Метод не поддерживается', 405);
} 