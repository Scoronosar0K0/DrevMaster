<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $pageTitle ?? 'DrevMaster - Система управления заказами'; ?></title>
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Дополнительные CSS стили -->
    <style>
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .animate-slide-in-up {
            animation: slideInUp 0.6s ease-out forwards;
        }
        
        .btn {
            @apply px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:-translate-y-1;
        }
        
        .btn-primary {
            @apply bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl;
        }
        
        .btn-secondary {
            @apply bg-gray-200 hover:bg-gray-300 text-gray-700;
        }
        
        .btn-success {
            @apply bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl;
        }
        
        .btn-danger {
            @apply bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl;
        }
        
        .card {
            @apply bg-white rounded-xl shadow-sm border border-gray-200 p-6;
        }
        
        .form-input {
            @apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200;
        }
        
        .form-select {
            @apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white;
        }
        
        .table {
            @apply w-full bg-white rounded-lg overflow-hidden shadow-sm;
        }
        
        .table th {
            @apply bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200;
        }
        
        .table td {
            @apply px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-200;
        }
        
        .table tbody tr:hover {
            @apply bg-gray-50;
        }
        
        .status-badge {
            @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
        }
        
        .loading-spinner {
            @apply animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600;
        }
    </style>
    
    <!-- Alpine.js для интерактивности -->
    <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
    
    <!-- Axios для AJAX запросов -->
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>
<body class="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50"> 