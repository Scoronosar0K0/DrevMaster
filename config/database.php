<?php
/**
 * Конфигурация базы данных SQLite для DrevMaster
 */

class Database {
    private static $instance = null;
    private $conn;
    private $database_path;

    private function __construct() {
        $this->database_path = __DIR__ . '/../drevmaster.db';
        
        try {
            $this->conn = new PDO("sqlite:" . $this->database_path);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
            // Включаем поддержку внешних ключей
            $this->conn->exec("PRAGMA foreign_keys = ON");
            
            // Автоматически создаем таблицы при первом подключении
            $this->initializeTables();
            
        } catch(PDOException $e) {
            error_log("Database connection error: " . $e->getMessage());
            throw new Exception("Ошибка подключения к базе данных: " . $e->getMessage());
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }

    private function initializeTables() {
        try {
            // Проверяем, существует ли таблица users
            $result = $this->conn->query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")->fetch();
            
            if (!$result) {
                // Таблицы не существуют, создаем их
                $schema = file_get_contents(__DIR__ . '/../sql/schema.sql');
                if ($schema) {
                    // Разбиваем схему на отдельные запросы
                    $statements = array_filter(array_map('trim', explode(';', $schema)));
                    
                    foreach ($statements as $statement) {
                        if (!empty($statement)) {
                            $this->conn->exec($statement);
                        }
                    }
                    
                    // Создаем администратора по умолчанию
                    $this->createDefaultAdmin();
                }
            }
        } catch (Exception $e) {
            error_log("Table initialization error: " . $e->getMessage());
            // Не выбрасываем исключение, чтобы не прерывать работу приложения
        }
    }

    private function createDefaultAdmin() {
        try {
            // Проверяем, есть ли уже администратор
            $stmt = $this->conn->prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
            $stmt->execute();
            
            if (!$stmt->fetch()) {
                // Создаем администратора по умолчанию
                $stmt = $this->conn->prepare("
                    INSERT INTO users (username, password, email, role, is_active) 
                    VALUES (?, ?, ?, 'admin', 1)
                ");
                $stmt->execute([
                    'admin',
                    password_hash('admin', PASSWORD_DEFAULT),
                    'admin@drevmaster.local'
                ]);
            }
        } catch (Exception $e) {
            error_log("Default admin creation error: " . $e->getMessage());
        }
    }

    public function getDatabasePath() {
        return $this->database_path;
    }

    // Запрет клонирования
    private function __clone() {}
    
    // Запрет десериализации
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

// Функция для получения подключения к БД
function getDB() {
    return Database::getInstance()->getConnection();
} 