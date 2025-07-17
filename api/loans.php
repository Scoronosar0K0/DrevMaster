<?php
require_once __DIR__ . '/../init.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Получение списка займов
    try {
        $db = getDB();
        
        $stmt = $db->prepare("
            SELECT 
                l.id,
                l.partner_id,
                l.amount,
                l.order_id,
                l.is_paid,
                l.paid_amount,
                l.description,
                l.created_at,
                u.name as partner_name,
                o.order_number
            FROM loans l
            JOIN partners p ON l.partner_id = p.id
            JOIN users u ON p.user_id = u.id
            LEFT JOIN orders o ON l.order_id = o.id
            ORDER BY l.created_at DESC
        ");
        $stmt->execute();
        $loans = $stmt->fetchAll();
        
        jsonResponse($loans);
        
    } catch (Exception $e) {
        error_log("Ошибка получения займов: " . $e->getMessage());
        jsonResponse(['error' => 'Ошибка получения займов'], 500);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Создание нового займа
    requireApiAuth();
    
    try {
        $data = getPostData();
        
        $required = ['partner_id', 'amount'];
        $missing = validateRequired($data, $required);
        
        if (!empty($missing)) {
            jsonResponse(['error' => 'Поля обязательны: ' . implode(', ', $missing)], 400);
        }
        
        $db = getDB();
        
        // Проверяем существование партнера
        $stmt = $db->prepare("SELECT p.id, u.name FROM partners p JOIN users u ON p.user_id = u.id WHERE p.id = ?");
        $stmt->execute([$data['partner_id']]);
        $partner = $stmt->fetch();
        
        if (!$partner) {
            jsonResponse(['error' => 'Партнер не найден'], 404);
        }
        
        // Создаем займ
        $stmt = $db->prepare("
            INSERT INTO loans (partner_id, amount, order_id, description, created_at) 
            VALUES (?, ?, ?, ?, datetime('now'))
        ");
        
        $stmt->execute([
            $data['partner_id'],
            $data['amount'],
            $data['order_id'] ?? null,
            $data['description'] ?? ''
        ]);
        
        $loanId = $db->lastInsertId();
        
        // Логируем создание займа
        $user = getCurrentUser();
        logActivity(
            $user['id'], 
            'loan_created', 
            "Займ от {$partner['name']} на сумму {$data['amount']}"
        );
        
        jsonResponse(['success' => true, 'id' => $loanId]);
        
    } catch (Exception $e) {
        error_log("Ошибка создания займа: " . $e->getMessage());
        jsonResponse(['error' => 'Ошибка создания займа'], 500);
    }
    
} else {
    jsonResponse(['error' => 'Метод не поддерживается'], 405);
}
