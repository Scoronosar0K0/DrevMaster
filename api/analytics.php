<?php
require_once __DIR__ . '/../init.php';

// Требуем авторизацию
$session = requireApiAuth();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $db = getDB();
        $type = $_GET['type'] ?? 'overview';
        
        switch ($type) {
            case 'overview':
                // Общая статистика
                $data = getOverviewStats($db);
                break;
                
            case 'orders':
                // Статистика заказов
                $data = getOrdersAnalytics($db);
                break;
                
            case 'financial':
                // Финансовая статистика
                $data = getFinancialAnalytics($db);
                break;
                
            case 'partners':
                // Статистика по партнерам
                $data = getPartnersAnalytics($db);
                break;
                
            case 'timeline':
                // Динамика по времени
                $period = $_GET['period'] ?? '30';
                $data = getTimelineAnalytics($db, $period);
                break;
                
            default:
                error('Неизвестный тип аналитики', 400);
                exit;
        }
        
        success($data);
        
    } catch (Exception $e) {
        error_log("Ошибка получения аналитики: " . $e->getMessage());
        error('Ошибка получения аналитики', 500);
    }
    
} else {
    error('Метод не поддерживается', 405);
}

function getOverviewStats($db) {
    // Общее количество заказов
    $totalOrders = $db->query("SELECT COUNT(*) as count FROM orders")->fetch()['count'];
    
    // Активные заказы
    $activeOrders = $db->query("SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'in_progress')")->fetch()['count'];
    
    // Общая прибыль
    $totalProfit = $db->query("SELECT COALESCE(SUM(profit), 0) as profit FROM orders WHERE profit > 0")->fetch()['profit'];
    
    // Количество партнеров
    $totalPartners = $db->query("SELECT COUNT(*) as count FROM partners")->fetch()['count'];
    
    // Количество поставщиков
    $totalSuppliers = $db->query("SELECT COUNT(*) as count FROM suppliers")->fetch()['count'];
    
    // Баланс кассы
    $cashBalance = $db->query("SELECT COALESCE(SUM(amount), 0) as balance FROM cash_flow")->fetch()['balance'];
    
    // Займы (непогашенные)
    $activeLoans = $db->query("SELECT COALESCE(SUM(amount - repaid_amount), 0) as loans FROM loans WHERE amount > repaid_amount")->fetch()['loans'];
    
    return [
        'orders' => [
            'total' => (int)$totalOrders,
            'active' => (int)$activeOrders,
            'completed' => (int)($totalOrders - $activeOrders)
        ],
        'financial' => [
            'profit' => (float)$totalProfit,
            'cash_balance' => (float)$cashBalance,
            'active_loans' => (float)$activeLoans
        ],
        'entities' => [
            'partners' => (int)$totalPartners,
            'suppliers' => (int)$totalSuppliers
        ]
    ];
}

function getOrdersAnalytics($db) {
    // Статистика по статусам
    $statusStats = $db->query("
        SELECT status, COUNT(*) as count, COALESCE(SUM(total_cost), 0) as total_cost
        FROM orders 
        GROUP BY status
    ")->fetchAll();
    
    // Топ поставщиков
    $topSuppliers = $db->query("
        SELECT s.name, COUNT(o.id) as orders_count, COALESCE(SUM(o.total_cost), 0) as total_cost
        FROM suppliers s
        LEFT JOIN orders o ON s.id = o.supplier_id
        GROUP BY s.id, s.name
        ORDER BY orders_count DESC
        LIMIT 5
    ")->fetchAll();
    
    // Средний размер заказа
    $avgOrderSize = $db->query("
        SELECT COALESCE(AVG(total_cost), 0) as avg_cost
        FROM orders WHERE total_cost > 0
    ")->fetch()['avg_cost'];
    
    return [
        'status_distribution' => $statusStats,
        'top_suppliers' => $topSuppliers,
        'average_order_size' => (float)$avgOrderSize
    ];
}

function getFinancialAnalytics($db) {
    // Доходы и расходы
    $income = $db->query("
        SELECT COALESCE(SUM(amount), 0) as amount 
        FROM cash_flow WHERE amount > 0
    ")->fetch()['amount'];
    
    $expenses = $db->query("
        SELECT COALESCE(ABS(SUM(amount)), 0) as amount 
        FROM cash_flow WHERE amount < 0
    ")->fetch()['amount'];
    
    // Прибыль по заказам
    $orderProfit = $db->query("
        SELECT COALESCE(SUM(profit), 0) as profit 
        FROM orders WHERE profit > 0
    ")->fetch()['profit'];
    
    // Займы статистика
    $loansStats = $db->query("
        SELECT 
            COUNT(*) as total_loans,
            COALESCE(SUM(amount), 0) as total_borrowed,
            COALESCE(SUM(repaid_amount), 0) as total_repaid,
            COALESCE(SUM(amount - repaid_amount), 0) as outstanding
        FROM loans
    ")->fetch();
    
    // Топ расходов
    $topExpenses = $db->query("
        SELECT description, ABS(amount) as amount, created_at
        FROM cash_flow 
        WHERE amount < 0
        ORDER BY ABS(amount) DESC
        LIMIT 10
    ")->fetchAll();
    
    return [
        'cash_flow' => [
            'income' => (float)$income,
            'expenses' => (float)$expenses,
            'net' => (float)($income - $expenses)
        ],
        'order_profit' => (float)$orderProfit,
        'loans' => [
            'total_count' => (int)$loansStats['total_loans'],
            'total_borrowed' => (float)$loansStats['total_borrowed'],
            'total_repaid' => (float)$loansStats['total_repaid'],
            'outstanding' => (float)$loansStats['outstanding']
        ],
        'top_expenses' => $topExpenses
    ];
}

function getPartnersAnalytics($db) {
    // Статистика по партнерам
    $partnersStats = $db->query("
        SELECT 
            p.name,
            COUNT(l.id) as loans_count,
            COALESCE(SUM(l.amount), 0) as total_borrowed,
            COALESCE(SUM(l.repaid_amount), 0) as total_repaid,
            COALESCE(SUM(l.amount - l.repaid_amount), 0) as outstanding
        FROM partners p
        LEFT JOIN loans l ON p.id = l.partner_id
        GROUP BY p.id, p.name
        ORDER BY total_borrowed DESC
    ")->fetchAll();
    
    return [
        'partners_stats' => $partnersStats
    ];
}

function getTimelineAnalytics($db, $days) {
    $days = (int)$days;
    
    // Динамика заказов
    $ordersTimeline = $db->query("
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as orders_count,
            COALESCE(SUM(total_cost), 0) as total_cost
        FROM orders 
        WHERE created_at >= datetime('now', '-{$days} days')
        GROUP BY DATE(created_at)
        ORDER BY date
    ")->fetchAll();
    
    // Динамика кассы
    $cashTimeline = $db->query("
        SELECT 
            DATE(created_at) as date,
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
            ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)) as expenses
        FROM cash_flow 
        WHERE created_at >= datetime('now', '-{$days} days')
        GROUP BY DATE(created_at)
        ORDER BY date
    ")->fetchAll();
    
    return [
        'period_days' => $days,
        'orders_timeline' => $ordersTimeline,
        'cash_timeline' => $cashTimeline
    ];
} 