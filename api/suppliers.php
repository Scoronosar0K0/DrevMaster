<?php
require_once __DIR__ . '/../init.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Получение списка поставщиков
    try {
        $db = getDB();
        
        $stmt = $db->prepare("
            SELECT * FROM suppliers 
            ORDER BY created_at DESC
        ");
        $stmt->execute();
        $suppliers = $stmt->fetchAll();
        
        jsonResponse($suppliers);
        
    } catch (Exception $e) {
        error_log("Ошибка получения поставщиков: " . $e->getMessage());
        jsonResponse(['error' => 'Ошибка получения поставщиков'], 500);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Создание нового поставщика
    requireApiAuth();
    
    try {
        $data = getInput();
        
        $required = ['name'];
        $missing = validateRequired($data, $required);
        
        if (!empty($missing)) {
            jsonResponse(['error' => 'Поля обязательны: ' . implode(', ', $missing)], 400);
        }
        
        $db = getDB();
        
        // Создаем поставщика
        $stmt = $db->prepare("
            INSERT INTO suppliers (name, contact_person, phone, email, address, created_at) 
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        ");
        
        $stmt->execute([
            $data['name'],
            $data['contact_person'] ?? '',
            $data['phone'] ?? '',
            $data['email'] ?? '',
            $data['address'] ?? ''
        ]);
        
        $supplierId = $db->lastInsertId();
        
        // Логируем создание поставщика
        $user = getCurrentUser();
        logActivity(
            $user['id'], 
            'supplier_created', 
            "Создан поставщик {$data['name']}"
        );
        
        jsonResponse(['success' => true, 'id' => $supplierId]);
        
    } catch (Exception $e) {
        error_log("Ошибка создания поставщика: " . $e->getMessage());
        jsonResponse(['error' => 'Ошибка создания поставщика'], 500);
    }
    
} else {
    jsonResponse(['error' => 'Метод не поддерживается'], 405);
}
