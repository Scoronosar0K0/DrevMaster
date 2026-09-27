# Ручное обновление сервера

Обычно достаточно `./update-server.sh` (или `./deploy.sh` при первой установке).
Ниже — те же шаги вручную и диагностика.

> Не храните пароли, ключи и токены в репозитории: он публичный.
> Для входа на сервер используйте SSH-ключ (`ssh-copy-id root@<IP>`),
> а вход по паролю отключите (`PasswordAuthentication no` в
> `/etc/ssh/sshd_config`, затем `systemctl restart ssh`).

## Где что лежит

| Что | Путь |
| --- | --- |
| Код приложения | `/var/www/drevmaster/drevmaster` |
| База данных | `/var/lib/drevmaster/drevmaster.db` (путь задан в `DATABASE_PATH`) |
| Настройки (`JWT_SECRET`, `DATABASE_PATH`) | `/var/lib/drevmaster/.env.local` (`deploy.sh` копирует его в папку кода) |
| Резервные копии базы | `/var/lib/drevmaster/backups` |
| Процесс | `pm2`, имя `drevmaster` |

## 1. Подключение к серверу

```bash
ssh root@194.87.201.205
```

## 2. Обновление приложения

```bash
cd /var/www/drevmaster/drevmaster

# Резервная копия базы перед обновлением
mkdir -p /var/lib/drevmaster/backups
cp /var/lib/drevmaster/drevmaster.db \
   /var/lib/drevmaster/backups/drevmaster-$(date +%Y%m%d-%H%M%S).db

git pull origin main
cp /var/lib/drevmaster/.env.local .env.local   # настройки берем из постоянной копии
npm install
npm run build          # миграции базы выполняются автоматически
pm2 restart drevmaster
```

Удалять базу при обновлении не нужно: схема обновляется сама при запуске,
данные сохраняются.

## 3. Проверка настроек

```bash
cat /var/lib/drevmaster/.env.local
# Должно содержать:
# JWT_SECRET=<случайная строка из openssl rand -hex 32>
# DATABASE_PATH=/var/lib/drevmaster/drevmaster.db
# NODE_ENV=production
# PORT=3000

pm2 status
pm2 logs drevmaster --lines 50
```

## 4. Проверка Nginx

```bash
systemctl status nginx
nginx -t
systemctl restart nginx
```

## 5. Проверка портов

```bash
netstat -tlnp | grep :80
netstat -tlnp | grep :3000
```

## 6. Восстановление базы из резервной копии

```bash
pm2 stop drevmaster
ls -lt /var/lib/drevmaster/backups | head
cp /var/lib/drevmaster/backups/<файл>.db /var/lib/drevmaster/drevmaster.db
pm2 start drevmaster
```

## 🔍 Диагностика входа

Если после входа снова открывается страница логина:

1. Очистите cookies и localStorage сайта (DevTools → Application) и войдите снова.
2. Проверьте, что `JWT_SECRET` задан в `.env.local` и не менялся между сборкой
   и запуском (после смены секрета все пользователи должны войти заново).
3. Сайт работает по HTTP — cookie ставится без флага Secure автоматически.
   Если перед сервером стоит HTTPS-прокси, он должен передавать
   `X-Forwarded-Proto`.
4. Деактивированный или удаленный пользователь выходит из системы при
   следующем запросе — это ожидаемо.

## 📞 Если ничего не помогает

1. Логи приложения: `pm2 logs drevmaster`
2. Логи Nginx: `tail -f /var/log/nginx/error.log`
3. Перезапуск: `pm2 restart drevmaster`

---

**Приложение должно быть доступно по адресу:** http://194.87.201.205
