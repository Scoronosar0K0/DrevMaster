<?php
/**
 * Конфигурация базы данных SQLite для DrevMaster
 */

class Database {
    private $pdo;
    private static $instance = null;
    
    // Путь к базе данных
    private $dbPath;
    
    private function __construct() {
        // Определяем путь к базе данных
        $this->dbPath = __DIR__ . '/../data/drevmaster.db';
        
        // Создаем директорию если не существует
        $dataDir = dirname($this->dbPath);
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0755, true);
        }
        
        try {
            $this->pdo = new PDO('sqlite:' . $this->dbPath);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
            // Включаем поддержку внешних ключей
            $this->pdo->exec('PRAGMA foreign_keys = ON');
            
            // Инициализируем таблицы если база пустая
            $this->initializeTables();
            
        } catch(PDOException $e) {
            die("Ошибка подключения к базе данных: " . $e->getMessage());
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->pdo;
    }
    
    private function initializeTables() {
        // Проверяем есть ли таблицы
        $tableCheck = $this->pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
        if ($tableCheck->rowCount() == 0) {
            // Создаем таблицы
            $this->createTables();
            $this->insertDefaultData();
        }
    }
    
    private function createTables() {
        $sql = file_get_contents(__DIR__ . '/../sql/schema.sql');
        $this->pdo->exec($sql);
    }
    
    private function insertDefaultData() {
        // Создаем администратора по умолчанию
        $hashedPassword = password_hash('admin', PASSWORD_DEFAULT);
        
        $stmt = $this->pdo->prepare("
            INSERT INTO users (username, password, role, name, email, is_active, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ");
        
        $stmt->execute([
            'admin',
            $hashedPassword,
            'admin',
            'Администратор',
            'admin@drevmaster.com',
            1
        ]);
        
        echo "База данных инициализирована. Пользователь admin создан с паролем: admin\n";
    }
}

// Функция для получения подключения к БД
function getDB() {
    return Database::getInstance()->getConnection();
}
?> 