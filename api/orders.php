<?php
require_once __DIR__ . '/../init.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Получение списка заказов
    try {
        $db = getDB();
        
        $stmt = $db->prepare("
            SELECT 
                o.*,
                s.name as supplier_name,
                si.name as item_name
            FROM orders o
            JOIN suppliers s ON o.supplier_id = s.id
            JOIN supplier_items si ON o.item_id = si.id
            ORDER BY o.created_at DESC
        ");
        $stmt->execute();
        $orders = $stmt->fetchAll();
        
        jsonResponse($orders);
        
    } catch (Exception $e) {
        error_log("Ошибка получения заказов: " . $e->getMessage());
        jsonResponse(['error' => 'Ошибка получения заказов'], 500);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Создание нового заказа
    try {
        $data = getPostData();
        
        // Проверяем обязательные поля
        $required = ['order_number', 'supplier_id', 'item_id', 'date', 'value', 'total_price'];
        $missing = validateRequired($data, $required);
        
        if (!empty($missing)) {
            jsonResponse(['error' => 'Поля обязательны: ' . implode(', ', $missing)], 400);
        }
        
        $db = getDB();
        
        // Проверяем существование поставщика
        $stmt = $db->prepare("SELECT id FROM suppliers WHERE id = ?");
        $stmt->execute([$data['supplier_id']]);
        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'Поставщик не найден'], 404);
        }
        
        // Проверяем существование товара
        $stmt = $db->prepare("SELECT id FROM supplier_items WHERE id = ? AND supplier_id = ?");
        $stmt->execute([$data['item_id'], $data['supplier_id']]);
        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'Товар не найден у данного поставщика'], 404);
        }
        
        // Проверяем уникальность номера заказа
        $stmt = $db->prepare("SELECT id FROM orders WHERE order_number = ?");
        $stmt->execute([$data['order_number']]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Заказ с таким номером уже существует'], 400);
        }
        
        // Создаем заказ
        $stmt = $db->prepare("
            INSERT INTO orders (
                order_number, supplier_id, item_id, date, description, 
                measurement, value, price_per_unit, total_price, 
                containers, unloaded_value, debt_handling, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ");
        
        $containers = isset($data['containers']) ? json_encode($data['containers']) : null;
        $debtHandling = isset($data['debt_handling']) ? json_encode($data['debt_handling']) : null;
        
        $stmt->execute([
            $data['order_number'],
            $data['supplier_id'],
            $data['item_id'],
            $data['date'],
            $data['description'] ?? '',
            $data['measurement'] ?? 'm3',
            $data['value'],
            $data['price_per_unit'] ?? 0,
            $data['total_price'],
            $containers,
            $data['unloaded_value'] ?? 0,
            $debtHandling,
            $data['status'] ?? 'pending'
        ]);
        
        $orderId = $db->lastInsertId();
        
        // Логируем создание заказа
        if (isset($_SESSION['user_id'])) {
            $user = getCurrentUser();
            logActivity(
                $user['id'], 
                'заказ_создан', 
                'order', 
                "Создан заказ #{$data['order_number']}",
                $orderId
            );
        }
        
        jsonResponse(['success' => true, 'id' => $orderId]);
        
    } catch (Exception $e) {
        error_log("Ошибка создания заказа: " . $e->getMessage());
        jsonResponse(['error' => 'Ошибка создания заказа'], 500);
    }
    
} else {
    jsonResponse(['error' => 'Метод не поддерживается'], 405);
}
