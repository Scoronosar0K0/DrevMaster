<?php
$pageTitle = 'Страница не найдена - DrevMaster';
?>

<?php include 'includes/header.php'; ?>

<div class="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
    <div class="text-center">
        <div class="mb-8">
            <div class="inline-flex items-center justify-center w-32 h-32 bg-white/10 backdrop-blur-lg rounded-full mb-6">
                <span class="text-6xl">🌳</span>
            </div>
            
            <h1 class="text-8xl font-bold text-white mb-4">404</h1>
            <h2 class="text-2xl font-semibold text-blue-100 mb-4">Страница не найдена</h2>
            <p class="text-blue-200 mb-8 max-w-md mx-auto">
                К сожалению, запрашиваемая страница не существует или была перемещена.
            </p>
        </div>
        
        <div class="space-y-4">
            <a href="/index.php" class="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl">
                🏠 На главную
            </a>
            
            <p class="text-blue-300 text-sm">или</p>
            
            <button onclick="history.back()" class="inline-block bg-white/10 backdrop-blur-lg hover:bg-white/20 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200">
                ← Назад
            </button>
        </div>
        
        <div class="mt-12 text-blue-300 text-sm">
            <p>Если вы считаете, что это ошибка, обратитесь к администратору</p>
        </div>
    </div>
</div>

<?php include 'includes/footer.php'; ?> 